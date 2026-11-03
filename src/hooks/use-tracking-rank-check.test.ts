import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

import { useRankCheckStatus, useRunRankCheck } from "@/hooks/use-tracking";
import type { RankCheckRun, RankCheckStatus } from "@/lib/types";

const APP_ID = "app-1";
const POLL_MS = 20;
const CHECK_KEY = ["apps", APP_ID, "tracking", "check"];
const BOARD_KEY = ["apps", APP_ID, "tracking", "board", "us"];
const MARKETS_KEY = ["apps", APP_ID, "tracking", "markets"];
const SUMMARY_KEY = ["apps", APP_ID, "tracking", "summary"];
const UNRELATED_KEY = ["apps", APP_ID, "listings"];

function run(status: RankCheckStatus, checked = 0, total = 3): RankCheckRun {
  return {
    appId: APP_ID,
    checked,
    error: null,
    failed: 0,
    failures: [],
    finishedAt: status === "running" ? null : "2026-11-03T10:00:00.000Z",
    id: "run-1",
    kind: "manual",
    measured: checked,
    progress: total ? checked / total : 0,
    ranked: 0,
    startedAt: "2026-11-03T09:59:00.000Z",
    status,
    total,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let originalFetch: typeof fetch;
let statusReads: number;

/**
 * Serve GET /tracking/check from `statuses` (the last one repeats) and POST
 * /tracking/check with `start`. `statusDelayMs` holds every status read back.
 */
function stubApi(options: {
  start?: { alreadyRunning: boolean; run: RankCheckRun };
  statusDelayMs?: number;
  statuses?: RankCheckRun[];
}) {
  statusReads = 0;
  const statuses = options.statuses ?? [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (!url.includes(`/api/apps/${APP_ID}/tracking/check`)) {
      return json({ code: "NOT_FOUND" }, 404);
    }
    if (init?.method === "POST") return json(options.start, 202);
    const next = statuses[Math.min(statusReads, statuses.length - 1)] ?? null;
    statusReads++;
    if (options.statusDelayMs) await sleep(options.statusDelayMs);
    return json({ run: next });
  }) as typeof fetch;
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  for (const key of [BOARD_KEY, MARKETS_KEY, SUMMARY_KEY, UNRELATED_KEY]) {
    queryClient.setQueryData(key, { seeded: true });
  }
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "RankCheckTestWrapper";
  return { queryClient, wrapper: Wrapper };
}

function invalidated(queryClient: QueryClient, key: readonly unknown[]) {
  return queryClient.getQueryState(key)?.isInvalidated ?? false;
}

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("useRankCheckStatus", () => {
  test("polls while the run is running and stops once it completes", async () => {
    stubApi({
      statuses: [run("running", 1), run("running", 2), run("completed", 3)],
    });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useRankCheckStatus(APP_ID, { pollMs: POLL_MS }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data?.status).toBe("completed"));
    expect(statusReads).toBe(3);
    await sleep(POLL_MS * 5);
    expect(statusReads).toBe(3);
  });

  for (const end of ["failed", "interrupted"] as const) {
    test(`stops polling when the run ends as ${end}`, async () => {
      stubApi({ statuses: [run("running", 1), run(end, 1)] });
      const { wrapper } = setup();
      const { result } = renderHook(
        () => useRankCheckStatus(APP_ID, { pollMs: POLL_MS }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.data?.status).toBe(end));
      await sleep(POLL_MS * 5);
      expect(statusReads).toBe(2);
    });
  }

  test("does not poll a run that is already finished", async () => {
    stubApi({ statuses: [run("completed", 3)] });
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useRankCheckStatus(APP_ID, { pollMs: POLL_MS }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await sleep(POLL_MS * 5);
    expect(statusReads).toBe(1);
  });

  test("refreshes board, markets and summary when a run goes from running to done", async () => {
    stubApi({ statuses: [run("running", 1), run("completed", 3)] });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(
      () => useRankCheckStatus(APP_ID, { pollMs: POLL_MS }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data?.status).toBe("completed"));
    expect(invalidated(queryClient, BOARD_KEY)).toBe(true);
    expect(invalidated(queryClient, MARKETS_KEY)).toBe(true);
    expect(invalidated(queryClient, SUMMARY_KEY)).toBe(true);
    expect(invalidated(queryClient, UNRELATED_KEY)).toBe(false);
  });

  test("does not refresh anything when the first read is already finished", async () => {
    stubApi({ statuses: [run("completed", 3)] });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(
      () => useRankCheckStatus(APP_ID, { pollMs: POLL_MS }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidated(queryClient, SUMMARY_KEY)).toBe(false);
    expect(invalidated(queryClient, BOARD_KEY)).toBe(false);
  });

  test("a run seeded as running (dashboard summary) refreshes the summary when it ends", async () => {
    stubApi({ statuses: [run("completed", 3)] });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(
      () =>
        useRankCheckStatus(APP_ID, {
          initialRun: run("running", 0),
          pollMs: POLL_MS,
        }),
      { wrapper },
    );

    expect(result.current.data?.status).toBe("running");
    await waitFor(() => expect(result.current.data?.status).toBe("completed"));
    expect(statusReads).toBe(1);
    expect(invalidated(queryClient, SUMMARY_KEY)).toBe(true);
  });
});

describe("useRunRankCheck", () => {
  test("puts the started run in the cache so the status starts polling", async () => {
    const started = run("running", 0);
    stubApi({ start: { alreadyRunning: false, run: started } });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useRunRankCheck(APP_ID), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(queryClient.getQueryData(CHECK_KEY)).toEqual(started);
  });

  test("an already running check is shown as the running run", async () => {
    const existing = { ...run("running", 2), id: "run-existing" };
    stubApi({ start: { alreadyRunning: true, run: existing } });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useRunRankCheck(APP_ID), { wrapper });

    let response: Awaited<ReturnType<typeof result.current.mutateAsync>> | null =
      null;
    await act(async () => {
      response = await result.current.mutateAsync();
    });
    expect(response).toEqual({ alreadyRunning: true, run: existing });
    expect(queryClient.getQueryData(CHECK_KEY)).toEqual(existing);
  });

  test("a stale status read still in flight cannot overwrite the started run", async () => {
    const started = { ...run("running", 0), id: "run-new" };
    stubApi({
      start: { alreadyRunning: false, run: started },
      statusDelayMs: 60,
      statuses: [{ ...run("completed", 3), id: "run-old" }],
    });
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(
      () => ({
        start: useRunRankCheck(APP_ID),
        status: useRankCheckStatus(APP_ID, { pollMs: 10_000 }),
      }),
      { wrapper },
    );

    await waitFor(() => expect(statusReads).toBe(1));
    await act(async () => {
      await result.current.start.mutateAsync();
    });
    await sleep(100);

    expect(queryClient.getQueryData(CHECK_KEY)).toEqual(started);
    expect(result.current.status.data?.id).toBe("run-new");
  });
});
