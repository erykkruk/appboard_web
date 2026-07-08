import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

import { useResearchAppList, useResearchSearch } from "@/hooks/use-research";
import { RESEARCH_LIST_STORAGE_KEY } from "@/lib/research";
import type { ResearchSuggestion } from "@/lib/types";

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	const Wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	Wrapper.displayName = "TestQueryClientWrapper";
	return Wrapper;
}

const SUGGESTION: ResearchSuggestion = {
	developer: "Acme",
	id: "com.acme.app",
	store: "playstore",
	title: "Acme App",
	url: "https://play.google.com/store/apps/details?id=com.acme.app",
};

let originalFetch: typeof fetch;

beforeEach(() => {
	originalFetch = globalThis.fetch;
	localStorage.removeItem(RESEARCH_LIST_STORAGE_KEY);
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	localStorage.removeItem(RESEARCH_LIST_STORAGE_KEY);
});

describe("useResearchSearch", () => {
	test("does not fetch for terms shorter than 2 characters", async () => {
		const fetchMock = mock(async () => new Response("{}"));
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		renderHook(() => useResearchSearch("a", "us", "both"), {
			wrapper: createWrapper(),
		});

		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("fetches suggestions for a valid term", async () => {
		const fetchMock = mock(
			async () =>
				new Response(JSON.stringify({ suggestions: [SUGGESTION] }), {
					headers: { "Content-Type": "application/json" },
					status: 200,
				}),
		);
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		const { result } = renderHook(
			() => useResearchSearch("acme", "us", "both"),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toEqual([SUGGESTION]);

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("/api/research/search");
		expect(JSON.parse(init.body as string)).toEqual({
			country: "us",
			scope: "both",
			term: "acme",
		});
	});
});

describe("useResearchAppList", () => {
	test("adds apps once and persists them to localStorage", async () => {
		const { result } = renderHook(() => useResearchAppList());

		act(() => {
			result.current.add(SUGGESTION);
			result.current.add(SUGGESTION);
		});

		expect(result.current.apps).toHaveLength(1);
		expect(result.current.apps[0]).toMatchObject({
			checked: true,
			id: SUGGESTION.id,
		});

		await waitFor(() => {
			const saved = JSON.parse(
				localStorage.getItem(RESEARCH_LIST_STORAGE_KEY) ?? "[]",
			);
			expect(saved).toHaveLength(1);
		});
	});

	test("toggles and removes apps by key", () => {
		const { result } = renderHook(() => useResearchAppList());

		act(() => result.current.add(SUGGESTION));
		act(() => result.current.toggle("playstore:com.acme.app"));
		expect(result.current.apps[0].checked).toBe(false);

		act(() => result.current.remove("playstore:com.acme.app"));
		expect(result.current.apps).toHaveLength(0);
	});

	test("restores a previously saved list", async () => {
		localStorage.setItem(
			RESEARCH_LIST_STORAGE_KEY,
			JSON.stringify([{ ...SUGGESTION, checked: false }]),
		);

		const { result } = renderHook(() => useResearchAppList());

		await waitFor(() => expect(result.current.apps).toHaveLength(1));
		expect(result.current.apps[0].checked).toBe(false);
	});
});
