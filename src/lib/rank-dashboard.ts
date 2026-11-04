import { isStarred } from "@/lib/starred-keywords";
import type { BoardKeyword, RankSnapshot, TrackingMarket } from "@/lib/types";

/** The chart opens on the starred (else most searched) keywords, at most this many. */
export const MAX_CHART_KEYWORDS = 20;

/** Market rows shown on the dashboard before "All markets" is opened. */
export const DASHBOARD_MARKETS_PREVIEW = 10;

/** A first-page keyword is worth this many keywords ranked further down. */
const TOP10_WEIGHT = 3;

/** Market table columns the user can sort by. */
export type MarketSortKey =
  | "strength"
  | "country"
  | "tracked"
  | "ranked"
  | "top10"
  | "top50"
  | "median"
  | "change";

export interface MarketSort {
  key: MarketSortKey;
  /** "desc" = biggest first; for positions that means the worst first. */
  direction: "asc" | "desc";
}

export const DEFAULT_MARKET_SORT: MarketSort = {
  direction: "desc",
  key: "strength",
};

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

/**
 * Ranked counts that ignore the app's own name. A server older than 0.20.1
 * does not send them; the brand-inclusive counts are the closest stand-in.
 */
export function earnedCounts(market: TrackingMarket): {
  ranked: number;
  top10: number;
  top50: number;
} {
  return {
    ranked: market.earnedRanked ?? market.ranked,
    top10: market.earnedTop10 ?? market.top10,
    top50: market.earnedTop50 ?? market.top50,
  };
}

/**
 * How strong the app is in a market, over keywords that are not its own name:
 * first-page keywords count triple, anything else in the scanned results once.
 * "#1 for buzzin" in every country is not strength, it is the store matching
 * the name back.
 */
export function marketStrength(market: TrackingMarket): number {
  const earned = earnedCounts(market);
  return earned.top10 * TOP10_WEIGHT + earned.top50;
}

/** Net movement since each keyword's previous check (up minus down). */
export function marketChange(market: TrackingMarket): number {
  return market.improved + market.entered - market.declined - market.dropped;
}

/** Strongest markets first; ties go to more rankings, then the home market. */
export function sortMarketsForDashboard(
  markets: TrackingMarket[],
  homeCountry: string | null = null,
): TrackingMarket[] {
  const home = homeCountry?.toLowerCase() ?? null;
  return [...markets].sort(
    (a, b) =>
      marketStrength(b) - marketStrength(a) ||
      earnedCounts(b).ranked - earnedCounts(a).ranked ||
      b.ranked - a.ranked ||
      Number(b.country === home) - Number(a.country === home) ||
      byNullablePosition(a.bestPosition, b.bestPosition) ||
      a.country.localeCompare(b.country),
  );
}

function sortValue(market: TrackingMarket, key: MarketSortKey): number | null {
  switch (key) {
    case "strength":
      return marketStrength(market);
    case "tracked":
      return market.tracked;
    case "ranked":
      return earnedCounts(market).ranked;
    case "top10":
      return earnedCounts(market).top10;
    case "top50":
      return earnedCounts(market).top50;
    case "median":
      return market.medianPosition;
    case "change":
      return marketChange(market);
    case "country":
      return null;
  }
}

/**
 * The market table in the order the user picked. Strength keeps the
 * dashboard's own order (with its tie-breaks); a market without a value for
 * the column (no median yet) always goes last, whatever the direction.
 */
export function sortMarketTable(
  markets: TrackingMarket[],
  sort: MarketSort,
  homeCountry: string | null = null,
): TrackingMarket[] {
  const base = sortMarketsForDashboard(markets, homeCountry);
  if (sort.key === "strength") {
    return sort.direction === "desc" ? base : [...base].reverse();
  }
  const sign = sort.direction === "asc" ? 1 : -1;
  if (sort.key === "country") {
    return [...base].sort((a, b) => sign * a.country.localeCompare(b.country));
  }
  return [...base].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return sign * (va - vb);
  });
}

/** Clicking the sorted column flips it; a new column starts biggest first. */
export function nextMarketSort(current: MarketSort, key: MarketSortKey): MarketSort {
  if (current.key === key) {
    return { direction: current.direction === "desc" ? "asc" : "desc", key };
  }
  return { direction: key === "country" || key === "median" ? "asc" : "desc", key };
}

/**
 * The market the dashboard opens on: the top of the strength table when the
 * app ranks for anything beyond its name somewhere, otherwise the home
 * market, otherwise the market with any ranking, otherwise the first one.
 */
export function pickDefaultMarket(
  markets: TrackingMarket[],
  homeCountry: string | null,
): string | null {
  if (!markets.length) return null;
  const sorted = sortMarketsForDashboard(markets, homeCountry);
  const strongest = sorted[0];
  if (marketStrength(strongest) > 0 || earnedCounts(strongest).ranked > 0) {
    return strongest.country;
  }
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

/**
 * Chart lines drawn before the user picks: the market's starred keywords
 * when it has any, otherwise its most searched keywords. Popularity comes
 * from the stored scores; a keyword nobody scored yet sorts after the scored
 * ones, keywords that ever ranked before those that never did, and otherwise
 * the tracker's own order is kept.
 */
export function defaultChartKeywords(
  keywords: BoardKeyword[],
  max: number = MAX_CHART_KEYWORDS,
): string[] {
  const starred = keywords.filter(isStarred);
  return (starred.length ? starred : keywords)
    .map((k, index) => ({ index, k }))
    .sort(
      (a, b) =>
        (b.k.popularity ?? -1) - (a.k.popularity ?? -1) ||
        Number(hasEverRanked(b.k)) - Number(hasEverRanked(a.k)) ||
        a.index - b.index,
    )
    .slice(0, max)
    .map(({ k }) => k.keyword);
}

/** Keywords on the chart that no check has reached yet: no point to draw. */
export function unmeasuredKeywords(
  keywords: BoardKeyword[],
  selected: string[],
): string[] {
  const byKeyword = new Map(keywords.map((k) => [k.keyword, k]));
  return selected.filter((name) => {
    const keyword = byKeyword.get(name);
    return !keyword || keyword.rankTrend.length === 0;
  });
}

/**
 * Chart keywords the store did not show at their latest check. They all sit
 * on the same "not ranked" line, so the card names them instead.
 */
export function notRankedNow(keywords: BoardKeyword[], selected: string[]): string[] {
  const byKeyword = new Map(keywords.map((k) => [k.keyword, k]));
  return selected.filter((name) => {
    const keyword = byKeyword.get(name);
    return !!keyword && keyword.rankTrend.length > 0 && keyword.position === null;
  });
}

/**
 * The first measured day when the history has only that one day: positions
 * are kept per day, so no line can be drawn until a second day is measured.
 */
export function singleHistoryDay(keywords: BoardKeyword[]): string | null {
  const days = new Set(keywords.flatMap((k) => k.rankTrend.map((p) => p.day)));
  return days.size === 1 ? [...days][0] : null;
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
