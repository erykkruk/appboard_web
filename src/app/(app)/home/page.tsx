"use client";

import Link from "next/link";
import { AlertCircle, Download, RefreshCw } from "lucide-react";
import { useMemo } from "react";

import { OverviewAppsTable } from "@/components/overview/overview-apps-table";
import { OverviewTotals } from "@/components/overview/overview-totals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { averageListingScore, sortOverviewApps } from "@/lib/overview";

const TOTAL_CARD_COUNT = 4;
const SKELETON_ROW_COUNT = 4;

function OverviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: TOTAL_CARD_COUNT }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * Every app in the workspace on one screen, sorted so the apps with reviews
 * waiting for a reply come first. Downloads are deliberately absent until a
 * sales API is wired: an empty chart would read as "zero installs".
 */
export default function HomePage() {
  const overview = useOverview();

  const rows = useMemo(
    () => sortOverviewApps(overview.data?.apps ?? []),
    [overview.data?.apps],
  );
  const averageScore = useMemo(() => averageListingScore(rows), [rows]);

  if (overview.isLoading) return <OverviewSkeleton />;

  if (overview.isError || !overview.data) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm">
              Could not load the workspace overview.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => overview.refetch()}
              disabled={overview.isFetching}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { totals } = overview.data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-bold text-xl tracking-tight">All apps at a glance</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Listing scores, reviews and keyword positions for every app in the
          workspace. Open an app for the details.
        </p>
      </div>

      {!totals.downloadsAvailable && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-muted-foreground text-xs">
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>
            Downloads are not connected yet. Connect the store API on{" "}
            <Link
              href="/settings"
              className="text-foreground underline underline-offset-4"
            >
              Settings
            </Link>{" "}
            to see installs.
          </span>
        </div>
      )}

      <OverviewTotals
        apps={totals.apps}
        reviewsUnanswered={totals.reviewsUnanswered}
        trackedKeywords={totals.trackedKeywords}
        averageScore={averageScore}
      />

      <Card className="py-2">
        <CardContent className="px-2">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-muted-foreground text-sm">
              No apps yet.{" "}
              <Link
                href="/start"
                className="text-primary underline underline-offset-4"
              >
                Add your first app
              </Link>{" "}
              from a store link.
            </p>
          ) : (
            <OverviewAppsTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
