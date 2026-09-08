"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { BoardStats } from "@/lib/types";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

/** The five numbers that answer "how are we doing" without scrolling. */
export function BoardKpis({ stats }: { stats: BoardStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Kpi label="keywords tracked here" value={String(stats.tracked)} />
      <Kpi
        label={`ranking (of ${stats.tracked})`}
        value={String(stats.ranked)}
      />
      <Kpi label="in the top 10" value={String(stats.top10)} />
      <Kpi label="winnable targets" value={String(stats.picks)} />
      <Kpi
        label="best position so far"
        value={stats.bestPosition === null ? "-" : `#${stats.bestPosition}`}
      />
    </div>
  );
}
