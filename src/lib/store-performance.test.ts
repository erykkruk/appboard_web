import { describe, expect, test } from "bun:test";

import {
  defaultReportMonth,
  formatConversion,
  monthLabel,
} from "@/lib/store-performance";
import type { StorePerformanceMonth } from "@/lib/types";

function month(id: string, withTraffic: boolean): StorePerformanceMonth {
  return {
    countries: null,
    files: { country: false, installs: false, trafficSource: withTraffic },
    installs: null,
    lastDay: null,
    month: id,
    traffic: withTraffic
      ? {
          campaigns: [],
          searchTermPlaceholders: [],
          searchTerms: [],
          sources: [],
          totals: { acquisitions: 1, conversionRate: 0.5, visitors: 2 },
        }
      : null,
  };
}

describe("store performance helpers", () => {
  test("labels months in English", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(monthLabel("2026-01")).toBe("January 2026");
    expect(monthLabel("bad")).toBe("bad");
  });

  test("formats conversion as a percentage with one decimal", () => {
    expect(formatConversion(509 / 590)).toBe("86.3%");
    expect(formatConversion(0)).toBe("0.0%");
    expect(formatConversion(null)).toBe("-");
  });

  test("opens on the newest month Play has data for", () => {
    expect(
      defaultReportMonth([month("2026-11", false), month("2026-10", true), month("2026-09", true)]),
    ).toBe("2026-10");
    expect(defaultReportMonth([month("2026-11", false)])).toBe("2026-11");
    expect(defaultReportMonth([])).toBeNull();
  });
});
