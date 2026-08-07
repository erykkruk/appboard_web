import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { setAnalyticsClient } from "@/lib/analytics";

import {
	COMMUNITY_DISCORD_URL,
	COMMUNITY_REDDIT_URL,
	CommunityPopup,
} from "./community-popup";

const DISMISSED_STORAGE_KEY = "appboard.community-popup.dismissed";

beforeEach(() => {
	window.localStorage.removeItem(DISMISSED_STORAGE_KEY);
});
afterEach(cleanup);

describe("CommunityPopup", () => {
	test("renders the Discord and Reddit invite links", async () => {
		render(<CommunityPopup delayMs={0} />);
		await waitFor(() => {
			expect(screen.getByText("Discord")).toBeInTheDocument();
		});
		expect(screen.getByText("Discord").closest("a")).toHaveAttribute(
			"href",
			COMMUNITY_DISCORD_URL,
		);
		expect(screen.getByText("Reddit").closest("a")).toHaveAttribute(
			"href",
			COMMUNITY_REDDIT_URL,
		);
	});

	test("dismiss hides the popup and persists across mounts", async () => {
		render(<CommunityPopup delayMs={0} />);
		await waitFor(() => {
			expect(screen.getByText("Discord")).toBeInTheDocument();
		});
		await userEvent.click(
			screen.getByLabelText("Dismiss community invite"),
		);
		expect(screen.queryByText("Discord")).not.toBeInTheDocument();
		expect(window.localStorage.getItem(DISMISSED_STORAGE_KEY)).toBe("1");

		cleanup();
		render(<CommunityPopup delayMs={0} />);
		// Stays hidden on the next visit.
		await new Promise((r) => setTimeout(r, 10));
		expect(screen.queryByText("Discord")).not.toBeInTheDocument();
	});

	test("captures analytics for show, link clicks and dismiss", async () => {
		const captured = mock(
			(event: string, properties?: Record<string, unknown>) => ({
				event,
				properties,
			}),
		);
		setAnalyticsClient({
			capture: captured,
			identify: () => {},
			reset: () => {},
		});
		try {
			render(<CommunityPopup delayMs={0} />);
			await waitFor(() => {
				expect(screen.getByText("Discord")).toBeInTheDocument();
			});
			await userEvent.click(screen.getByText("Discord"));
			await userEvent.click(screen.getByText("Reddit"));
			await userEvent.click(
				screen.getByLabelText("Dismiss community invite"),
			);
			const events = captured.mock.calls.map((c) => c[0]);
			expect(events).toContain("community_popup_shown");
			expect(events).toContain("community_popup_dismissed");
			const clicks = captured.mock.calls.filter(
				(c) => c[0] === "community_popup_link_clicked",
			);
			expect(clicks.map((c) => c[1]?.target).sort()).toEqual([
				"discord",
				"reddit",
			]);
		} finally {
			setAnalyticsClient(null);
		}
	});
});
