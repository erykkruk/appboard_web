import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

import { useListingDiffs } from "@/hooks/use-listing-diffs";

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	const Wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	Wrapper.displayName = "TestQueryClientWrapper";
	return Wrapper;
}

let originalFetch: typeof fetch;

beforeEach(() => {
	originalFetch = globalThis.fetch;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe("use-listing-diffs exports", () => {
	test("useListingDiffs is exported as a function", () => {
		expect(typeof useListingDiffs).toBe("function");
	});
});

describe("useListingDiffs", () => {
	test("fetches listing diffs and returns them", async () => {
		const payload = {
			diffs: [
				{
					language: "en-US",
					fields: [
						{ field: "title", oldValue: "old", newValue: "new" },
					],
				},
			],
		};
		globalThis.fetch = mock(
			async () =>
				new Response(JSON.stringify(payload), { status: 200 }),
		) as unknown as typeof fetch;

		const { result } = renderHook(() => useListingDiffs("a"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.data).toBeDefined();
		});

		expect(result.current.data).toHaveLength(1);
		expect(result.current.data?.[0]?.language).toBe("en-US");
		expect(result.current.data?.[0]?.fields?.[0]?.field).toBe("title");
	});

	test("calls /api/apps/:appId/listings/diffs", async () => {
		const fetchMock = mock(
			async () =>
				new Response(JSON.stringify({ diffs: [] }), { status: 200 }),
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		const { result } = renderHook(() => useListingDiffs("app-123"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } })
			.mock.calls;
		expect(calls.length).toBeGreaterThan(0);
		expect(calls[0]?.[0]).toBe("/api/apps/app-123/listings/diffs");
	});

	test("is disabled when enabled=false", async () => {
		const fetchMock = mock(
			async () =>
				new Response(JSON.stringify({ diffs: [] }), { status: 200 }),
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		const { result } = renderHook(() => useListingDiffs("a", false), {
			wrapper: createWrapper(),
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(result.current.fetchStatus).toBe("idle");
		const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } })
			.mock.calls;
		expect(calls.length).toBe(0);
	});

	test("is disabled when appId is empty", async () => {
		const fetchMock = mock(
			async () =>
				new Response(JSON.stringify({ diffs: [] }), { status: 200 }),
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		const { result } = renderHook(() => useListingDiffs(""), {
			wrapper: createWrapper(),
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(result.current.fetchStatus).toBe("idle");
		const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } })
			.mock.calls;
		expect(calls.length).toBe(0);
	});
});
