import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

import { useDeploymentMode } from "@/hooks/use-deployment-mode";

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

function mockHealth(deploymentMode?: string) {
	globalThis.fetch = mock(
		async () =>
			new Response(
				JSON.stringify({ deploymentMode, status: "ok", uptime: 1, version: "0" }),
				{ status: 200 },
			),
	) as unknown as typeof fetch;
}

describe("useDeploymentMode", () => {
	test("reports cloud when the backend says cloud", async () => {
		mockHealth("cloud");
		const { result } = renderHook(() => useDeploymentMode(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.mode).toBe("cloud");
		expect(result.current.isCloud).toBe(true);
		expect(result.current.isSelfHosted).toBe(false);
	});

	test("defaults to self-hosted when mode is absent (fail-safe)", async () => {
		mockHealth(undefined);
		const { result } = renderHook(() => useDeploymentMode(), {
			wrapper: createWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.isSelfHosted).toBe(true);
		expect(result.current.isCloud).toBe(false);
	});
});
