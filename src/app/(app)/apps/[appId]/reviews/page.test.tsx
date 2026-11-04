import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { GROUP_REVIEWS, GROUP_SUMMARY } from "@/test/ratings-fixtures";
import type { RatingsSummary } from "@/lib/types";

mock.module("next/navigation", () => ({
  useParams: () => ({ appId: "android-1" }),
  usePathname: () => "/apps/android-1/reviews",
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

const { default: ReviewsManager } = await import("./page");

const APP_ONLY_SUMMARY: RatingsSummary = {
  ...GROUP_SUMMARY,
  apps: [GROUP_SUMMARY.apps[1]],
  group: null,
  scope: "app",
  stores: [GROUP_SUMMARY.stores[1]],
  total: { average: 4.529, ratingCount: 73, writtenReviews: 21 },
};

let requests: { method: string; url: string; body?: string }[] = [];
let ratingsStatus = 200;
let originalFetch: typeof fetch;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function route(url: URL, method: string): Response {
  const path = url.pathname;
  const scope = url.searchParams.get("scope");
  if (path === "/api/apps/android-1") {
    return json({
      app: {
        id: "android-1",
        name: "Buzzin",
        platform: "android",
        rawData: {},
        store: { connectionMode: "api", type: "google_play" },
      },
    });
  }
  if (path === "/api/ai/status") return json({ configured: true });
  if (path === "/api/apps/android-1/reviews/ratings") {
    if (ratingsStatus !== 200) return json({ code: "X" }, ratingsStatus);
    return json(scope === "group" ? GROUP_SUMMARY : APP_ONLY_SUMMARY);
  }
  if (path === "/api/apps/android-1/reviews/stats") {
    return json({
      averageRating: 4.5,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
      noReplyCount: 2,
      totalReviews: scope === "group" ? 2 : 1,
    });
  }
  if (path === "/api/apps/android-1/reviews") {
    const store = url.searchParams.get("storeType");
    const pool =
      scope === "group"
        ? GROUP_REVIEWS
        : GROUP_REVIEWS.filter((r) => r.appId === "android-1");
    return json({
      countries: ["pl"],
      reviews: store ? pool.filter((r) => r.storeType === store) : pool,
    });
  }
  if (method === "POST" && path.endsWith("/reply")) {
    return json({ success: true });
  }
  return json({ code: "NOT_FOUND" }, 404);
}

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  requests = [];
  ratingsStatus = 200;
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    requests.push({
      body: typeof init?.body === "string" ? init.body : undefined,
      method,
      url: `${url.pathname}${url.search}`,
    });
    return route(url, method);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

describe("Reviews page", () => {
  test("shows store totals and App Store reviews next to Google Play ones", async () => {
    render(<ReviewsManager />, { wrapper: Wrapper });

    expect(
      await screen.findByText("App Store 4.7 from 32 ratings, 6 reviews"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Google Play 4.5 from 73 ratings, 21 reviews"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Best party game on the TV")).toBeInTheDocument();
    expect(screen.getByText("Fun with friends")).toBeInTheDocument();
    expect(screen.getByText("Buzzin iPhone")).toBeInTheDocument();
    // Store + country filters exist once there are two stores.
    expect(screen.getByLabelText("Store")).toBeInTheDocument();
    expect(screen.getByLabelText("Country")).toBeInTheDocument();
    expect(
      requests.some((r) => r.url === "/api/apps/android-1/reviews?scope=group"),
    ).toBe(true);
  });

  test("This app only switches every request to the app scope", async () => {
    render(<ReviewsManager />, { wrapper: Wrapper });
    await userEvent.click(await screen.findByText("This app only"));

    await waitFor(() =>
      expect(screen.queryByText("Best party game on the TV")).toBeNull(),
    );
    expect(
      screen.queryByText("App Store 4.7 from 32 ratings, 6 reviews"),
    ).toBeNull();
    expect(
      requests.some((r) => r.url === "/api/apps/android-1/reviews?scope=app"),
    ).toBe(true);
    expect(
      requests.some(
        (r) => r.url === "/api/apps/android-1/reviews/stats?scope=app",
      ),
    ).toBe(true);
  });

  test("a reply goes to the app the review belongs to", async () => {
    render(<ReviewsManager />, { wrapper: Wrapper });
    await screen.findByText("Best party game on the TV");
    const [firstReply] = screen.getAllByText("Reply");
    await userEvent.click(firstReply);
    await userEvent.type(
      screen.getByPlaceholderText("Write your reply..."),
      "Dziekujemy",
    );
    await userEvent.click(screen.getByText("Send Reply"));

    await waitFor(() =>
      expect(requests.some((r) => r.method === "POST")).toBe(true),
    );
    const post = requests.find((r) => r.method === "POST");
    expect(post?.url).toBe("/api/apps/ios-1/reviews/r-asc-1/reply");
    expect(JSON.parse(post?.body ?? "{}")).toEqual({ text: "Dziekujemy" });
  });

  test("Refresh starts a ratings refresh for the group", async () => {
    render(<ReviewsManager />, { wrapper: Wrapper });
    await userEvent.click(await screen.findByLabelText("Refresh store ratings"));
    await waitFor(() =>
      expect(
        requests.some(
          (r) =>
            r.method === "POST" &&
            r.url === "/api/apps/android-1/reviews/ratings/refresh?scope=group",
        ),
      ).toBe(true),
    );
  });

  test("says so when the ratings cannot be loaded", async () => {
    ratingsStatus = 500;
    render(<ReviewsManager />, { wrapper: Wrapper });
    expect(
      await screen.findByText("Failed to load store ratings."),
    ).toBeInTheDocument();
    // The reviews still load.
    expect(await screen.findByText("Fun with friends")).toBeInTheDocument();
  });
});
