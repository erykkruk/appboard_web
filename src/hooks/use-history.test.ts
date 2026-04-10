import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

import { useHistory, useRollback } from "@/hooks/use-history";

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

describe("use-history exports", () => {
	test("useHistory is exported as a function", () => {
		expect(typeof useHistory).toBe("function");
	});

	test("useRollback is exported as a function", () => {
		expect(typeof useRollback).toBe("function");
	});
});

describe("useHistory", () => {
	test("fetches history entries for an app", async () => {
		const payload = {
			history: [
				{
					id: "1",
					appId: "a",
					language: "en",
					field: "title",
					createdAt: "2025-01-01T00:00:00Z",
				},
			],
		};
		globalThis.fetch = mock(
			async () =>
				new Response(JSON.stringify(payload), { status: 200 }),
		) as unknown as typeof fetch;

		const { result } = renderHook(() => useHistory("a"), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.data).toBeDefined();
		});

		expect(result.current.data).toHaveLength(1);
		expect(result.current.data?.[0]?.id).toBe("1");
	});

	test("includes language and field filters in URL", async () => {
		const fetchMock = mock(
			async () =>
				new Response(JSON.stringify({ history: [] }), { status: 200 }),
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		const { result } = renderHook(
			() => useHistory("a", { language: "en-US", field: "title" }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } })
			.mock.calls;
		expect(calls.length).toBeGreaterThan(0);
		const url = String(calls[0]?.[0] ?? "");
		expect(url).toContain("/api/apps/a/history");
		expect(url).toContain("language=en-US");
		expect(url).toContain("field=title");
	});

	test("is disabled when appId is empty", async () => {
		const fetchMock = mock(
			async () =>
				new Response(JSON.stringify({ history: [] }), { status: 200 }),
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		const { result } = renderHook(() => useHistory(""), {
			wrapper: createWrapper(),
		});

		// Allow the event loop to process any pending queries.
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(result.current.fetchStatus).toBe("idle");
		const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } })
			.mock.calls;
		expect(calls.length).toBe(0);
	});
});

describe("useRollback", () => {
	test("POSTs to /api/apps/:appId/history/:historyId/rollback", async () => {
		const fetchMock = mock(
			async () => new Response(JSON.stringify({}), { status: 200 }),
		) as unknown as typeof fetch;
		globalThis.fetch = fetchMock;

		const { result } = renderHook(() => useRollback("a"), {
			wrapper: createWrapper(),
		});

		await result.current.mutateAsync("history-id-1");

		const calls = (fetchMock as unknown as {
			mock: { calls: [string, RequestInit | undefined][] };
		}).mock.calls;
		expect(calls.length).toBeGreaterThan(0);
		const [url, init] = calls[0] ?? [];
		expect(url).toBe("/api/apps/a/history/history-id-1/rollback");
		expect(init?.method).toBe("POST");
	});
});
