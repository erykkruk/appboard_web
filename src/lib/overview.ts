import type { OverviewAppRow } from "@/lib/types";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

/**
 * Compact "4d ago" for the sync column. `now` is injectable so the value is
 * deterministic in tests; the page just uses the wall clock.
 */
export function formatRelativeTime(
  iso: string | null,
  now: number = Date.now(),
): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const elapsed = Math.max(0, now - then);
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  if (elapsed < MONTH_MS) return `${Math.floor(elapsed / DAY_MS)}d ago`;
  if (elapsed < YEAR_MS) return `${Math.floor(elapsed / MONTH_MS)}mo ago`;
  return `${Math.floor(elapsed / YEAR_MS)}y ago`;
}

/** Apps with work waiting (unanswered reviews) float to the top. */
export function sortOverviewApps(rows: OverviewAppRow[]): OverviewAppRow[] {
  return [...rows].sort(
    (a, b) =>
      b.reviewsUnanswered - a.reviewsUnanswered || a.name.localeCompare(b.name),
  );
}

/** Mean audit score across apps that have one; null when nothing is measured. */
export function averageListingScore(rows: OverviewAppRow[]): number | null {
  const scores = rows
    .map((row) => row.auditScore)
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return null;
  const sum = scores.reduce((total, score) => total + score, 0);
  return Math.round(sum / scores.length);
}

/** Thousands are abbreviated so the ratings column stays narrow. */
export function formatCompactCount(value: number): string {
  if (value < 1_000) return String(value);
  if (value < 1_000_000) {
    return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  }
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
