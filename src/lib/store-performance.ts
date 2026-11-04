import type { StorePerformanceMonth } from "@/lib/types";

/** Months the page asks for: the current one and the five before it. */
export const STORE_PERFORMANCE_MONTHS = 6;

/** Where the bucket id is shown in Play Console, used in every hint. */
export const PLAY_REPORTS_BUCKET_HINT =
  'Play Console > Download reports > Statistics > "Copy Cloud Storage URI"';

export const PLAY_BULK_REPORTS_PERMISSION =
  "View app information and download bulk reports (read-only)";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

/** "2026-10" -> "October 2026". */
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return MONTH_FORMAT.format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

/** 0.8627 -> "86.3%", null -> "-". */
export function formatConversion(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return "-";
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * The month the page opens on: the newest one Play has written a traffic
 * report for. Early in a month the current one is often still empty.
 */
export function defaultReportMonth(months: StorePerformanceMonth[]): string | null {
  return months.find((m) => m.traffic !== null)?.month ?? months[0]?.month ?? null;
}
