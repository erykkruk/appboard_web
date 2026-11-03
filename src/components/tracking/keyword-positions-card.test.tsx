import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import type { BoardKeyword, TrackingBoard, TrackingMarket } from "@/lib/types";

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
  markets: [market("us", { ranked: 1, top10: 1 }), market("pl", { ranked: 2, top10: 2 })],
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
  us: board("us", [keyword("buzzin", { country: "us", position: 1 })]),
};

let originalFetch: typeof fetch;
let requested: string[];

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
    if (url.includes("/tracking/markets")) return json(MARKETS);
    const country = new URL(url, "http://localhost").searchParams.get("country") ?? "";
    return json(BOARDS[country] ?? board(country, []));
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanup();
});

describe("KeywordPositionsCard", () => {
  test("opens on the strongest market and charts its ranked keywords", async () => {
    render(<KeywordPositionsCard appId="app-1" homeCountry="us" />, { wrapper: Wrapper });

    expect(await screen.findByRole("checkbox", { name: "Show quiz rodzinny on the chart" })).toBeDefined();
    expect(screen.getByRole("img", { name: "Keyword ranking over time" })).toBeDefined();
    expect(
      (screen.getByRole("checkbox", { name: "Show quiz rodzinny on the chart" }) as HTMLElement)
        .getAttribute("data-state"),
    ).toBe("checked");
    expect(
      (screen.getByRole("checkbox", { name: "Show kalambury on the chart" }) as HTMLElement)
        .getAttribute("data-state"),
    ).toBe("unchecked");
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

  test("switches market from the market strip", async () => {
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
