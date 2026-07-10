import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { KeywordRankingsCard } from "./keyword-rankings-card";

function Wrapper({ children }: { children: ReactNode }) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { gcTime: 0, retry: false } },
	});
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

let originalFetch: typeof fetch;

beforeEach(() => {
	originalFetch = globalThis.fetch;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	cleanup();
});

const SUMMARY_PAYLOAD = {
	config: { rankTrackingEnabled: true },
	positions: [
		{
			capturedAt: "2026-07-10T08:00:00.000Z",
			country: "us",
			delta: 3,
			keyword: "habit tracker",
			platform: "playstore",
			position: 4,
			previousPosition: 7,
		},
		{
			capturedAt: "2026-07-10T08:00:00.000Z",
			country: "us",
			delta: -1,
			keyword: "goal tracker",
			platform: "playstore",
			position: 31,
			previousPosition: 30,
		},
	],
	stats: {
		avgPosition: 17.5,
		bestPosition: 4,
		declinedCount: 1,
		improvedCount: 1,
		lastCheckedAt: "2026-07-10T08:00:00.000Z",
		rankedKeywords: 2,
		top10Count: 1,
		trackedKeywords: 2,
	},
};

function mockFetchWith(payload: unknown, status = 200) {
	globalThis.fetch = mock(
		async () =>
			new Response(JSON.stringify(payload), {
				headers: { "Content-Type": "application/json" },
				status,
			}),
	) as unknown as typeof fetch;
}

describe("KeywordRankingsCard", () => {
	test("renders stats and top keywords from the summary", async () => {
		mockFetchWith(SUMMARY_PAYLOAD);
		render(<KeywordRankingsCard appId="app-1" />, { wrapper: Wrapper });

		await waitFor(() => {
			expect(screen.getByText("habit tracker")).toBeInTheDocument();
		});
		expect(screen.getByText("Keyword Rankings")).toBeInTheDocument();
		expect(screen.getByText("#17.5")).toBeInTheDocument();
		expect(screen.getByText("#4")).toBeInTheDocument();
		expect(screen.getByText("goal tracker")).toBeInTheDocument();
		expect(screen.getByText("1 / 1")).toBeInTheDocument();
	});

	test("links to the Research keywords tab", async () => {
		mockFetchWith(SUMMARY_PAYLOAD);
		render(<KeywordRankingsCard appId="app-1" />, { wrapper: Wrapper });

		await waitFor(() => {
			expect(screen.getByText("View all")).toBeInTheDocument();
		});
		const link = screen.getByText("View all").closest("a");
		expect(link?.getAttribute("href")).toBe(
			"/apps/app-1/research?tab=keywords",
		);
	});

	test("shows the empty state when no keywords are tracked", async () => {
		mockFetchWith({
			config: { rankTrackingEnabled: false },
			positions: [],
			stats: {
				avgPosition: null,
				bestPosition: null,
				declinedCount: 0,
				improvedCount: 0,
				lastCheckedAt: null,
				rankedKeywords: 0,
				top10Count: 0,
				trackedKeywords: 0,
			},
		});
		render(<KeywordRankingsCard appId="app-1" />, { wrapper: Wrapper });

		await waitFor(() => {
			expect(screen.getByText(/No keywords tracked yet/)).toBeInTheDocument();
		});
	});

	test("renders nothing when the request fails (feature disabled)", async () => {
		mockFetchWith({ error: "Forbidden" }, 403);
		const { container } = render(<KeywordRankingsCard appId="app-1" />, {
			wrapper: Wrapper,
		});

		await waitFor(() => {
			expect(container.innerHTML).toBe("");
		});
	});
});
