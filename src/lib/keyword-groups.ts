import type { TrackedKeyword } from "@/lib/types";

export interface KeywordGroup {
  country: string;
  /** Keywords shown for the current filter. */
  keywords: TrackedKeyword[];
  /** Every keyword tracked in the market, whatever the filter. */
  total: number;
}

/**
 * Tracked keywords per market for the compact list. With a filter, a market
 * whose name or code matches keeps all its keywords; any other market keeps
 * only the matching keywords and drops out when none match.
 */
export function groupTrackedKeywords(
  keywords: TrackedKeyword[],
  countries: string[],
  query: string,
  labelFor: (country: string) => string,
): KeywordGroup[] {
  const q = query.trim().toLowerCase();
  return countries.flatMap((country) => {
    const all = keywords.filter((k) => k.country === country);
    if (!q) return [{ country, keywords: all, total: all.length }];
    const marketMatches =
      country.toLowerCase() === q || labelFor(country).toLowerCase().includes(q);
    const shown = marketMatches
      ? all
      : all.filter((k) => k.keyword.toLowerCase().includes(q));
    return shown.length ? [{ country, keywords: shown, total: all.length }] : [];
  });
}
