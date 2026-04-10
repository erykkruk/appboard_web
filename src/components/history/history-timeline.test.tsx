import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { HistoryEntry } from "@/lib/types";

import { HistoryTimeline } from "./history-timeline";

afterEach(cleanup);

// --- Helpers ---

function buildEntry(overrides?: Partial<HistoryEntry>): HistoryEntry {
	return {
		id: "entry-1",
		appId: "app-1",
		listingId: "listing-1",
		language: "en-US",
		field: "title",
		oldValue: "Old Title",
		newValue: "New Title",
		publishedAt: "2025-03-12T14:32:00.000Z",
		createdAt: "2025-03-12T14:32:00.000Z",
		...overrides,
	};
}

// --- Tests ---

describe("HistoryTimeline — empty state", () => {
	test("renders empty state with 'No changes' text when entries is empty", () => {
		render(<HistoryTimeline entries={[]} />);
		expect(screen.getByText("No changes yet")).toBeInTheDocument();
	});

	test("renders empty state when entries is falsy via empty array", () => {
		render(<HistoryTimeline entries={[]} />);
		expect(screen.getByText("No changes yet")).toBeInTheDocument();
	});
});

describe("HistoryTimeline — loading state", () => {
	test("renders skeleton blocks when isLoading is true", () => {
		const { container } = render(
			<HistoryTimeline entries={[]} isLoading={true} />,
		);
		// Skeleton component uses data-slot="skeleton"
		const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
		// 3 groups x 3 skeletons = 9
		expect(skeletons.length).toBe(9);
	});

	test("does not render empty state when isLoading is true", () => {
		render(<HistoryTimeline entries={[]} isLoading={true} />);
		expect(screen.queryByText("No changes yet")).toBeNull();
	});
});

describe("HistoryTimeline — rendering entries", () => {
	test("renders language badge for each entry", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ id: "1", language: "en-US" }),
		];
		render(<HistoryTimeline entries={entries} />);
		expect(screen.getByText("en-US")).toBeInTheDocument();
	});

	test("renders field label via FIELD_LABELS mapping", () => {
		const entries: HistoryEntry[] = [buildEntry({ field: "title" })];
		render(<HistoryTimeline entries={entries} />);
		expect(screen.getByText("Title")).toBeInTheDocument();
	});

	test("renders raw field name when not in FIELD_LABELS", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ field: "customField" }),
		];
		render(<HistoryTimeline entries={entries} />);
		expect(screen.getByText("customField")).toBeInTheDocument();
	});

	test("renders old and new values", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ oldValue: "Old Title", newValue: "New Title" }),
		];
		render(<HistoryTimeline entries={entries} />);
		expect(screen.getByText("Old Title")).toBeInTheDocument();
		expect(screen.getByText("New Title")).toBeInTheDocument();
	});

	test("renders '(empty)' when oldValue is missing", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ oldValue: undefined, newValue: "Set" }),
		];
		render(<HistoryTimeline entries={entries} />);
		expect(screen.getByText("(empty)")).toBeInTheDocument();
	});

	test("truncates long values to preview length", () => {
		const longValue = "a".repeat(120);
		const entries: HistoryEntry[] = [
			buildEntry({ oldValue: longValue, newValue: "new" }),
		];
		const { container } = render(<HistoryTimeline entries={entries} />);
		// Should contain an ellipsis character
		expect(container.textContent).toContain("…");
	});

	test("stores full oldValue in title attribute (accessibility)", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ oldValue: "Full Old Value", newValue: "Full New Value" }),
		];
		const { container } = render(<HistoryTimeline entries={entries} />);

		const elementsWithTitle = container.querySelectorAll("[title]");
		const titles = Array.from(elementsWithTitle).map((el) =>
			el.getAttribute("title"),
		);
		expect(titles).toContain("Full Old Value");
		expect(titles).toContain("Full New Value");
	});
});

