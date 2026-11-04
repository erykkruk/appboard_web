import { describe, expect, test } from "bun:test";

import {
  countryName,
  countryRatingRows,
  formatAverage,
  storeLabel,
  storeSummaryLine,
} from "@/lib/ratings";
import { GROUP_SUMMARY } from "@/test/ratings-fixtures";

describe("ratings helpers", () => {
  test("store line reads like the store does", () => {
    expect(storeSummaryLine(GROUP_SUMMARY.stores[0])).toBe(
      "App Store 4.7 from 32 ratings, 6 reviews",
    );
    expect(storeSummaryLine(GROUP_SUMMARY.stores[1])).toBe(
      "Google Play 4.5 from 73 ratings, 21 reviews",
    );
  });

  test("singular forms and a store without ratings", () => {
    expect(
      storeSummaryLine({
        ...GROUP_SUMMARY.stores[0],
        average: 5,
        ratingCount: 1,
        writtenReviews: 1,
      }),
    ).toBe("App Store 5.0 from 1 rating, 1 review");
    expect(
      storeSummaryLine({
        ...GROUP_SUMMARY.stores[0],
        average: null,
        ratingCount: 0,
        writtenReviews: 0,
      }),
    ).toBe("App Store: no ratings yet, 0 reviews");
  });

  test("formats averages and labels", () => {
    expect(formatAverage(null)).toBe("-");
    expect(formatAverage(4.656)).toBe("4.7");
    expect(storeLabel("google_play")).toBe("Google Play");
    expect(storeLabel("huawei_appgallery")).toBe("huawei_appgallery");
    expect(countryName("pl")).toBe("Poland");
    expect(countryName("us")).toBe("United States");
  });

  test("country rows: one per store and country, most ratings first", () => {
    const rows = countryRatingRows(GROUP_SUMMARY);
    expect(rows.map((r) => `${r.storeType}:${r.country}:${r.ratingCount}`)).toEqual([
      "google_play:pl:73",
      "app_store:pl:27",
      "app_store:us:5",
    ]);
  });
});
