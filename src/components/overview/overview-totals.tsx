"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface OverviewTotalsProps {
  apps: number;
  reviewsUnanswered: number;
  trackedKeywords: number;
  /** Mean audit score across measured apps; null until at least one exists. */
  averageScore: number | null;
}

function TotalCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardContent className="px-5">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={cn("mt-1 font-bold text-2xl tracking-tight", tone)}>
          {value}
        </p>
        <p className="mt-1 text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function OverviewTotals({
  apps,
  reviewsUnanswered,
  trackedKeywords,
  averageScore,
}: OverviewTotalsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TotalCard
        label="Apps"
        value={String(apps)}
        hint="In this workspace"
      />
      <TotalCard
        label="Unanswered reviews"
        value={String(reviewsUnanswered)}
        hint={reviewsUnanswered > 0 ? "Waiting for a reply" : "All caught up"}
        tone={reviewsUnanswered > 0 ? "text-amber-500" : undefined}
      />
      <TotalCard
        label="Tracked keywords"
        value={String(trackedKeywords)}
        hint="Across all apps"
      />
      <TotalCard
        label="Average listing score"
        value={averageScore === null ? "not measured yet" : `${averageScore}/100`}
        hint={
          averageScore === null
            ? "Run an audit on any app"
            : "Mean of the latest audits"
        }
      />
    </div>
  );
}
