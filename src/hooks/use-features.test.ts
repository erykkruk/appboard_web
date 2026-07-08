import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

import {
	useFeatures,
	useIsFeatureEnabled,
	useUpdateFeatures,
} from "@/hooks/use-features";

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

describe("use-features exports", () => {
	test("useFeatures is exported as a function", () => {
		expect(typeof useFeatures).toBe("function");
	});

	test("useUpdateFeatures is exported as a function", () => {
		expect(typeof useUpdateFeatures).toBe("function");
	});

	test("useIsFeatureEnabled is exported as a function", () => {
		expect(typeof useIsFeatureEnabled).toBe("function");
	});
});

describe("useFeatures", () => {
	test("fetches and returns features data", async () => {
		const payload = {
			definitions: [
				{
					key: "LISTINGS",
					name: "Listings",
					description: "Manage listings",
					defaultEnabled: true,
				},
			],
			features: { LISTINGS: true },
		};
		globalThis.fetch = mock(
			async () =>
				new Response(JSON.stringify(payload), { status: 200 }),
		) as unknown as typeof fetch;

		const { result } = renderHook(() => useFeatures(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.data).toBeDefined();
		});

		expect(result.current.data?.features.LISTINGS).toBe(true);
		expect(result.current.data?.definitions).toHaveLength(1);
	});

	test("calls /api/features endpoint", async () => {
		const fetchMock = mock(
			async () =>
				new Response(
					JSON.stringify({ definitions: [], features: {} }),
					{ status: 200 },
				),
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		const { result } = renderHook(() => useFeatures(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } })
			.mock.calls;
		expect(calls.length).toBeGreaterThan(0);
		expect(calls[0]?.[0]).toBe("/api/features");
	});
});

describe("useUpdateFeatures", () => {
	test("sends PATCH to /api/features", async () => {
		const fetchMock = mock(
			async () =>
				new Response(
					JSON.stringify({ features: { LISTINGS: false } }),
					{ status: 200 },
				),
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		const { result } = renderHook(() => useUpdateFeatures(), {
			wrapper: createWrapper(),
		});

		await result.current.mutateAsync({ LISTINGS: false });

		const calls = (fetchMock as unknown as {
			mock: { calls: [string, RequestInit | undefined][] };
		}).mock.calls;
		expect(calls.length).toBeGreaterThan(0);
		const [url, init] = calls[0] ?? [];
		expect(url).toBe("/api/features");
		expect(init?.method).toBe("PATCH");
	});
});

describe("useIsFeatureEnabled", () => {
	test("returns true when data is not yet loaded", () => {
		globalThis.fetch = mock(
			() => new Promise(() => {}),
		) as unknown as typeof fetch;

		const { result } = renderHook(() => useIsFeatureEnabled("LISTINGS"), {
			wrapper: createWrapper(),
		});

		expect(result.current).toBe(true);
	});

	test("returns DB value (false) when loaded", async () => {
		globalThis.fetch = mock(
			async () =>
				new Response(
					JSON.stringify({
						definitions: [],
						features: { LISTINGS: false },
					}),
					{ status: 200 },
				),
		) as unknown as typeof fetch;

		const { result } = renderHook(() => useIsFeatureEnabled("LISTINGS"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current).toBe(false);
		});
	});
});
