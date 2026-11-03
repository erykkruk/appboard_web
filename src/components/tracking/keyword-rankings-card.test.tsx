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

describe("KeywordRankingsCard first rank check", () => {
	const RUNNING = {
		appId: "app-1",
		checked: 0,
		error: null,
		failed: 0,
		failures: [],
		finishedAt: null,
		id: "run-1",
		kind: "manual",
		measured: 0,
		progress: 0,
		ranked: 0,
		startedAt: "2026-11-03T09:59:00.000Z",
		status: "running",
		total: 2,
	};

	function StableWrapper() {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { gcTime: Infinity, retry: false } },
		});
		const Stable = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		Stable.displayName = "StableQueryClientWrapper";
		return Stable;
	}

	/** Summary says a check is running; GET /tracking/check answers `status`. */
	function mockSummaryAndStatus(status: Record<string, unknown>) {
		const calls = { status: 0, summary: 0 };
		globalThis.fetch = (async (input: RequestInfo | URL) => {
			const url = typeof input === "string" ? input : input.toString();
			if (url.includes("/tracking/check")) {
				calls.status++;
				return new Response(JSON.stringify({ run: status }), {
					headers: { "Content-Type": "application/json" },
				});
			}
			calls.summary++;
			const rankCheck = calls.summary === 1 ? RUNNING : null;
			return new Response(JSON.stringify({ ...SUMMARY_PAYLOAD, rankCheck }), {
				headers: { "Content-Type": "application/json" },
			});
		}) as typeof fetch;
		return calls;
	}

	test("shows progress from the run status, not the summary snapshot", async () => {
		mockSummaryAndStatus({ ...RUNNING, checked: 1, progress: 0.5 });
		render(<KeywordRankingsCard appId="app-1" />, { wrapper: StableWrapper() });

		await waitFor(() => {
			expect(screen.getByText(/Measuring positions \(1 of 2\)/)).toBeInTheDocument();
		});
	});

	test("clears the progress line and refreshes the summary when the run ends", async () => {
		const calls = mockSummaryAndStatus({
			...RUNNING,
			checked: 2,
			finishedAt: "2026-11-03T10:00:00.000Z",
			measured: 2,
			progress: 1,
			status: "completed",
		});
		render(<KeywordRankingsCard appId="app-1" />, { wrapper: StableWrapper() });

		await waitFor(() => expect(calls.summary).toBe(2));
		await waitFor(() => {
			expect(screen.queryByText(/Measuring positions/)).not.toBeInTheDocument();
		});
		expect(screen.getByText("habit tracker")).toBeInTheDocument();
	});
});
