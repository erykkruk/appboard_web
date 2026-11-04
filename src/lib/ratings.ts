import type {
  RatingStoreType,
  RatingsSummary,
  StoreRatingSummary,
} from "@/lib/types";

export const RATING_STORE_LABELS: Record<RatingStoreType, string> = {
  app_store: "App Store",
  google_play: "Google Play",
};

export function storeLabel(storeType: string): string {
  return RATING_STORE_LABELS[storeType as RatingStoreType] ?? storeType;
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/** "4.8" (one decimal, as the stores show it), or "-" with no ratings. */
export function formatAverage(average: number | null): string {
  return average === null ? "-" : average.toFixed(1);
}

/** "App Store 4.8 from 57 ratings, 6 reviews". */
export function storeSummaryLine(store: StoreRatingSummary): string {
  const label = storeLabel(store.storeType);
  const reviews = plural(store.writtenReviews, "review", "reviews");
  if (store.ratingCount === 0) return `${label}: no ratings yet, ${reviews}`;
  return `${label} ${formatAverage(store.average)} from ${plural(store.ratingCount, "rating", "ratings")}, ${reviews}`;
}

const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

/** "Poland" for "pl"; the upper-case code when the runtime has no name. */
export function countryName(country: string): string {
  const code = country.toUpperCase();
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

export interface CountryRatingRow {
  country: string;
  storeType: RatingStoreType;
  average: number | null;
  ratingCount: number;
  writtenReviews: number;
}

/** One row per store and country, most ratings first. */
export function countryRatingRows(summary: RatingsSummary): CountryRatingRow[] {
  return summary.stores
    .flatMap((store) =>
      store.countries.map((c) => ({
        average: c.average,
        country: c.country,
        ratingCount: c.ratingCount,
        storeType: store.storeType,
        writtenReviews: c.writtenReviews,
      })),
    )
    .sort(
      (a, b) =>
        b.ratingCount - a.ratingCount ||
        a.country.localeCompare(b.country) ||
        a.storeType.localeCompare(b.storeType),
    );
}