describe("HistoryTimeline — grouping", () => {
	test("groups two entries with same publishedAt minute together", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				id: "1",
				field: "title",
				publishedAt: "2025-03-12T14:32:10.000Z",
				createdAt: "2025-03-12T14:32:10.000Z",
			}),
			buildEntry({
				id: "2",
				field: "shortDesc",
				publishedAt: "2025-03-12T14:32:50.000Z",
				createdAt: "2025-03-12T14:32:50.000Z",
			}),
		];
		const { container } = render(<HistoryTimeline entries={entries} />);

		// One group header should be rendered (check change count text)
		expect(screen.getByText("2 changes")).toBeInTheDocument();

		// Only one group container should exist (rounded-md border w/ bg-card)
		const groups = container.querySelectorAll(
			"div.rounded-md.border.border-border.bg-card",
		);
		expect(groups.length).toBe(1);
	});

	test("creates separate groups for entries in different minutes", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				id: "1",
				publishedAt: "2025-03-12T14:32:00.000Z",
				createdAt: "2025-03-12T14:32:00.000Z",
			}),
			buildEntry({
				id: "2",
				publishedAt: "2025-03-12T14:35:00.000Z",
				createdAt: "2025-03-12T14:35:00.000Z",
			}),
		];
		render(<HistoryTimeline entries={entries} />);

		// Both groups have exactly 1 change
		const changeLabels = screen.getAllByText("1 change");
		expect(changeLabels.length).toBe(2);
	});

	test("uses createdAt as fallback when publishedAt is missing", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				id: "1",
				publishedAt: undefined,
				createdAt: "2025-03-12T14:32:00.000Z",
			}),
		];
		render(<HistoryTimeline entries={entries} />);
		expect(screen.getByText("1 change")).toBeInTheDocument();
	});
});

describe("HistoryTimeline — rollback", () => {
	test("renders rollback button when onRollback is provided", () => {
		const entries: HistoryEntry[] = [buildEntry({ field: "title" })];
		render(
			<HistoryTimeline entries={entries} onRollback={mock(() => {})} />,
		);
		expect(
			screen.getByRole("button", { name: "Rollback Title" }),
		).toBeInTheDocument();
	});

	test("does not render rollback button when onRollback is not provided", () => {
		const entries: HistoryEntry[] = [buildEntry({ field: "title" })];
		render(<HistoryTimeline entries={entries} />);
		expect(
			screen.queryByRole("button", { name: "Rollback Title" }),
		).toBeNull();
	});

	test("calls onRollback with entry.id when rollback button is clicked", async () => {
		const user = userEvent.setup();
		const onRollback = mock((id: string) => id);
		const entries: HistoryEntry[] = [
			buildEntry({ id: "entry-abc", field: "title" }),
		];

		render(<HistoryTimeline entries={entries} onRollback={onRollback} />);
		await user.click(screen.getByRole("button", { name: "Rollback Title" }));

		expect(onRollback).toHaveBeenCalledTimes(1);
		expect(onRollback).toHaveBeenCalledWith("entry-abc");
	});

	test("disables rollback button when rollbackPendingId matches entry.id", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ id: "entry-abc", field: "title" }),
		];

		render(
			<HistoryTimeline
				entries={entries}
				onRollback={mock(() => {})}
				rollbackPendingId="entry-abc"
			/>,
		);

		const button = screen.getByRole("button", { name: "Rollback Title" });
		expect(button).toBeDisabled();
	});

	test("shows Loader2 spinner when rollbackPendingId matches entry.id", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ id: "entry-abc", field: "title" }),
		];

		const { container } = render(
			<HistoryTimeline
				entries={entries}
				onRollback={mock(() => {})}
				rollbackPendingId="entry-abc"
			/>,
		);

		// Loader2 from lucide-react uses animate-spin class
		const spinner = container.querySelector(".animate-spin");
		expect(spinner).toBeTruthy();
	});

	test("does not show spinner when rollbackPendingId does not match", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ id: "entry-abc", field: "title" }),
		];

		const { container } = render(
			<HistoryTimeline
				entries={entries}
				onRollback={mock(() => {})}
				rollbackPendingId="entry-xyz"
			/>,
		);

		const spinner = container.querySelector(".animate-spin");
		expect(spinner).toBeNull();
	});
});
