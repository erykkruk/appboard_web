import type { BoardKeyword, RankSnapshot, TrackingMarket } from "@/lib/types";

/** More lines than this and the chart stops being readable. */
export const MAX_CHART_KEYWORDS = 8;

/** Markets shown on the dashboard before "All markets" is opened. */
export const DASHBOARD_MARKETS_PREVIEW = 8;

/**
 * A board day ("2026-11-03") has no time of day; noon keeps it on the same
 * calendar day in every time zone the panel is read from.
 */
const DAY_TIME_SUFFIX = "T12:00:00.000Z";

function byNullablePosition(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/** Strongest markets first: first-page keywords, then any ranking at all. */
export function sortMarketsForDashboard(
  markets: TrackingMarket[],
): TrackingMarket[] {
  return [...markets].sort(
    (a, b) =>
      b.top10 - a.top10 ||
      b.ranked - a.ranked ||
      byNullablePosition(a.bestPosition, b.bestPosition) ||
      a.country.localeCompare(b.country),
  );
}

/**
 * The market the dashboard opens on: the strongest one when anything ranks
 * anywhere, otherwise the app's home market, otherwise the first tracked one.
 */
export function pickDefaultMarket(
  markets: TrackingMarket[],
  homeCountry: string | null,
): string | null {
  if (!markets.length) return null;
  const strongest = sortMarketsForDashboard(markets)[0];
  if (strongest.top10 > 0 || strongest.ranked > 0) return strongest.country;
  const home = homeCountry?.toLowerCase();
  if (home && markets.some((m) => m.country === home)) return home;
  return strongest.country;
}

/** True once the store has shown the app for this keyword at least once. */
export function hasEverRanked(keyword: BoardKeyword): boolean {
  return (
    keyword.position !== null ||
    keyword.bestPosition !== null ||
    keyword.rankTrend.some((point) => point.position !== null)
  );
}

/**
 * Table order: ranked keywords by position, then the ones measured outside
 * the scanned depth, then the ones no check has reached yet.
 */
export function sortKeywordsForDashboard(
  keywords: BoardKeyword[],
): BoardKeyword[] {
  const bucket = (k: BoardKeyword) =>
    k.measuredAt === null ? 2 : k.position === null ? 1 : 0;
  return [...keywords].sort(
    (a, b) =>
      bucket(a) - bucket(b) ||
      byNullablePosition(a.position, b.position) ||
      byNullablePosition(a.bestPosition, b.bestPosition) ||
      a.keyword.localeCompare(b.keyword),
  );
}

/** Chart lines drawn before the user picks: keywords that ever ranked. */
export function defaultChartKeywords(
  keywords: BoardKeyword[],
  max: number = MAX_CHART_KEYWORDS,
): string[] {
  return sortKeywordsForDashboard(keywords.filter(hasEverRanked))
    .slice(0, max)
    .map((k) => k.keyword);
}

/** Adds or removes a chart line; a full chart ignores further additions. */
export function toggleChartKeyword(
  selected: string[],
  keyword: string,
  max: number = MAX_CHART_KEYWORDS,
): string[] {
  if (selected.includes(keyword)) return selected.filter((k) => k !== keyword);
  if (selected.length >= max) return selected;
  return [...selected, keyword];
}

/**
 * Board trends as chart snapshots, in selection order. A day measured outside
 * the scanned depth stays `null`, so the chart breaks the line there instead
 * of drawing a fake fall to the bottom.
 */
export function boardToSnapshots(
  keywords: BoardKeyword[],
  selected: string[],
): RankSnapshot[] {
  const byKeyword = new Map(keywords.map((k) => [k.keyword, k]));
  return selected.flatMap((name) => {
    const keyword = byKeyword.get(name);
    if (!keyword) return [];
    return keyword.rankTrend.map((point) => ({
      country: keyword.country,
      createdAt: `${point.day}${DAY_TIME_SUFFIX}`,
      id: `${keyword.country}|${keyword.keyword}|${point.day}`,
      keyword: keyword.keyword,
      platform: keyword.platform,
      position: point.position,
    }));
  });
}
