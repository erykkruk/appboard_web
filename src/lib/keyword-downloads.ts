import { formatCount, monthLabel } from "@/lib/store-performance";
import type {
  BoardKeyword,
  DownloadRange,
  KeywordDownloadsReport,
  KeywordDownloadsRow,
  PlayMonthTotals,
} from "@/lib/types";

/** Estimates below one download read as "<1", never as a fake 0 or 1. */
const SMALL_ESTIMATE = 1;
const NOT_AVAILABLE = "-";

const SHORT_MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});
const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const ESTIMATE_METHOD =
  "Estimate, not Apple data: Apple does not publish downloads per keyword. AppBoard models searches from the keyword's popularity and the market size, takes the share of searchers who tap the result at your position, and a 5-20% install rate, the same model as the keyword score download intervals.";
const PLAY_SCOPE =
  "Google Play Console report, all countries together (Play does not split search terms by country).";

export interface KeywordDownloadsCell {
  label: string;
  /** For sorting: installs, or the middle of the estimated range; null = no number. */
  sortValue: number | null;
  /** Tooltip: where the number comes from and for which period. */
  title: string;
  /** "estimate" renders muted, "real" as a normal number, "none" as a dash. */
  kind: "estimate" | "none" | "real";
}

/** "2026-10" -> "Oct". */
export function shortMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return SHORT_MONTH_FORMAT.format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function formatDay(day: string): string {
  return DAY_FORMAT.format(new Date(`${day}T12:00:00.000Z`));
}

function formatEstimateValue(value: number): string {
  return value < SMALL_ESTIMATE ? `<${SMALL_ESTIMATE}` : formatCount(Math.round(value));
}

/** { low: 2.1, high: 8.6 } -> "2-9"; both under one -> "<1"; equal after rounding -> "~3". */
export function formatEstimateRange(range: DownloadRange): string {
  if (range.high < SMALL_ESTIMATE) return `<${SMALL_ESTIMATE}`;
  const low = formatEstimateValue(range.low);
  const high = formatEstimateValue(range.high);
  return low === high ? `~${high}` : `${low}-${high}`;
}

function monthToDate(month: PlayMonthTotals): string {
  return month.lastDay
    ? `${monthLabel(month.month)} to ${formatDay(month.lastDay)}`
    : `${monthLabel(month.month)} so far`;
}

function playCell(
  row: KeywordDownloadsRow | undefined,
  report: KeywordDownloadsReport,
): KeywordDownloadsCell {
  const play = report.play;
  if (!play || play.status !== "ok") {
    return {
      kind: "none",
      label: NOT_AVAILABLE,
      sortValue: null,
      title: play?.message ?? "The Google Play report could not be read.",
    };
  }
  if (play.tvOnly) {
    return {
      kind: "none",
      label: NOT_AVAILABLE,
      sortValue: null,
      title:
        'Google Play reports all Android TV store traffic as "Other", without search terms.',
    };
  }
  const latest = play.latestMonth;
  const current = play.currentMonth;
  const latestFunnel = row?.play?.latestMonth ?? null;
  const currentFunnel = row?.play?.currentMonth ?? null;
  if (!latestFunnel && !currentFunnel) {
    const months = [latest, current]
      .filter((m): m is PlayMonthTotals => m !== null && m.available)
      .map((m) => monthLabel(m.month));
    return {
      kind: "none",
      label: NOT_AVAILABLE,
      sortValue: null,
      title: `Not in Play's search term report${months.length ? ` for ${months.join(" or ")}` : ""}. Play leaves out search terms with small volumes. ${PLAY_SCOPE}`,
    };
  }

  const parts: string[] = [];
  if (latest) {
    parts.push(
      latestFunnel
        ? `${monthLabel(latest.month)}: ${formatCount(latestFunnel.acquisitions)} installs from ${formatCount(latestFunnel.visitors)} store listing visitors.`
        : `${monthLabel(latest.month)}: not in the report.`,
    );
  }
  if (current?.available) {
    parts.push(
      currentFunnel
        ? `${monthToDate(current)}: ${formatCount(currentFunnel.acquisitions)} installs from ${formatCount(currentFunnel.visitors)} visitors.`
        : `${monthToDate(current)}: not in the report yet.`,
    );
  }
  const terms = row?.play?.terms ?? [];
  if (terms.length > 1) parts.push(`Play search terms: ${terms.join(", ")}.`);
  parts.push(PLAY_SCOPE);

  const shown =
    latestFunnel && latest
      ? { count: latestFunnel.acquisitions, month: shortMonth(latest.month), soFar: false }
      : {
          count: currentFunnel?.acquisitions ?? 0,
          month: current ? shortMonth(current.month) : "",
          soFar: true,
        };
  return {
    kind: "real",
    label: `${formatCount(shown.count)} in ${shown.month}${shown.soFar ? " so far" : ""}`,
    sortValue: shown.count,
    title: parts.join(" "),
  };
}

