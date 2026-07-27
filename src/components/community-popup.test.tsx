import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
});
