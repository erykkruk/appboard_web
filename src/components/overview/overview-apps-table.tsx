"use client";

import Link from "next/link";
import { Link2, type LucideIcon, PlugZap } from "lucide-react";

import { StoreLogo } from "@/components/store-logo";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompactCount, formatRelativeTime } from "@/lib/overview";
import { cn } from "@/lib/utils";
import type { OverviewAppRow, Platform, StoreType } from "@/lib/types";

const PLATFORM_META: Record<Platform, { label: string; storeType: StoreType }> =
  {
    android: { label: "Google Play", storeType: "google_play" },
    ios: { label: "App Store", storeType: "app_store" },
  };

const CONNECTION_META: Record<
  OverviewAppRow["connectionMode"],
  { icon: LucideIcon; label: string }
> = {
  api: { icon: PlugZap, label: "API" },
  public: { icon: Link2, label: "Public link" },
};

const EMPTY = "-";

function AppCell({ row }: { row: OverviewAppRow }) {
  return (
    <Link
      href={`/apps/${row.id}/dashboard`}
      className="flex items-center gap-3 hover:underline underline-offset-4"
    >
      {row.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.iconUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground text-xs"
        >
          {row.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="max-w-[220px] truncate font-medium">{row.name}</span>
    </Link>
  );
}

/**
 * Audit score, with the draft score alongside when the unpublished listing
 * would land somewhere else. Direction is colored so a regression is visible
 * without reading the numbers.
 */
function ScoreCell({ row }: { row: OverviewAppRow }) {
  const { auditScore, draftScore } = row;
  const showDraft = draftScore !== null && draftScore !== auditScore;
  if (auditScore === null && !showDraft) return <>{EMPTY}</>;
  const improved = showDraft && (auditScore === null || draftScore > auditScore);
  return (
    <span className="tabular-nums">
      {auditScore ?? EMPTY}
      {showDraft && (
        <span
          className={cn(
            "ml-1",
            improved ? "text-emerald-500" : "text-amber-500",
          )}
        >
          {"-> "}
          {draftScore}
        </span>
      )}
    </span>
  );
}

function RatingCell({ row }: { row: OverviewAppRow }) {
  if (row.storeRating === null) return <>{EMPTY}</>;
  return (
    <span className="tabular-nums">
      {row.storeRating.toFixed(1)} stars
      {row.storeRatingsCount !== null && (
        <span className="ml-1 text-muted-foreground text-xs">
          ({formatCompactCount(row.storeRatingsCount)})
        </span>
      )}
    </span>
  );
}

function ReviewsCell({ row }: { row: OverviewAppRow }) {
  return (
    <span className="tabular-nums">
      {row.reviewsTotal}
      <span className="text-muted-foreground"> / </span>
      <span className={cn(row.reviewsUnanswered > 0 && "font-medium text-amber-500")}>
        {row.reviewsUnanswered}
      </span>
    </span>
  );
}

export function OverviewAppsTable({ rows }: { rows: OverviewAppRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>App</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Connection</TableHead>
          <TableHead className="text-right">Score</TableHead>
          <TableHead className="text-right">Rating</TableHead>
          <TableHead className="text-right">Reviews (total / unanswered)</TableHead>
          <TableHead className="text-right">Keywords</TableHead>
          <TableHead className="text-right">Avg position</TableHead>
          <TableHead className="text-right">Top 10</TableHead>
          <TableHead className="text-right">Last synced</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const platform = PLATFORM_META[row.platform];
          const connection = CONNECTION_META[row.connectionMode];
          const hasKeywords = row.trackedKeywords > 0;
          return (
            <TableRow key={row.id}>
              <TableCell>
                <AppCell row={row} />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="gap-1.5 font-normal">
                  <StoreLogo type={platform.storeType} className="h-3 w-3" />
                  {platform.label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="gap-1 font-normal text-muted-foreground"
                >
                  <connection.icon className="h-3 w-3" />
                  {connection.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <ScoreCell row={row} />
              </TableCell>
              <TableCell className="text-right">
                <RatingCell row={row} />
              </TableCell>
              <TableCell className="text-right">
                <ReviewsCell row={row} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.trackedKeywords}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {hasKeywords && row.avgPosition !== null
                  ? `#${Math.round(row.avgPosition)}`
                  : EMPTY}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {hasKeywords ? row.top10Count : EMPTY}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatRelativeTime(row.lastSyncedAt)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