function estimateCell(
  row: KeywordDownloadsRow | undefined,
  keyword: BoardKeyword | undefined,
): KeywordDownloadsCell {
  const estimate = row?.estimate ?? null;
  if (!estimate) {
    const reason =
      keyword && keyword.scoredAt === null
        ? "No estimate yet: the keyword has no score (popularity) in this market."
        : keyword && keyword.measuredAt && keyword.position === null
          ? "No estimate: the app is not in the measured search results, so no search downloads are expected."
          : "No estimate: it needs both a keyword score and a measured position.";
    return { kind: "none", label: NOT_AVAILABLE, sortValue: null, title: reason };
  }
  const at = `Popularity ${estimate.popularity ?? "unknown"} at position #${estimate.position} (score of ${formatDay(estimate.scoredAt)}).`;
  if (estimate.beyondModel) {
    return {
      kind: "estimate",
      label: "est. 0/mo",
      sortValue: 0,
      title: `${at} The model covers positions 1-20 and expects close to no search downloads below that. ${ESTIMATE_METHOD}`,
    };
  }
  return {
    kind: "estimate",
    label: `est. ${formatEstimateRange(estimate.perMonth)}/mo`,
    sortValue: (estimate.perMonth.low + estimate.perMonth.high) / 2,
    title: `${at} About ${formatEstimateRange(estimate.perDay)} per day, ${formatEstimateRange(estimate.perMonth)} per 30 days. ${ESTIMATE_METHOD}`,
  };
}

/** One cell per keyword of the board, keyed by keyword. */
export function keywordDownloadsCells(
  report: KeywordDownloadsReport,
  keywords: readonly BoardKeyword[],
): Map<string, KeywordDownloadsCell> {
  const rows = new Map(report.keywords.map((row) => [row.keyword, row]));
  const cells = new Map<string, KeywordDownloadsCell>();
  for (const keyword of keywords) {
    const row = rows.get(keyword.keyword);
    if (!row && report.source !== "unsupported") {
      // The board keeps the history of phrases that are no longer tracked.
      cells.set(keyword.keyword, {
        kind: "none",
        label: NOT_AVAILABLE,
        sortValue: null,
        title: "Not tracked in this market any more.",
      });
    } else if (report.source === "google_play_report") {
      cells.set(keyword.keyword, playCell(row, report));
    } else if (report.source === "app_store_estimate") {
      cells.set(keyword.keyword, estimateCell(row, keyword));
    } else {
      cells.set(keyword.keyword, {
        kind: "none",
        label: NOT_AVAILABLE,
        sortValue: null,
        title: report.message ?? "Downloads per keyword are not available for this app.",
      });
    }
  }
  return cells;
}

/** Most downloads first; keywords without a number last, then A-Z. */
export function compareByDownloads(
  cells: ReadonlyMap<string, KeywordDownloadsCell>,
): (a: BoardKeyword, b: BoardKeyword) => number {
  return (a, b) => {
    const left = cells.get(a.keyword)?.sortValue ?? null;
    const right = cells.get(b.keyword)?.sortValue ?? null;
    if (left !== right) {
      if (left === null) return 1;
      if (right === null) return -1;
      return right - left;
    }
    return a.keyword.localeCompare(b.keyword);
  };
}

/** The line above the table: the market total and where it comes from. */
export function keywordDownloadsSummary(report: KeywordDownloadsReport): string | null {
  if (report.source === "unsupported") return report.message;
  if (report.source === "app_store_estimate") {
    const estimate = report.estimate;
    if (!estimate || estimate.scored === 0) {
      return "Estimated search downloads: not available until keywords in this market are scored (App Store estimate, not Apple data).";
    }
    return `Estimated search downloads: ${formatEstimateRange(estimate.perMonth)}/month from ${estimate.ranked} ranked of ${estimate.scored} scored keywords (App Store estimate, not Apple data).`;
  }
  const play = report.play;
  if (!play) return null;
  if (play.status !== "ok") {
    return `Search installs per keyword come from the Google Play report. ${play.message ?? ""}`.trim();
  }
  if (play.tvOnly) {
    return 'Google Play reports all Android TV store traffic as "Other", so there are no installs per search term for this app.';
  }
  const parts: string[] = [];
  if (play.latestMonth?.available && play.latestMonth.searchInstalls !== null) {
    parts.push(`${formatCount(play.latestMonth.searchInstalls)} in ${monthLabel(play.latestMonth.month)}`);
  }
  if (play.currentMonth?.available && play.currentMonth.searchInstalls !== null) {
    parts.push(`${formatCount(play.currentMonth.searchInstalls)} in ${monthToDate(play.currentMonth)}`);
  }
  if (!parts.length) {
    return "Search installs: Google Play has not written a report for these months yet.";
  }
  return `Search installs: ${parts.join(", ")} (Google Play report, all countries, every search term).`;
}

/** Column header tooltip. */
export function keywordDownloadsHeaderTitle(report: KeywordDownloadsReport): string {
  if (report.source === "google_play_report") {
    return `Installs from Google Play search for this term in the latest full month (or this month so far). ${PLAY_SCOPE} "-" = not in Play's report.`;
  }
  if (report.source === "app_store_estimate") {
    return `Estimated downloads per month at the current position. ${ESTIMATE_METHOD}`;
  }
  return report.message ?? "Downloads per keyword are not available for this app.";
}
