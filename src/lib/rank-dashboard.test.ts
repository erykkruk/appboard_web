import { describe, expect, test } from "bun:test";

import {
  boardToSnapshots,
  defaultChartKeywords,
  MAX_CHART_KEYWORDS,
  pickDefaultMarket,
  sortKeywordsForDashboard,
  sortMarketsForDashboard,
  toggleChartKeyword,
} from "@/lib/rank-dashboard";
import type { BoardKeyword, TrackingMarket } from "@/lib/types";

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
    measured: 10,
    medianPosition: null,
    ranked: 0,
    top10: 0,
    top50: 0,
    tracked: 10,
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

describe("sortMarketsForDashboard", () => {
  test("orders by top 10, then ranked, then best position", () => {
    const sorted = sortMarketsForDashboard([
      market("us", { ranked: 3, top10: 1, bestPosition: 1 }),
      market("pl", { ranked: 8, top10: 5, bestPosition: 1 }),
      market("cz", { ranked: 10, top10: 5, bestPosition: 1 }),
      market("de", { ranked: 3, top10: 1, bestPosition: 8 }),
    ]);
    expect(sorted.map((m) => m.country)).toEqual(["cz", "pl", "us", "de"]);
  });
});

describe("pickDefaultMarket", () => {
  test("opens on the strongest market when anything ranks", () => {
    expect(
      pickDefaultMarket(
        [market("us", { ranked: 1, top10: 1 }), market("pl", { ranked: 8, top10: 5 })],
        "us",
      ),
    ).toBe("pl");
  });

  test("falls back to the home market when nothing ranks", () => {
    expect(pickDefaultMarket([market("de"), market("us")], "US")).toBe("us");
  });

  test("falls back to the first market when home is not tracked", () => {
    expect(pickDefaultMarket([market("de"), market("fr")], "us")).toBe("de");
  });

  test("has nothing to open without markets", () => {
    expect(pickDefaultMarket([], "us")).toBeNull();
  });
});

describe("sortKeywordsForDashboard", () => {
  test("ranked first by position, then outside the scan, then not measured", () => {
    const sorted = sortKeywordsForDashboard([
      keyword("never", { measuredAt: null }),
      keyword("outside"),
      keyword("fifth", { position: 5 }),
      keyword("first", { position: 1 }),
    ]);
    expect(sorted.map((k) => k.keyword)).toEqual([
      "first",
      "fifth",
      "outside",
      "never",
    ]);
  });
});

describe("defaultChartKeywords", () => {
  test("keeps only keywords that ranked at least once, best first", () => {
    const picked = defaultChartKeywords([
      keyword("never ranked"),
      keyword("ranked before", {
        rankTrend: [
          { day: "2026-11-01", position: 30 },
          { day: "2026-11-02", position: null },
        ],
      }),
      keyword("ranked now", { position: 2 }),
    ]);
    expect(picked).toEqual(["ranked now", "ranked before"]);
  });

  test("caps the chart at the readable maximum", () => {
    const many = Array.from({ length: MAX_CHART_KEYWORDS + 4 }, (_, i) =>
      keyword(`kw-${i}`, { position: i + 1 }),
    );
    expect(defaultChartKeywords(many)).toHaveLength(MAX_CHART_KEYWORDS);
  });
});

describe("toggleChartKeyword", () => {
  test("removes a keyword that is on the chart", () => {
    expect(toggleChartKeyword(["a", "b"], "a")).toEqual(["b"]);
  });

  test("adds a keyword while there is room", () => {
    expect(toggleChartKeyword(["a"], "b")).toEqual(["a", "b"]);
  });

  test("ignores an addition when the chart is full", () => {
    const full = ["a", "b"];
    expect(toggleChartKeyword(full, "c", 2)).toBe(full);
  });
});

describe("boardToSnapshots", () => {
  test("keeps a measurement outside the scan as a gap, never a fake position", () => {
    const snapshots = boardToSnapshots(
      [
        keyword("quiz", {
          rankTrend: [
            { day: "2026-11-01", position: 4 },
            { day: "2026-11-02", position: null },
            { day: "2026-11-03", position: 6 },
          ],
        }),
      ],
      ["quiz"],
    );
    expect(snapshots.map((s) => s.position)).toEqual([4, null, 6]);
    expect(snapshots[0].createdAt).toBe("2026-11-01T12:00:00.000Z");
  });

  test("follows the selection order and skips unknown keywords", () => {
    const snapshots = boardToSnapshots(
      [
        keyword("a", { rankTrend: [{ day: "2026-11-01", position: 1 }] }),
        keyword("b", { rankTrend: [{ day: "2026-11-01", position: 2 }] }),
      ],
      ["b", "missing", "a"],
    );
    expect(snapshots.map((s) => s.keyword)).toEqual(["b", "a"]);
  });
});
