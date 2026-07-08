"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResearchHeuristics } from "@/lib/types";
import { cn } from "@/lib/utils";

const STARS_DESC = [5, 4, 3, 2, 1] as const;

function starBarClass(stars: number): string {
  if (stars >= 4) return "bg-emerald-500";
  if (stars === 3) return "bg-amber-500";
  return "bg-red-500";
}

export function ReportHeuristicsCard({
  heuristics,
}: {
  heuristics: ResearchHeuristics;
}) {
  if (heuristics.total === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Star distribution & issue categories (heuristic)</CardTitle>
        <CardDescription>
          {heuristics.negative}/{heuristics.total} fetched reviews are negative
          ({(heuristics.negativeShare * 100).toFixed(0)}%). Works without AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          {STARS_DESC.map((stars) => {
            const count = heuristics.byStars[stars] ?? 0;
            const pct = heuristics.total ? (count / heuristics.total) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-sm">
                <span className="w-8">{stars}★</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                  <div
                    className={cn("h-full", starBarClass(stars))}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
        {heuristics.buckets.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {heuristics.buckets.map((bucket) => (
              <div key={bucket.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{bucket.label}</span>
                  <Badge variant="outline">{bucket.count}</Badge>
                </div>
                {bucket.quotes.slice(0, 2).map((quote) => (
                  <p
                    key={quote}
                    className="truncate text-xs italic text-muted-foreground"
                  >
                    „{quote}”
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
