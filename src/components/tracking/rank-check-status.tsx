"use client";

import { Progress } from "@/components/ui/progress";
import { marketLabel } from "@/lib/markets";
import { deferredReason, isDeferredRun } from "@/lib/rank-schedule";
import type { RankCheckRun } from "@/lib/types";

/** Failures listed under a finished run; the rest is a count. */
const MAX_LISTED_FAILURES = 10;

/**
 * Where the current (or last) rank check is. Lookups are spaced a few seconds
 * apart per store, so a large check is visible here as it goes. A lookup the
 * store refused is shown as "could not measure", never as a lost ranking.
 */
export function RankCheckStatus({ run }: { run: RankCheckRun | null }) {
  if (!run) return null;

  if (run.status === "running") {
    return (
      <div className="space-y-1" role="status">
        <p className="text-sm">
          Measuring positions: {run.checked} of {run.total} keywords
          {run.failed ? `, ${run.failed} could not be measured so far` : ""}
        </p>
        <Progress
          aria-label="Rank check progress"
          value={Math.round(run.progress * 100)}
        />
      </div>
    );
  }

  if (isDeferredRun(run)) {
    const reason = deferredReason(run).replace(/\.$/, "");
    return (
      <p className="text-sm text-muted-foreground" role="status">
        The last rank check was deferred{reason ? `: ${reason}` : ""}. Positions
        from earlier checks are kept.
      </p>
    );
  }

  if (run.status === "failed" || run.status === "interrupted") {
    return (
      <p className="text-sm text-amber-600" role="status">
        The last rank check stopped early ({run.checked} of {run.total}{" "}
        keywords): {run.error ?? "unknown error"}. Positions measured before it
        stopped are kept.
      </p>
    );
  }

  if (!run.failed) return null;

  return (
    <div className="space-y-1 text-sm" role="status">
      <p className="text-amber-600">
        {run.failed} of {run.total} keywords could not be measured in the last
        check (the store refused the lookup). They keep their previous position
        and are measured again in the next check.
      </p>
      <ul className="list-inside list-disc text-xs text-muted-foreground">
        {run.failures.slice(0, MAX_LISTED_FAILURES).map((f) => (
          <li key={`${f.country}|${f.keyword}`}>
            {f.keyword} ({marketLabel(f.country)}):{" "}
            {f.status ? `HTTP ${f.status}` : f.error}
          </li>
        ))}
        {run.failed > MAX_LISTED_FAILURES && (
          <li>and {run.failed - MAX_LISTED_FAILURES} more</li>
        )}
      </ul>
    </div>
  );
}
