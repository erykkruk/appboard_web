import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import type {
  BoardKeyword,
  KeywordDownloadsReport,
  TrackingBoard,
  TrackingMarket,
  TrackingMarketsHistory,
} from "@/lib/types";

import { KeywordPositionsCard } from "./keyword-positions-card";

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
    measured: 3,
    medianPosition: null,
    ranked: 0,
    top10: 0,
    top50: 0,
    tracked: 3,
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
      ranked: keywords.filter((k) => k.position !== null).length,
      runs: 1,
      top10: 1,
      tracked: keywords.length,
    },
  };
}

const MARKETS = {
  app: { devices: ["phone"], externalId: "1", id: "app-1", name: "Buzzin", platform: "ios" },
  lastRun: null,
  markets: [
    // US ranks only for the app's own name: #1 there is not strength.
    market("us", { earnedRanked: 0, earnedTop10: 0, earnedTop50: 0, ranked: 1, top10: 1, top50: 1 }),
    market("pl", {
      bestEarned: { delta: 2, keyword: "quiz rodzinny", position: 1 },
      earnedRanked: 2,
      earnedTop10: 2,
      earnedTop50: 2,
      medianPosition: 2.5,
      ranked: 2,
      top10: 2,
      top50: 2,
    }),
  ],
  rankTracking: {
    devices: ["phone"],
    note: null,
    store: "appstore",
    supported: true,
    surface: "iphone-search",
  },
  totals: { ...market("all"), markets: 2 },
};

const BOARDS: Record<string, TrackingBoard> = {
  pl: board("pl", [
    keyword("quiz rodzinny", {
      bestPosition: 1,
      delta: 2,
      position: 1,
      rankTrend: [
        { day: "2026-11-02", position: 3 },
        { day: "2026-11-03", position: 1 },
      ],
    }),
    keyword("gry na telewizor", {
      bestPosition: 4,
      position: 4,
      rankTrend: [
        { day: "2026-11-02", position: null },
        { day: "2026-11-03", position: 4 },
      ],
    }),
    keyword("kalambury", { measuredAt: null }),
  ]),
  us: board("us", [
    keyword("buzzin", {
      country: "us",
      position: 1,
      rankTrend: [{ day: "2026-11-03", position: 1 }],
    }),
  ]),
};

/** App Store estimate for pl: quiz rodzinny ranks #1, gry na telewizor #4, kalambury unmeasured. */
const DOWNLOADS_PL: KeywordDownloadsReport = {
  country: "pl",
  estimate: {
    daysPerMonth: 30,
    perDay: { high: 0.5, low: 0.12 },
    perMonth: { high: 15, low: 3.6 },
    ranked: 2,
    scored: 2,
  },
  keywords: [
    {
      estimate: {
        beyondModel: false,
        perDay: { high: 0.1, low: 0.02 },
        perMonth: { high: 3, low: 0.6 },
        popularity: 30,
        position: 1,
        scoredAt: "2026-11-03",
      },
      keyword: "quiz rodzinny",
      play: null,
    },
    {
      estimate: {
        beyondModel: false,
        perDay: { high: 0.4, low: 0.1 },
        perMonth: { high: 12, low: 3 },
        popularity: 50,
        position: 4,
        scoredAt: "2026-11-03",
      },
      keyword: "gry na telewizor",
      play: null,
    },
    { estimate: null, keyword: "kalambury", play: null },
  ],
  message: null,
  platform: "ios",
  play: null,
  source: "app_store_estimate",
};

let originalFetch: typeof fetch;
let requested: string[];

const HISTORY: TrackingMarketsHistory = {
  from: "2026-08-07",
  markets: [
    {
      country: "pl",
      points: [
        { day: "2026-11-02", measured: 3, median: 30, ranked: 1, top10: 0, top50: 1, tracked: 3 },
        { day: "2026-11-03", measured: 3, median: 8, ranked: 2, top10: 1, top50: 2, tracked: 3 },
      ],
    },
  ],
  timeZone: "Europe/Warsaw",
  to: "2026-11-03",
};

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

