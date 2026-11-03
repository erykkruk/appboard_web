import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";

import type {
  BoardKeyword,
  KeywordSuggestion,
  MarketSuggestions,
  TrackingBoard,
  TrackingMarket,
} from "@/lib/types";

import { MarketKeywordsCard } from "./market-keywords-card";

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function market(country: string, overrides: Partial<TrackingMarket> = {}): TrackingMarket {
  return {
    avgPosition: null,
    bestPosition: null,
    country,
    declined: 0,
    dropped: 0,
    entered: 0,
    failedLastRun: 0,
    improved: 0,
    lastCheckedAt: "2026-11-03T00:00:00.000Z",
    measured: 2,
    medianPosition: null,
    ranked: 0,
    top10: 0,
    top50: 0,
    tracked: 2,
    ...overrides,
  };
}

function keyword(name: string, overrides: Partial<BoardKeyword> = {}): BoardKeyword {
  return {
    bestPosition: null,
    classification: null,
    country: "pl",
    delta: null,
    difficulty: null,
    difficultyDelta: null,
    difficultyLabel: null,
    keyword: name,
    leader: null,
    measuredAt: "2026-11-03T00:00:00.000Z",
    metadataFields: [],
    opportunity: null,
    pick: false,
    platform: "appstore",
    popularity: null,
    position: null,
    previousPosition: null,
    rankTrend: [],
    scoreTrend: [],
    scoredAt: null,
    ...overrides,
  };
}

function idea(name: string, overrides: Partial<KeywordSuggestion> = {}): KeywordSuggestion {
  return {
    appRank: null,
    classification: null,
    difficulty: null,
    keyword: name,
    opportunity: null,
    popularity: null,
    scoredAt: null,
    winnable: null,
    ...overrides,
  };
}

function board(country: string, keywords: BoardKeyword[]): TrackingBoard {
  return {
    changes: [],
    countries: ["pl", "us"],
    country,
    keywords,
    language: "pl",
    metadataGap: [],
    metadataUntracked: [],
    movement: [],
    runs: [],
    stats: {
      avgPosition: null,
      bestPosition: null,
      declined: 0,
      improved: 0,
      lastCheckedAt: null,
      lastScoredAt: null,
      picks: 0,
      ranked: 0,
      runs: 1,
      top10: 0,
      tracked: keywords.length,
    },
  };
}

const MARKETS = {
  app: { devices: ["phone"], externalId: "1", id: "app-1", name: "Buzzin", platform: "ios" },
  lastRun: null,
  markets: [market("us"), market("pl", { ranked: 2, top10: 1 })],
  rankTracking: {
    devices: ["phone"],
    note: null,
    store: "appstore",
    supported: true,
    surface: "iphone-search",
  },
  totals: { ...market("all"), markets: 2 },
};

const BOARD_PL = board("pl", [
  keyword("quiz rodzinny", {
    difficulty: 30,
    popularity: 40,
    position: 2,
    scoredAt: "2026-11-03",
  }),
  keyword("kalambury", { position: 18 }),
]);

const SUGGESTIONS_PL: MarketSuggestions = {
  cap: 40,
  country: "pl",
  sourceKeywords: 2,
  suggestions: [
    idea("teleturniej", { difficulty: 70, popularity: 35, scoredAt: "2026-11-03", winnable: false }),
    idea("gra na tv"),
  ],
  trackedCount: 2,
};

let originalFetch: typeof fetch;
let posts: Array<{ url: string; body: unknown }>;

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

beforeEach(() => {
  originalFetch = globalThis.fetch;
  posts = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === "POST") {
      posts.push({ body: JSON.parse(String(init.body)), url });
      if (url.includes("/keyword-scores")) return json({ scores: [] });
      return json({ keywords: [] });
    }
    if (url.includes("/tracking/markets")) return json(MARKETS);
    if (url.includes("/tracking/suggestions")) return json(SUGGESTIONS_PL);
    return json(BOARD_PL);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

describe("MarketKeywordsCard", () => {
  test("opens on the strongest market with tracked keywords first, then ideas", async () => {
    render(<MarketKeywordsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });

    await screen.findByText("teleturniej");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual([
      "quiz rodzinnytracked",
      "kalamburytracked",
      "teleturniejidea",
      "gra na tvidea",
    ]);
    expect(screen.getByText("2/40 tracked")).toBeDefined();
    expect(within(rows[0]).getByText("#2")).toBeDefined();
    expect(within(rows[0]).getByText("winnable")).toBeDefined();
    expect(within(rows[2]).getByText("hard")).toBeDefined();
    expect(within(rows[3]).getByText("not scored")).toBeDefined();
  });

  test("tracks an idea in the shown market", async () => {
    render(<MarketKeywordsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    const row = (await screen.findByText("gra na tv")).closest("tr") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: /Track/ }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].url).toContain("/api/apps/app-1/tracking/keywords");
    expect(posts[0].body).toEqual({ country: "pl", keywords: ["gra na tv"] });
  });

  test("scores only the keywords that were never scored", async () => {
    render(<MarketKeywordsCard appId="app-1" appstoreId="123" homeCountry="us" />, {
      wrapper: Wrapper,
    });
    await screen.findByText("teleturniej");

    fireEvent.click(screen.getByRole("button", { name: "Score missing (2)" }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].url).toContain("/api/research/keyword-scores");
    expect(posts[0].body).toEqual({
      appstoreId: "123",
      country: "pl",
      keywords: ["kalambury", "gra na tv"],
    });
  });

  test("disables Track once the market is full", async () => {
    const full = Array.from({ length: 40 }, (_, i) => keyword(`kw ${i}`));
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tracking/markets")) return json(MARKETS);
      if (url.includes("/tracking/suggestions")) return json(SUGGESTIONS_PL);
      return json(board("pl", full));
    }) as unknown as typeof fetch;

    render(<MarketKeywordsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    const row = (await screen.findByText("gra na tv")).closest("tr") as HTMLElement;

    expect(screen.getByText("40/40 tracked")).toBeDefined();
    expect((within(row).getByRole("button", { name: /Track/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
