import { describe, expect, test } from "bun:test";

import {
  compareByDownloads,
  formatEstimateRange,
  keywordDownloadsCells,
  keywordDownloadsHeaderTitle,
  keywordDownloadsSummary,
  shortMonth,
} from "@/lib/keyword-downloads";
import type {
  BoardKeyword,
  KeywordDownloadsReport,
  KeywordDownloadsRow,
  PlayDownloadsSummary,
} from "@/lib/types";

function boardKeyword(keyword: string, overrides: Partial<BoardKeyword> = {}): BoardKeyword {
  return {
    bestPosition: null,
    classification: null,
    country: "pl",
    delta: null,
    difficulty: null,
    difficultyDelta: null,
    difficultyLabel: null,
    keyword,
    keywordId: `id-${keyword}`,
    leader: null,
    measuredAt: "2026-11-04",
    metadataFields: [],
    opportunity: null,
    pick: false,
    platform: "appstore",
    popularity: null,
    position: null,
    previousPosition: null,
    rankTrend: [],
    scoreTrend: [],
    scoredAt: "2026-11-04",
    starred: false,
    ...overrides,
  };
}

const PLAY_OK: PlayDownloadsSummary = {
  currentMonth: {
    available: true,
    lastDay: "2026-11-02",
    month: "2026-11",
    searchInstalls: 15,
    searchVisitors: 20,
  },
  fetchedAt: "2026-11-04T09:00:00.000Z",
  latestMonth: {
    available: true,
    lastDay: "2026-10-31",
    month: "2026-10",
    searchInstalls: 509,
    searchVisitors: 590,
  },
  message: null,
  scope: "all_countries",
  status: "ok",
  tvOnly: false,
};

function playReport(
  rows: KeywordDownloadsRow[],
  play: Partial<PlayDownloadsSummary> = {},
): KeywordDownloadsReport {
  return {
    country: "pl",
    estimate: null,
    keywords: rows,
    message: null,
    platform: "android",
    play: { ...PLAY_OK, ...play },
    source: "google_play_report",
  };
}

const PLAY_ROWS: KeywordDownloadsRow[] = [
  {
    estimate: null,
    keyword: "buzzin",
    play: {
      currentMonth: { acquisitions: 12, visitors: 15 },
      latestMonth: { acquisitions: 509, visitors: 590 },
      terms: ["buzzin"],
    },
  },
  {
    estimate: null,
    keyword: "glowka pracuje",
    play: {
      currentMonth: { acquisitions: 3, visitors: 5 },
      latestMonth: null,
      terms: ["glowka pracuje", "główka pracuje"],
    },
  },
  {
    estimate: null,
    keyword: "quiz na tv",
    play: { currentMonth: null, latestMonth: null, terms: [] },
  },
];

const ESTIMATE_REPORT: KeywordDownloadsReport = {
  country: "pl",
  estimate: {
    daysPerMonth: 30,
    perDay: { high: 0.47, low: 0.12 },
    perMonth: { high: 14.1, low: 3.6 },
    ranked: 2,
    scored: 3,
  },
  keywords: [
    {
      estimate: {
        beyondModel: false,
        perDay: { high: 0.29, low: 0.07 },
        perMonth: { high: 8.7, low: 2.1 },
        popularity: 42,
        position: 1,
        scoredAt: "2026-11-04",
      },
      keyword: "buzzin",
      play: null,
    },
    {
      estimate: {
        beyondModel: true,
        perDay: { high: 0, low: 0 },
        perMonth: { high: 0, low: 0 },
        popularity: 30,
        position: 37,
        scoredAt: "2026-11-04",
      },
      keyword: "kalambury",
      play: null,
    },
    { estimate: null, keyword: "domowka", play: null },
    { estimate: null, keyword: "gry", play: null },
  ],
  message: null,
  platform: "ios",
  play: null,
  source: "app_store_estimate",
};

describe("formatEstimateRange", () => {
  test("rounds, keeps sub-one values honest and collapses equal ends", () => {
    expect(formatEstimateRange({ high: 8.7, low: 2.1 })).toBe("2-9");
    expect(formatEstimateRange({ high: 0.4, low: 0.1 })).toBe("<1");
    expect(formatEstimateRange({ high: 3.2, low: 0.6 })).toBe("<1-3");
    expect(formatEstimateRange({ high: 3.2, low: 2.9 })).toBe("~3");
    expect(formatEstimateRange({ high: 2400, low: 1200 })).toBe("1,200-2,400");
  });

  test("short month labels are English", () => {
    expect(shortMonth("2026-10")).toBe("Oct");
  });
});