beforeEach(() => {
  originalFetch = globalThis.fetch;
  requested = [];
  globalThis.fetch = mock(async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    if (url.includes("/tracking/markets/history")) return json(HISTORY);
    if (url.includes("/tracking/markets")) return json(MARKETS);
    if (url.includes("/tracking/keyword-downloads")) {
      return json(url.includes("country=pl") ? DOWNLOADS_PL : { ...DOWNLOADS_PL, keywords: [] });
    }
    const country = new URL(url, "http://localhost").searchParams.get("country") ?? "";
    return json(BOARDS[country] ?? board(country, []));
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

describe("KeywordPositionsCard", () => {
  test("opens on the strongest market and charts its keywords by default", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });

    expect(await screen.findByRole("checkbox", { name: "Show quiz rodzinny on the chart" })).toBeDefined();
    expect(screen.getByRole("img", { name: "Keyword ranking over time" })).toBeDefined();
    expect(
      (screen.getByRole("checkbox", { name: "Show quiz rodzinny on the chart" }) as HTMLElement)
        .getAttribute("data-state"),
    ).toBe("checked");
    // Not measured yet: on the chart selection, listed under the chart.
    expect(
      (screen.getByRole("checkbox", { name: "Show kalambury on the chart" }) as HTMLElement)
        .getAttribute("data-state"),
    ).toBe("checked");
    expect(screen.getByText(/Not measured yet, so not on the chart: kalambury/)).toBeDefined();
    expect(requested.some((u) => u.includes("/tracking/board?country=pl"))).toBe(true);
    expect(
      screen.getByRole("link", { name: "Open full tracker" }).getAttribute("href"),
    ).toBe("/apps/app-1/research?tab=keywords&country=pl");
  });

  test("tells when a keyword that was never measured will be", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    const cell = await screen.findByTitle("Measured at the next check (00:00 / 12:00)");
    expect(cell.textContent).toBe("Not checked");
  });

  test("uses the check times of the app's store (Google Play: once a day)", async () => {
    const boardFetch = globalThis.fetch;
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (new URL(url, "http://localhost").pathname.endsWith("/tracking")) {
        return json({
          config: null,
          keywords: [],
          positions: [],
          schedule: {
            autoResearchHour: 6,
            nextAutoResearchAt: null,
            rankCheckHours: [0],
            scoreRefreshHour: 1,
            timezone: "Europe/Warsaw",
          },
        });
      }
      return boardFetch(input);
    }) as unknown as typeof fetch;

    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    const cell = await screen.findByTitle("Measured at the next check (00:00)");
    expect(cell.textContent).toBe("Not checked");
  });

  test("shows a strength table that ignores the brand's #1", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    const table = await screen.findByRole("table", { name: "Markets by strength" });
    const rows = table.querySelectorAll("tbody tr");
    expect(rows[0]?.textContent).toContain("Poland");
    expect(rows[0]?.textContent).toContain("quiz rodzinny");
    expect(rows[1]?.textContent).toContain("United States");
  });

  test("puts a trend in front of the counts of a market with history", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    expect(
      await screen.findByRole("button", { name: /Top 10 in Poland, .*open the day-by-day chart/ }),
    ).toBeDefined();
    for (const metric of ["Ranked", "Top 50", "Median"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${metric} in Poland`) })).toBeDefined();
    }
    // No history for the United States: plain numbers.
    expect(screen.queryByRole("button", { name: /in United States/ })).toBeNull();
    expect(requested.some((u) => u.includes("/tracking/markets/history?days=90"))).toBe(true);
  });

  test("says when the history has a single day instead of an empty chart", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    await screen.findByRole("checkbox", { name: "Show quiz rodzinny on the chart" });

    fireEvent.click(screen.getByRole("button", { name: /^US/ }));

    expect(await screen.findByText(/History starts/)).toBeDefined();
    expect(screen.queryByRole("img", { name: "Keyword ranking over time" })).toBeNull();
  });

  test("switches market from the strength table", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    await screen.findByRole("checkbox", { name: "Show quiz rodzinny on the chart" });

    fireEvent.click(screen.getByRole("button", { name: /^US/ }));

    expect(
      await screen.findByRole("checkbox", { name: "Show buzzin on the chart" }),
    ).toBeDefined();
    await waitFor(() =>
      expect(requested.some((u) => u.includes("/tracking/board?country=us"))).toBe(true),
    );
  });

  test("unticking a keyword removes it from the chart legend", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    await screen.findByRole("checkbox", { name: "Show quiz rodzinny on the chart" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Show gry na telewizor on the chart" }));

    await waitFor(() =>
      expect(
        (screen.getByRole("checkbox", { name: "Show gry na telewizor on the chart" }) as HTMLElement)
          .getAttribute("data-state"),
      ).toBe("unchecked"),
    );
  });

  test("opens on All with no star yet", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    await screen.findByRole("checkbox", { name: "Show quiz rodzinny on the chart" });
    expect(
      screen.getByRole("button", { name: "All (3)" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: "Starred (0)" })).toBeDefined();
    expect(screen.getByText(/opens on the 20 most searched keywords/)).toBeDefined();
  });

  test("with starred keywords it lists and charts the starred ones by default", async () => {
    const starredBoard = board("pl", [
      keyword("quiz rodzinny", { keywordId: "kw-1", popularity: 50, position: 1 }),
      keyword("gry na telewizor", {
        keywordId: "kw-2",
        popularity: 10,
        position: 4,
        starred: true,
      }),
      keyword("kalambury", { keywordId: "kw-3", measuredAt: null, starred: true }),
    ]);
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/tracking/markets")) return json(MARKETS);
      return json(starredBoard);
    }) as unknown as typeof fetch;

    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    await screen.findByRole("checkbox", { name: "Show gry na telewizor on the chart" });

    expect(
      screen.getByRole("button", { name: "Starred (2)" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.queryByRole("checkbox", { name: "Show quiz rodzinny on the chart" })).toBeNull();
    expect(
      (screen.getByRole("checkbox", { name: "Show gry na telewizor on the chart" }) as HTMLElement)
        .getAttribute("data-state"),
    ).toBe("checked");
    expect(screen.getByText(/opens on your starred keywords \(up to 20\)/)).toBeDefined();

    // All brings the rest back; the most searched one stays off the chart.
    fireEvent.click(screen.getByRole("button", { name: "All (3)" }));
    const quiz = await screen.findByRole("checkbox", { name: "Show quiz rodzinny on the chart" });
    expect((quiz as HTMLElement).getAttribute("data-state")).toBe("unchecked");
    expect(new URL(window.location.href).searchParams.get("kw")).toBe("all");
  });

  test("stars a keyword from the table", async () => {
    const patches: Array<{ body: unknown; url: string }> = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PATCH") {
        patches.push({ body: JSON.parse(String(init.body)), url });
        return json({ keyword: { id: "kw-1", starred: true } });
      }
      if (url.includes("/tracking/markets")) return json(MARKETS);
      return json(board("pl", [keyword("quiz rodzinny", { keywordId: "kw-1", position: 1 })]));
    }) as unknown as typeof fetch;

    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    fireEvent.click(await screen.findByRole("button", { name: "Star quiz rodzinny" }));

    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toEqual({
      body: { starred: true },
      url: "/api/apps/app-1/tracking/keywords/kw-1",
    });
    // The first star does not flip the list to Starred under the cursor.
    expect(
      screen.getByRole("button", { name: "All (1)" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  test("a phrase that is no longer tracked cannot be starred", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });
    const star = await screen.findByRole("button", { name: "Star quiz rodzinny" });
    expect((star as HTMLButtonElement).disabled).toBe(true);
  });

  test("shows estimated downloads per keyword with the total and sorts by them", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });

    const estimate = await screen.findByText("est. 3-12/mo");
    expect(estimate.getAttribute("title")).toContain("not Apple data");
    expect(screen.getByText("est. <1-3/mo")).toBeDefined();
    expect(
      screen.getByText(/Estimated search downloads: 4-15\/month from 2 ranked of 2 scored keywords/),
    ).toBeDefined();
    expect(requested.some((u) => u.includes("/tracking/keyword-downloads?country=pl"))).toBe(true);

    const rowOrder = () =>
      screen
        .getAllByRole("checkbox")
        .map((c) => c.getAttribute("aria-label"))
        .filter((label): label is string => label !== null);
    expect(rowOrder()[0]).toBe("Show quiz rodzinny on the chart");
    fireEvent.click(screen.getByRole("button", { name: /Downloads/ }));
    expect(rowOrder()[0]).toBe("Show gry na telewizor on the chart");
    expect(rowOrder().at(-1)).toBe("Show kalambury on the chart");
  });

  test("renders nothing when the store has no searchable rankings", async () => {
    globalThis.fetch = mock(async () =>
      json({ ...MARKETS, rankTracking: { ...MARKETS.rankTracking, supported: false } }),
    ) as unknown as typeof fetch;
    const { container } = render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(container.textContent).toBe(""));
  });
});
