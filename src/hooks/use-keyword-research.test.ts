import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

import {
	useKeywordHistory,
	useKeywordScores,
} from "@/hooks/use-keyword-research";
import {
	KEYWORD_HISTORY_STORAGE_KEY,
	keywordScoresToCsv,
	parseKeywordInput,
} from "@/lib/keyword-research";
import type { KeywordScore } from "@/lib/types";

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { gcTime: 0, retry: false } },
	});
	const Wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	Wrapper.displayName = "TestQueryClientWrapper";
	return Wrapper;
}

function score(keyword: string): KeywordScore {
	return {
		breakdown: {
			avgReviews: 0,
			brandName: null,
			dominantPlayers: 0,
			isBrandKeyword: false,
			marketAge: 0,
			medianReviews: 0,
			overrideReason: null,
			publisherDiversity: 0,
			ratingQuality: 0,
			ratingVolume: 0,
			rawTotal: 40,
			reviewVelocity: 0,
			titleMatchCount: 0,
			titleRelevance: 0,
		},
		classification: "moderate",
		competitors: [],
		country: "us",
		difficulty: 40,
		difficultyLabel: "moderate",
		downloads: {
			dailySearches: 100,
			positions: [{ high: 6, low: 1.5, position: 1, ttr: 30 }],
			tiers: {
				top5: { high: 3, low: 0.7 },
				top6to10: { high: 0.5, low: 0.1 },
				top11to20: { high: 0.1, low: 0 },
			},
		},
		keyword,
		opportunity: 30,
		popularity: 50,
		tiers: {
			top5: emptyTier(),
			top10: emptyTier(),
			top20: emptyTier(),
		},
	};
}

function emptyTier() {
	return {
		freshCount: 0,
		label: "moderate",
		medianReviews: 0,
		minReviews: 0,
		tierScore: 40,
		titleKeywordCount: 0,
		totalApps: 0,
		weakCount: 0,
		weakestApp: null,
	};
}

let originalFetch: typeof fetch;

beforeEach(() => {
	originalFetch = globalThis.fetch;
	localStorage.removeItem(KEYWORD_HISTORY_STORAGE_KEY);
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	localStorage.removeItem(KEYWORD_HISTORY_STORAGE_KEY);
});

describe("parseKeywordInput", () => {
	test("splits on commas and newlines, dedupes and lowercases", () => {
		expect(parseKeywordInput(" Fitness ,fitness\nYoga,, ")).toEqual([
			"fitness",
			"yoga",
		]);
	});

	test("caps the list at 20 keywords", () => {
		const raw = Array.from({ length: 30 }, (_, i) => `kw${i}`).join(",");
		expect(parseKeywordInput(raw)).toHaveLength(20);
	});
});

describe("useKeywordScores", () => {
	test("scores a small batch in one call", async () => {
		const fetchMock = mock(
			async (_input: RequestInfo | URL, init?: RequestInit) => {
				const body = JSON.parse(String(init?.body)) as { keywords: string[] };
				return new Response(
					JSON.stringify({ scores: body.keywords.map(score) }),
					{ headers: { "content-type": "application/json" } },
				);
			},
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const { result } = renderHook(() => useKeywordScores(), {
			wrapper: createWrapper(),
		});
		let scores: KeywordScore[] = [];
		await act(async () => {
			scores = await result.current.mutateAsync({
				country: "us",
				keywords: ["fitness", "yoga"],
			});
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(scores.map((s) => s.keyword)).toEqual(["fitness", "yoga"]);
	});

	test("splits more than 10 keywords into sequential batches", async () => {
		const batches: string[][] = [];
		const fetchMock = mock(
			async (_input: RequestInfo | URL, init?: RequestInit) => {
				const body = JSON.parse(String(init?.body)) as { keywords: string[] };
				batches.push(body.keywords);
				return new Response(
					JSON.stringify({ scores: body.keywords.map(score) }),
					{ headers: { "content-type": "application/json" } },
				);
			},
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const keywords = Array.from({ length: 14 }, (_, i) => `kw${i}`);
		const { result } = renderHook(() => useKeywordScores(), {
			wrapper: createWrapper(),
		});
		let scores: KeywordScore[] = [];
		await act(async () => {
			scores = await result.current.mutateAsync({ country: "us", keywords });
		});
		expect(batches.map((b) => b.length)).toEqual([10, 4]);
		expect(scores).toHaveLength(14);
		expect(scores.map((s) => s.keyword)).toEqual(keywords);
	});
});

describe("useKeywordHistory", () => {
	test("adds, lists newest first, removes and clears", async () => {
		const { result } = renderHook(() => useKeywordHistory());
		act(() => {
			result.current.add({
				country: "us",
				keywords: ["a"],
				scores: [score("a")],
			});
		});
		act(() => {
			result.current.add({
				country: "pl",
				keywords: ["b"],
				scores: [score("b")],
			});
		});
		await waitFor(() => expect(result.current.entries).toHaveLength(2));
		expect(result.current.entries[0].country).toBe("pl");

		act(() => result.current.remove(result.current.entries[0].id));
		await waitFor(() => expect(result.current.entries).toHaveLength(1));

		act(() => result.current.clear());
		await waitFor(() => expect(result.current.entries).toHaveLength(0));
	});
});

describe("keywordScoresToCsv", () => {
	test("renders a header plus one row per score and escapes commas", () => {
		const csv = keywordScoresToCsv([score("habit tracker, daily")]);
		const lines = csv.split("\n");
		expect(lines).toHaveLength(2);
		expect(lines[0].startsWith("keyword,country,popularity")).toBe(true);
		expect(lines[1].startsWith('"habit tracker, daily",us,50,40')).toBe(true);
	});
});
