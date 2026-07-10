import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { ReviewSentimentCard } from "./review-sentiment-card";

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

const RUN_LIST = {
	runs: [
		{
			appId: "app-1",
			country: "us",
			createdAt: "2026-07-08T10:00:00.000Z",
			externalId: "com.lumina.habits",
			id: "run-1",
			kind: "manual",
			store: "playstore",
			summary: "69% positive",
			title: "Lumina – Habit Tracker (us)",
		},
		{
			appId: "app-1",
			country: "us",
			createdAt: "2026-07-06T10:00:00.000Z",
			externalId: "com.habitrpg.android.habitica",
			id: "run-2",
			kind: "manual",
			store: "playstore",
			summary: "Competitor",
			title: "Competitor: Habitica (us)",
		},
	],
};

const FULL_RUN = {
	run: {
		...RUN_LIST.runs[0],
		report: {
			analysis: {
				asoKeywords: [],
				categories: [],
				featuresHated: [
					{ insight: "", mentions: 9, name: "Reminder duplicates" },
				],
				featuresLoved: [
					{ insight: "", mentions: 31, name: "Streak recovery" },
					{ insight: "", mentions: 24, name: "Calm design" },
				],
				metadataTips: [],
				quickWins: [],
				sentiment: { negative: 14, neutral: 17, positive: 69 },
				summary: "",
				topIrritations: [],
			},
			heuristics: {
				buckets: [],
				byStars: {},
				negative: 11,
				negativeShare: 0.14,
				total: 80,
			},
			meta: {
				country: "us",
				developer: "Lumina Labs",
				id: "com.lumina.habits",
				store: "playstore",
				title: "Lumina – Habit Tracker",
				url: "",
			},
			reviewsCount: 80,
		},
	},
};

function mockEndpoints() {
	globalThis.fetch = mock(async (input: string | URL | Request) => {
		const url = String(input);
		const payload = url.includes("/research-runs/run-1")
			? FULL_RUN
			: RUN_LIST;
		return new Response(JSON.stringify(payload), {
			headers: { "Content-Type": "application/json" },
			status: 200,
		});
	}) as unknown as typeof fetch;
}

describe("ReviewSentimentCard", () => {
	test("shows sentiment percentages and loved/hated features from own run", async () => {
		mockEndpoints();
		render(
			<ReviewSentimentCard
				appBundleId="com.lumina.habits"
				appExternalId="gp-com.lumina.habits"
				appId="app-1"
			/>,
			{ wrapper: Wrapper },
		);

		await waitFor(() => {
			expect(screen.getByText("Positive 69%")).toBeInTheDocument();
		});
		expect(screen.getByText("Negative 14%")).toBeInTheDocument();
		expect(screen.getByText("Streak recovery")).toBeInTheDocument();
		expect(screen.getByText("Reminder duplicates")).toBeInTheDocument();
	});

	test("shows the empty state when there is no own analysis", async () => {
		globalThis.fetch = mock(
			async () =>
				new Response(JSON.stringify({ runs: [] }), {
					headers: { "Content-Type": "application/json" },
					status: 200,
				}),
		) as unknown as typeof fetch;
		render(
			<ReviewSentimentCard
				appBundleId="com.lumina.habits"
				appId="app-1"
			/>,
			{ wrapper: Wrapper },
		);

		await waitFor(() => {
			expect(screen.getByText(/No review analysis yet/)).toBeInTheDocument();
		});
	});
});
