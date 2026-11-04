import { describe, expect, test } from "bun:test";

import {
  boardToSnapshots,
  DEFAULT_MARKET_SORT,
  defaultChartKeywords,
  earnedCounts,
  MAX_CHART_KEYWORDS,
  marketStrength,
  notRankedNow,
  nextMarketSort,
  pickDefaultMarket,
  singleHistoryDay,
  sortKeywordsForDashboard,
  sortMarketsForDashboard,
  sortMarketTable,
  toggleChartKeyword,
  unmeasuredKeywords,
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

describe("earnedCounts", () => {
  test("uses the median without the app's name when the server sends it", () => {
    const m = market("il", { earnedMedianPosition: null, medianPosition: 3, ranked: 1 });
    expect(earnedCounts(m).median).toBeNull();
  });

  test("falls back to the plain median on an older server", () => {
    expect(earnedCounts(market("pl", { medianPosition: 4 })).median).toBe(4);
  });
});

describe("marketStrength", () => {
  test("counts first-page keywords three times over keywords beyond the name", () => {
    expect(
      marketStrength(
        market("pl", { earnedRanked: 6, earnedTop10: 2, earnedTop50: 5, ranked: 7, top10: 3, top50: 6 }),
      ),
    ).toBe(2 * 3 + 5);
  });

  test("a market where only the brand ranks has no strength", () => {
    expect(
      marketStrength(
        market("cn", { earnedRanked: 0, earnedTop10: 0, earnedTop50: 0, ranked: 1, top10: 1, top50: 1 }),
      ),
    ).toBe(0);
  });

  test("falls back to the plain counts on an older server", () => {
    expect(marketStrength(market("pl", { ranked: 2, top10: 1, top50: 2 }))).toBe(5);
  });
});

describe("sortMarketsForDashboard", () => {
  test("orders by strength beyond the brand, not by the brand's #1", () => {
    const sorted = sortMarketsForDashboard([
      market("cn", { earnedRanked: 0, earnedTop10: 0, earnedTop50: 0, ranked: 1, top10: 1, top50: 1 }),
      market("pl", { earnedRanked: 4, earnedTop10: 1, earnedTop50: 4, ranked: 5, top10: 2, top50: 5 }),
      market("cz", { earnedRanked: 9, earnedTop10: 5, earnedTop50: 9, ranked: 10, top10: 6, top50: 10 }),
    ]);
    expect(sorted.map((m) => m.country)).toEqual(["cz", "pl", "cn"]);
  });

  test("breaks a tie with more rankings, then the home market", () => {
    const sorted = sortMarketsForDashboard(
      [
        market("de", { earnedRanked: 1, earnedTop10: 0, earnedTop50: 1 }),
        market("us", { earnedRanked: 1, earnedTop10: 0, earnedTop50: 1 }),
        market("fr", { earnedRanked: 3, earnedTop10: 0, earnedTop50: 1 }),
      ],
      "us",
    );
    expect(sorted.map((m) => m.country)).toEqual(["fr", "us", "de"]);
  });
});

describe("sortMarketTable", () => {
  const rows = [
    market("pl", { earnedRanked: 4, earnedTop10: 2, earnedTop50: 4, medianPosition: 8, tracked: 20 }),
    market("cz", { earnedRanked: 6, earnedTop10: 1, earnedTop50: 6, medianPosition: null, tracked: 12 }),
    market("us", { earnedRanked: 1, earnedTop10: 0, earnedTop50: 1, medianPosition: 30, tracked: 40 }),
  ];

  test("defaults to strength, strongest first", () => {
    // pl: 2 x 3 + 4 = 10, cz: 1 x 3 + 6 = 9, us: 1.
    expect(sortMarketTable(rows, DEFAULT_MARKET_SORT).map((m) => m.country)).toEqual([
      "pl",
      "cz",
      "us",
    ]);
  });

  test("sorts a column and keeps markets without a value last", () => {
    expect(
      sortMarketTable(rows, { direction: "asc", key: "median" }).map((m) => m.country),
    ).toEqual(["pl", "us", "cz"]);
    expect(
      sortMarketTable(rows, { direction: "desc", key: "median" }).map((m) => m.country),
    ).toEqual(["us", "pl", "cz"]);
    expect(
      sortMarketTable(rows, { direction: "desc", key: "tracked" }).map((m) => m.country),
    ).toEqual(["us", "pl", "cz"]);
  });

  test("flips the sorted column and starts a new one in its natural order", () => {
    expect(nextMarketSort(DEFAULT_MARKET_SORT, "strength")).toEqual({
      direction: "asc",
      key: "strength",
    });
    expect(nextMarketSort(DEFAULT_MARKET_SORT, "top10")).toEqual({
      direction: "desc",
      key: "top10",
    });
    expect(nextMarketSort(DEFAULT_MARKET_SORT, "median")).toEqual({
      direction: "asc",
      key: "median",
    });
  });
});

describe("pickDefaultMarket", () => {
  test("opens on the strongest market beyond the brand", () => {
    expect(
      pickDefaultMarket(
        [
          market("cn", { earnedRanked: 0, earnedTop10: 0, earnedTop50: 0, ranked: 1, top10: 1 }),
          market("pl", { earnedRanked: 3, earnedTop10: 1, earnedTop50: 3, ranked: 4, top10: 2 }),
        ],
        "us",
      ),
    ).toBe("pl");
  });

  test("opens on the home market when only the brand ranks anywhere", () => {
    expect(
      pickDefaultMarket(
        [
          market("cn", { earnedRanked: 0, earnedTop10: 0, earnedTop50: 0, ranked: 1, top10: 1 }),
          market("us", { earnedRanked: 0, earnedTop10: 0, earnedTop50: 0, ranked: 1, top10: 1 }),
        ],
        "us",
      ),
    ).toBe("us");
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
  test("opens on the most searched keywords, ranked or not", () => {
    const picked = defaultChartKeywords([
      keyword("rare", { popularity: 12, position: 1 }),
      keyword("popular, not ranked", { popularity: 58 }),
      keyword("middle", { popularity: 31, position: 20 }),
      keyword("unscored"),
    ]);
    expect(picked).toEqual(["popular, not ranked", "middle", "rare", "unscored"]);
  });

  test("without scores keeps ranked keywords first, then the tracker order", () => {
    const picked = defaultChartKeywords([
      keyword("b never"),
      keyword("a never"),
      keyword("ranked before", {
        rankTrend: [
          { day: "2026-11-01", position: 30 },
          { day: "2026-11-02", position: null },
        ],
      }),
    ]);
    expect(picked).toEqual(["ranked before", "b never", "a never"]);
  });

  test("opens on the starred keywords when the market has any", () => {
    const picked = defaultChartKeywords([
      keyword("popular", { popularity: 80 }),
      keyword("ours, less searched", { popularity: 10, starred: true }),
      keyword("ours", { popularity: 40, starred: true }),
    ]);
    expect(picked).toEqual(["ours", "ours, less searched"]);
  });

  test("caps starred keywords at twenty too", () => {
    const many = Array.from({ length: MAX_CHART_KEYWORDS + 3 }, (_, i) =>
      keyword(`star-${i}`, { popularity: i, starred: true }),
    );
    expect(defaultChartKeywords([keyword("other", { popularity: 99 }), ...many])).toHaveLength(
      MAX_CHART_KEYWORDS,
    );
  });

  test("caps the chart at twenty keywords", () => {
    expect(MAX_CHART_KEYWORDS).toBe(20);
    const many = Array.from({ length: MAX_CHART_KEYWORDS + 4 }, (_, i) =>
      keyword(`kw-${i}`, { popularity: i }),
    );
    const picked = defaultChartKeywords(many);
    expect(picked).toHaveLength(MAX_CHART_KEYWORDS);
    expect(picked[0]).toBe(`kw-${MAX_CHART_KEYWORDS + 3}`);
  });
});

describe("unmeasuredKeywords", () => {
  test("lists chart keywords that no check has reached yet", () => {
    const keywords = [
      keyword("measured", { rankTrend: [{ day: "2026-11-03", position: null }] }),
      keyword("never", { measuredAt: null }),
    ];
    expect(unmeasuredKeywords(keywords, ["measured", "never"])).toEqual(["never"]);
  });
});

describe("notRankedNow", () => {
  test("names chart keywords missing from the results at the last check", () => {
    const keywords = [
      keyword("out", { position: null, rankTrend: [{ day: "2026-11-03", position: null }] }),
      keyword("in", { position: 4, rankTrend: [{ day: "2026-11-03", position: 4 }] }),
      keyword("never", { measuredAt: null }),
    ];
    expect(notRankedNow(keywords, ["out", "in", "never"])).toEqual(["out"]);
  });
});

describe("singleHistoryDay", () => {
  test("returns the day when every keyword has one measured day", () => {
    expect(
      singleHistoryDay([
        keyword("a", { rankTrend: [{ day: "2026-11-03", position: 3 }] }),
        keyword("b", { rankTrend: [{ day: "2026-11-03", position: null }] }),
        keyword("c"),
      ]),
    ).toBe("2026-11-03");
  });

  test("returns null once a second day exists, or before any check", () => {
    expect(
      singleHistoryDay([
        keyword("a", {
          rankTrend: [
            { day: "2026-11-02", position: 4 },
            { day: "2026-11-03", position: 3 },
          ],
        }),
      ]),
    ).toBeNull();
    expect(singleHistoryDay([keyword("a")])).toBeNull();
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
