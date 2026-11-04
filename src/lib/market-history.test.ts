import { describe, expect, test } from "bun:test";

import {
  axisTickIndexes,
  formatMetric,
  hasTrend,
  marketDays,
  metricValues,
} from "@/lib/market-history";
import type { TrackingMarketHistoryPoint, TrackingMarketsHistory } from "@/lib/types";

function point(
  day: string,
  overrides: Partial<TrackingMarketHistoryPoint> = {},
): TrackingMarketHistoryPoint {
  return {
    day,
    measured: 5,
    median: 20,
    ranked: 3,
    top10: 1,
    top50: 3,
    tracked: 5,
    ...overrides,
  };
}

const HISTORY: TrackingMarketsHistory = {
  from: "2026-10-01",
  markets: [
    {
      country: "pl",
      points: [
        point("2026-11-01", { top10: 1 }),
        point("2026-11-02", { top10: 2 }),
        // 3 Nov: no check.
        point("2026-11-04", { median: null, top10: 4 }),
      ],
    },
    { country: "de", points: [] },
  ],
  timeZone: "Europe/Warsaw",
  to: "2026-11-05",
};

describe("marketDays", () => {
  test("runs from the first measured day to the end of the window", () => {
    const days = marketDays(HISTORY, "pl");
    expect(days.map((d) => d.day)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
    expect(days[2].point).toBeNull();
    expect(days[4].point).toBeNull();
    expect(days[1].point?.top10).toBe(2);
  });

  test("crosses month and clock-change boundaries one calendar day at a time", () => {
    const days = marketDays(
      {
        ...HISTORY,
        markets: [{ country: "us", points: [point("2026-10-24")] }],
        to: "2026-10-27",
      },
      "us",
    );
    expect(days.map((d) => d.day)).toEqual([
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
  });

  test("is empty for a market without measurements, an unknown market or no data", () => {
    expect(marketDays(HISTORY, "de")).toEqual([]);
    expect(marketDays(HISTORY, "fr")).toEqual([]);
    expect(marketDays(undefined, "pl")).toEqual([]);
  });
});

describe("metricValues and hasTrend", () => {
  test("keeps gaps as null so the line breaks there", () => {
    const days = marketDays(HISTORY, "pl");
    expect(metricValues(days, "top10")).toEqual([1, 2, null, 4, null]);
    expect(metricValues(days, "median")).toEqual([20, 20, null, null, null]);
    expect(hasTrend(metricValues(days, "top10"))).toBe(true);
    expect(hasTrend([null, 3, null])).toBe(false);
  });
});

describe("formatMetric", () => {
  test("positions get a hash, counts stay plain, unknown is a dash", () => {
    expect(formatMetric("median", 12.5)).toBe("#12.5");
    expect(formatMetric("top10", 0)).toBe("0");
    expect(formatMetric("median", null)).toBe("-");
  });
});

describe("axisTickIndexes", () => {
  test("spreads ticks and always includes both ends", () => {
    expect(axisTickIndexes(90, 4)).toEqual([0, 30, 59, 89]);
    expect(axisTickIndexes(2, 4)).toEqual([0, 1]);
    expect(axisTickIndexes(1, 4)).toEqual([0]);
    expect(axisTickIndexes(0, 4)).toEqual([]);
  });
});