describe("Google Play cells", () => {
  const keywords = [
    boardKeyword("buzzin", { platform: "playstore" }),
    boardKeyword("glowka pracuje", { platform: "playstore" }),
    boardKeyword("quiz na tv", { platform: "playstore" }),
    boardKeyword("old phrase", { keywordId: null, platform: "playstore" }),
  ];
  const cells = keywordDownloadsCells(playReport(PLAY_ROWS), keywords);

  test("shows the latest full month's real installs with month and source in the tooltip", () => {
    const cell = cells.get("buzzin");
    expect(cell?.kind).toBe("real");
    expect(cell?.label).toBe("509 in Oct");
    expect(cell?.sortValue).toBe(509);
    expect(cell?.title).toContain("October 2026: 509 installs from 590 store listing visitors.");
    expect(cell?.title).toContain("November 2026 to Nov 2: 12 installs");
    expect(cell?.title).toContain("all countries");
  });

  test("falls back to the month to date and lists merged spellings", () => {
    const cell = cells.get("glowka pracuje");
    expect(cell?.label).toBe("3 in Nov so far");
    expect(cell?.title).toContain("October 2026: not in the report.");
    expect(cell?.title).toContain("glowka pracuje, główka pracuje");
  });

  test("a term Play did not report is a dash, not zero", () => {
    const cell = cells.get("quiz na tv");
    expect(cell).toMatchObject({ kind: "none", label: "-", sortValue: null });
    expect(cell?.title).toContain("Not in Play's search term report for October 2026 or November 2026");
    expect(cell?.title).toContain("small volumes");
  });

  test("a phrase that is no longer tracked says so", () => {
    expect(cells.get("old phrase")?.title).toBe("Not tracked in this market any more.");
  });

  test("a bucket problem shows the fix instead of numbers", () => {
    const report = playReport([], {
      currentMonth: null,
      latestMonth: null,
      message: "Add the Play reports bucket to this Google Play connection.",
      status: "bucket_missing",
    });
    report.keywords = [{ estimate: null, keyword: "buzzin", play: null }];
    const cell = keywordDownloadsCells(report, [boardKeyword("buzzin")]).get("buzzin");
    expect(cell?.label).toBe("-");
    expect(cell?.title).toContain("Play reports bucket");
    expect(keywordDownloadsSummary(report)).toContain("Play reports bucket");
  });

  test("TV-only packages explain why there is nothing per term", () => {
    const report = playReport(PLAY_ROWS, { tvOnly: true });
    expect(keywordDownloadsCells(report, keywords).get("buzzin")?.label).toBe("-");
    expect(keywordDownloadsSummary(report)).toContain("Android TV");
  });

  test("the total line names both months and the source", () => {
    expect(keywordDownloadsSummary(playReport(PLAY_ROWS))).toBe(
      "Search installs: 509 in October 2026, 15 in November 2026 to Nov 2 (Google Play report, all countries, every search term).",
    );
  });

  test("sorts by installs, keywords without a number last", () => {
    const sorted = [...keywords].sort(compareByDownloads(cells)).map((k) => k.keyword);
    expect(sorted).toEqual(["buzzin", "glowka pracuje", "old phrase", "quiz na tv"]);
  });
});

describe("App Store estimate cells", () => {
  const keywords = [
    boardKeyword("buzzin", { popularity: 42, position: 1 }),
    boardKeyword("kalambury", { popularity: 30, position: 37 }),
    boardKeyword("domowka", { position: null }),
    boardKeyword("gry", { position: 4, scoredAt: null }),
  ];
  const cells = keywordDownloadsCells(ESTIMATE_REPORT, keywords);

  test("labels the range per month as an estimate and explains the model", () => {
    const cell = cells.get("buzzin");
    expect(cell?.kind).toBe("estimate");
    expect(cell?.label).toBe("est. 2-9/mo");
    expect(cell?.title).toContain("Popularity 42 at position #1");
    expect(cell?.title).toContain("not Apple data");
    expect(cell?.title).toContain("<1 per day");
  });

  test("past the top 20 the estimate is zero, not a dash", () => {
    expect(cells.get("kalambury")).toMatchObject({ label: "est. 0/mo", sortValue: 0 });
  });

  test("no rank or no score is a dash with the reason", () => {
    expect(cells.get("domowka")?.label).toBe("-");
    expect(cells.get("domowka")?.title).toContain("not in the measured search results");
    expect(cells.get("gry")?.title).toContain("no score");
  });

  test("the total line is a per-month range marked as an estimate", () => {
    expect(keywordDownloadsSummary(ESTIMATE_REPORT)).toBe(
      "Estimated search downloads: 4-14/month from 2 ranked of 3 scored keywords (App Store estimate, not Apple data).",
    );
    expect(keywordDownloadsHeaderTitle(ESTIMATE_REPORT)).toContain("Estimated downloads per month");
  });

  test("sorts the estimate by the middle of its range", () => {
    const sorted = [...keywords].sort(compareByDownloads(cells)).map((k) => k.keyword);
    expect(sorted).toEqual(["buzzin", "kalambury", "domowka", "gry"]);
  });
});

describe("unsupported apps", () => {
  test("pass the server's reason through", () => {
    const report: KeywordDownloadsReport = {
      ...ESTIMATE_REPORT,
      estimate: null,
      keywords: [{ estimate: null, keyword: "buzzin", play: null }],
      message: "Apple publishes no Apple TV (tvOS) search results.",
      source: "unsupported",
    };
    expect(keywordDownloadsCells(report, [boardKeyword("buzzin")]).get("buzzin")?.title).toContain(
      "tvOS",
    );
    expect(keywordDownloadsSummary(report)).toContain("tvOS");
  });
});
