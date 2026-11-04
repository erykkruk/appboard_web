import type {
  TrackingMarketHistoryPoint,
  TrackingMarketsHistory,
} from "@/lib/types";

/** Market table columns that carry a trend. */
export type MarketMetric = "ranked" | "top10" | "top50" | "median";

export interface MarketMetricInfo {
  /** Stroke and swatch colour in the larger chart. */
  color: string;
  key: MarketMetric;
  label: string;
  /** A position, where #1 is the best value. */
  lowerIsBetter: boolean;
}

export const MARKET_METRICS: MarketMetricInfo[] = [
  { color: "#2563eb", key: "ranked", label: "Ranked", lowerIsBetter: false },
  { color: "#16a34a", key: "top10", label: "Top 10", lowerIsBetter: false },
  { color: "#d97706", key: "top50", label: "Top 50", lowerIsBetter: false },
  { color: "#7c3aed", key: "median", label: "Median", lowerIsBetter: true },
];

export const MARKET_METRIC_INFO: Record<MarketMetric, MarketMetricInfo> =
  Object.fromEntries(MARKET_METRICS.map((m) => [m.key, m])) as Record<
    MarketMetric,
    MarketMetricInfo
  >;

/** One calendar day of a market; `point` is null when nothing was measured. */
export interface MarketDay {
  day: string;
  point: TrackingMarketHistoryPoint | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** A history day has no time of day; noon keeps it on the same date everywhere. */
const DAY_TIME_SUFFIX = "T12:00:00.000Z";

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}${DAY_TIME_SUFFIX}`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/**
 * Every calendar day of one market from its first measured day to the end of
 * the window, with null for days nothing was measured. Starting at the first
 * measurement keeps a market tracked for three days from shrinking into the
 * last pixels of a 90-day sparkline; keeping the empty days inside the range
 * makes a missed check a gap instead of a line nobody measured.
 */
export function marketDays(
  history: TrackingMarketsHistory | undefined,
  country: string,
): MarketDay[] {
  const points =
    history?.markets.find((m) => m.country === country)?.points ?? [];
  if (!history || !points.length) return [];
  const byDay = new Map(points.map((p) => [p.day, p]));
  const days: MarketDay[] = [];
  for (let day = points[0].day; day <= history.to; day = addDays(day, 1)) {
    days.push({ day, point: byDay.get(day) ?? null });
  }
  return days;
}

/** One metric over the days, null where there is no value. */
export function metricValues(
  days: MarketDay[],
  metric: MarketMetric,
): Array<number | null> {
  return days.map((d) => (d.point ? d.point[metric] : null));
}

/** Enough points to draw a line (two known values). */
export function hasTrend(values: Array<number | null>): boolean {
  return values.filter((v) => v !== null).length >= 2;
}

/** "#12" for a position, the plain count otherwise; "-" when unknown. */
export function formatMetric(
  metric: MarketMetric,
  value: number | null,
): string {
  if (value === null) return "-";
  return MARKET_METRIC_INFO[metric].lowerIsBetter ? `#${value}` : `${value}`;
}

/** "3 Nov" in the reader's locale. */
export function formatHistoryDay(day: string): string {
  return new Date(`${day}${DAY_TIME_SUFFIX}`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** Up to `count` evenly spread indexes, always including the first and last. */
export function axisTickIndexes(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const steps = Math.max(1, Math.min(count, length) - 1);
  const ticks = new Set<number>();
  for (let i = 0; i <= steps; i++) {
    ticks.add(Math.round((i * (length - 1)) / steps));
  }
  return [...ticks];
}
