import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";

import type { DiffSegment } from "@/lib/diff";

import { InlineDiff } from "./inline-diff";

afterEach(cleanup);

describe("InlineDiff — inline mode", () => {
	test("renders empty container when segments array is empty", () => {
		const { container } = render(<InlineDiff segments={[]} />);
		// Should render a span wrapper with no children, no crash
		const span = container.querySelector("span");
		expect(span).toBeTruthy();
		expect(span?.children.length).toBe(0);
	});

	test("renders equal segments as plain text", () => {
		const segments: DiffSegment[] = [{ type: "equal", value: "hello world" }];
		const { container } = render(<InlineDiff segments={segments} />);
		expect(container.textContent).toBe("hello world");
	});

	test("added segments have green class", () => {
		const segments: DiffSegment[] = [{ type: "added", value: "new" }];
		const { container } = render(<InlineDiff segments={segments} />);
		const addedSpan = container.querySelector("span span");
		expect(addedSpan).toBeTruthy();
		expect(addedSpan?.className).toContain("text-green-400");
		expect(addedSpan?.className).toContain("bg-green-500/20");
	});

	test("removed segments have red + line-through class", () => {
		const segments: DiffSegment[] = [{ type: "removed", value: "old" }];
		const { container } = render(<InlineDiff segments={segments} />);
		const removedSpan = container.querySelector("span span");
		expect(removedSpan).toBeTruthy();
		expect(removedSpan?.className).toContain("text-red-400");
		expect(removedSpan?.className).toContain("line-through");
	});

	test("renders mixed segments", () => {
		const segments: DiffSegment[] = [
			{ type: "equal", value: "keep " },
			{ type: "removed", value: "old" },
			{ type: "added", value: "new" },
			{ type: "equal", value: " tail" },
		];
		const { container } = render(<InlineDiff segments={segments} />);
		expect(container.textContent).toBe("keep oldnew tail");

		const spans = container.querySelectorAll("span span");
		expect(spans.length).toBe(4);
	});

	test("accepts additional className prop", () => {
		const { container } = render(
			<InlineDiff segments={[]} className="custom-class" />,
		);
		const wrapper = container.querySelector("span");
		expect(wrapper?.className).toContain("custom-class");
	});
});

describe("InlineDiff — line-by-line mode", () => {
	test("renders empty container when segments array is empty", () => {
		const { container } = render(
			<InlineDiff segments={[]} mode="line-by-line" />,
		);
		const wrapper = container.querySelector(".font-mono");
		expect(wrapper).toBeTruthy();
		expect(wrapper?.children.length).toBe(0);
	});

	test("renders equal lines with space prefix", () => {
		const segments: DiffSegment[] = [{ type: "equal", value: "line one" }];
		const { container } = render(
			<InlineDiff segments={segments} mode="line-by-line" />,
		);
		const rows = container.querySelectorAll(".font-mono > div");
		expect(rows.length).toBe(1);
		const prefix = rows[0].querySelector("span");
		expect(prefix?.textContent).toBe(" ");
		expect(container.textContent).toContain("line one");
	});

	test("renders added lines with + prefix and green class", () => {
		const segments: DiffSegment[] = [{ type: "added", value: "added line" }];
		const { container } = render(
			<InlineDiff segments={segments} mode="line-by-line" />,
		);
		const row = container.querySelector(".font-mono > div");
		expect(row).toBeTruthy();
		expect(row?.className).toContain("text-green-400");
		const prefix = row?.querySelector("span");
		expect(prefix?.textContent).toBe("+");
	});

	test("renders removed lines with - prefix and red + line-through class", () => {
		const segments: DiffSegment[] = [
			{ type: "removed", value: "removed line" },
		];
		const { container } = render(
			<InlineDiff segments={segments} mode="line-by-line" />,
		);
		const row = container.querySelector(".font-mono > div");
		expect(row).toBeTruthy();
		expect(row?.className).toContain("text-red-400");
		expect(row?.className).toContain("line-through");
		const prefix = row?.querySelector("span");
		expect(prefix?.textContent).toBe("-");
	});

	test("splits multi-line segments into rows", () => {
		const segments: DiffSegment[] = [
			{ type: "equal", value: "line one\nline two\nline three" },
		];
		const { container } = render(
			<InlineDiff segments={segments} mode="line-by-line" />,
		);
		const rows = container.querySelectorAll(".font-mono > div");
		expect(rows.length).toBe(3);
	});

	test("renders mixed added/removed/equal rows with correct prefixes", () => {
		const segments: DiffSegment[] = [
			{ type: "equal", value: "keep" },
			{ type: "removed", value: "gone" },
			{ type: "added", value: "new" },
		];
		const { container } = render(
			<InlineDiff segments={segments} mode="line-by-line" />,
		);
		const rows = container.querySelectorAll(".font-mono > div");
		expect(rows.length).toBe(3);

		const prefixes = Array.from(rows).map(
			(row) => row.querySelector("span")?.textContent,
		);
		expect(prefixes).toEqual([" ", "-", "+"]);
	});

	test("applies font-mono wrapper class in line-by-line mode", () => {
		const segments: DiffSegment[] = [{ type: "equal", value: "foo" }];
		const { container } = render(
			<InlineDiff segments={segments} mode="line-by-line" />,
		);
		const wrapper = container.querySelector(".font-mono");
		expect(wrapper).toBeTruthy();
	});
});
