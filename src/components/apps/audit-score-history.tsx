"use client";

import { Sparkline } from "@/components/tracking/sparkline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuditHistory } from "@/hooks/use-audit";

function truncate(value: string | null, max = 120): string {
  if (!value) return "(empty)";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

/**
 * The score over time, next to what we changed since the previous measurement.
 * A single number cannot answer "is this listing getting better", and the
 * changes are the only honest explanation of a move: the audit re-measures on
 * a schedule, so the market moves between runs too.
 */
export function AuditScoreHistory({
  appId,
  country,
}: {
  appId: string;
  country: string;
}) {
  const history = useAuditHistory(appId, country);
  const points = history.data?.points ?? [];

  // One point is a fact, not a trend. Saying so beats drawing a flat line.
  if (points.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score over time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {points.length === 1
              ? "One measurement recorded so far. The next weekly run adds the second point and the trend starts here."
              : "The timeline starts with the next measurement of this listing."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = latest.storeScore - previous.storeScore;
  const changes = history.data?.changes ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Score over time</CardTitle>
        <p className="mt-1 text-muted-foreground text-xs">
          {points.length} measurements, {points[0].date.slice(0, 10)} to{" "}
          {latest.date.slice(0, 10)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-2xl tabular-nums">
            {latest.storeScore}
          </span>
          <Badge
            className={
              delta > 0
                ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                : delta < 0
                  ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                  : ""
            }
            variant="outline"
          >
            {delta > 0 ? "+" : ""}
            {delta} since {previous.date.slice(0, 10)}
          </Badge>
          <Sparkline
            height={26}
            lowerIsBetter={false}
            title="Store score over time"
            values={points.map((p) => p.storeScore)}
            width={120}
          />
        </div>

        <div className="space-y-2">
          <p className="font-medium text-sm">
            {changes.length
              ? `What you changed since ${previous.date.slice(0, 10)}`
              : `Nothing was changed in the listing since ${previous.date.slice(0, 10)}`}
          </p>
          {changes.length ? (
            <ul className="space-y-1.5 text-muted-foreground text-xs">
              {changes.map((change) => (
                <li key={`${change.date}-${change.field}-${change.language}`}>
                  <span className="text-foreground">{change.field}</span>
                  {change.language ? ` (${change.language})` : ""}:{" "}
                  <span className="line-through">
                    {truncate(change.oldValue, 60)}
                  </span>{" "}
                  {truncate(change.newValue, 60)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-xs">
              So any movement in the score came from the market, not from you.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
