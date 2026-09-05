import { describe, expect, test } from "bun:test";

import {
  averageListingScore,
  formatCompactCount,
  formatRelativeTime,
  sortOverviewApps,
} from "./overview";
import type { OverviewAppRow } from "./types";

function buildRow(overrides: Partial<OverviewAppRow> = {}): OverviewAppRow {
  return {
    id: "app-1",
    name: "Alpha",
    platform: "ios",
    iconUrl: null,
    connectionMode: "public",
    storeRating: null,
    storeRatingsCount: null,
    reviewsTotal: 0,
    reviewsUnanswered: 0,
    auditScore: null,
    draftScore: null,
    trackedKeywords: 0,
    avgPosition: null,
    top10Count: 0,
    lastSyncedAt: null,
    ...overrides,
  };
}

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-09-05T12:00:00Z");

  test("returns never for missing or invalid dates", () => {
    expect(formatRelativeTime(null, now)).toBe("never");
    expect(formatRelativeTime("not a date", now)).toBe("never");
  });

  test("picks the largest whole unit", () => {
    expect(formatRelativeTime("2026-09-05T11:59:40Z", now)).toBe("just now");
    expect(formatRelativeTime("2026-09-05T11:45:00Z", now)).toBe("15m ago");
    expect(formatRelativeTime("2026-09-05T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-09-01T12:00:00Z", now)).toBe("4d ago");
    expect(formatRelativeTime("2026-07-01T12:00:00Z", now)).toBe("2mo ago");
    expect(formatRelativeTime("2024-09-01T12:00:00Z", now)).toBe("2y ago");
  });
});

describe("sortOverviewApps", () => {
  test("orders by unanswered reviews desc, then name", () => {
    const rows = [
      buildRow({ id: "c", name: "Charlie", reviewsUnanswered: 0 }),
      buildRow({ id: "b", name: "Bravo", reviewsUnanswered: 3 }),
      buildRow({ id: "a", name: "Alpha", reviewsUnanswered: 0 }),
      buildRow({ id: "d", name: "Delta", reviewsUnanswered: 3 }),
    ];
    expect(sortOverviewApps(rows).map((row) => row.id)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });

  test("does not mutate the input", () => {
    const rows = [
      buildRow({ id: "a", reviewsUnanswered: 0 }),
      buildRow({ id: "b", reviewsUnanswered: 1 }),
    ];
    sortOverviewApps(rows);
    expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
  });
});

describe("averageListingScore", () => {
  test("ignores apps without a score", () => {
    expect(
      averageListingScore([
        buildRow({ auditScore: 80 }),
        buildRow({ auditScore: null }),
        buildRow({ auditScore: 61 }),
      ]),
    ).toBe(71);
  });

  test("returns null when nothing is measured", () => {
    expect(averageListingScore([buildRow(), buildRow()])).toBeNull();
    expect(averageListingScore([])).toBeNull();
  });
});

describe("formatCompactCount", () => {
  test("abbreviates thousands and millions", () => {
    expect(formatCompactCount(999)).toBe("999");
    expect(formatCompactCount(1_234)).toBe("1.2k");
    expect(formatCompactCount(12_345)).toBe("12k");
    expect(formatCompactCount(2_000_000)).toBe("2M");
  });
});
