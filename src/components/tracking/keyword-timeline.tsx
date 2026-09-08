"use client";

import { KeywordRankChart } from "@/components/tracking/keyword-rank-chart";
import { Card, CardContent } from "@/components/ui/card";
import type { BoardChange, BoardKeyword } from "@/lib/types";

/**
 * One small chart per keyword instead of twenty lines in one frame. Twenty
 * tracked terms on a single axis is a colour puzzle, not a read - and the
 * question here is always about one phrase at a time.
 */
export function KeywordTimeline({
  changes,
  keywords,
}: {
  changes: BoardChange[];
  keywords: BoardKeyword[];
}) {
  // Terms the store has never shown us for have a flat, empty chart; the
  // ones we ranked for at some point are the ones worth the space.
  const withHistory = keywords
    .filter((k) => k.rankTrend.some((p) => p.position !== null))
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  if (!withHistory.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No keyword has placed in the scanned results yet, so there is no line to
        draw. Positions are measured twice a day.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {withHistory.map((keyword) => (
        <Card key={keyword.keyword}>
          <CardContent className="space-y-1 p-4">
            <p className="text-sm font-medium">{keyword.keyword}</p>
            <p className="text-xs text-muted-foreground">
              {keyword.position === null
                ? "now outside the scan"
                : `now #${keyword.position}`}
              {keyword.bestPosition === null
                ? ""
                : ` · best #${keyword.bestPosition}`}
            </p>
            <KeywordRankChart changes={changes} points={keyword.rankTrend} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
