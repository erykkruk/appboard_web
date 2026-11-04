import type { RankCheckRun, TrackingSchedule } from "@/lib/types";

/**
 * Scheduled rank-check slots (local hours) when the backend does not say:
 * servers before 0.29.0 checked every app at 00:00 and 12:00. From 0.29.0
 * `schedule.rankCheckHours` depends on the app's store (Google Play: 00:00).
 */
export const DEFAULT_RANK_CHECK_HOURS: readonly number[] = [0, 12];

/** Prefix the backend puts on the error of a run it deferred (0.29.0). */
export const DEFERRED_RUN_PREFIX = "Deferred:";

const FREQUENCY_WORDS: Record<number, string> = {
  1: "once a day",
  2: "twice a day",
};

export function rankCheckHours(
  schedule: Pick<TrackingSchedule, "rankCheckHours"> | null | undefined,
): readonly number[] {
  const hours = schedule?.rankCheckHours;
  return hours?.length ? hours : DEFAULT_RANK_CHECK_HOURS;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** "00:00", "00:00 and 12:00", "00:00, 06:00 and 12:00". */
export function rankCheckTimesLabel(hours: readonly number[]): string {
  const times = hours.map(formatHour);
  if (times.length <= 1) return times[0] ?? "";
  return `${times.slice(0, -1).join(", ")} and ${times[times.length - 1]}`;
}

/** "00:00" or "00:00 / 12:00", for short hints. */
export function rankCheckSlotsLabel(hours: readonly number[]): string {
  return hours.map(formatHour).join(" / ");
}

/** "once a day", "twice a day", "3 times a day". */
export function rankCheckFrequencyLabel(hours: readonly number[]): string {
  return FREQUENCY_WORDS[hours.length] ?? `${hours.length} times a day`;
}

/**
 * A run the backend never started because the store was throttled by the
 * check before it. It ends as "interrupted" with a "Deferred:" error.
 */
export function isDeferredRun(
  run: Pick<RankCheckRun, "error" | "status">,
): boolean {
  return (
    run.status === "interrupted" &&
    (run.error ?? "").startsWith(DEFERRED_RUN_PREFIX)
  );
}

/** The backend's reason without the "Deferred:" prefix. */
export function deferredReason(run: Pick<RankCheckRun, "error">): string {
  return (run.error ?? "").slice(DEFERRED_RUN_PREFIX.length).trim();
}
