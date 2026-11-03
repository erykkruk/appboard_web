"use client";

import { LineChart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DeltaBadge } from "@/components/tracking/delta-badge";
import { RankChart, SERIES_COLORS } from "@/components/tracking/rank-chart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTrackingBoard, useTrackingMarkets } from "@/hooks/use-tracking";
import { marketLabel } from "@/lib/markets";
import {
  boardToSnapshots,
  DASHBOARD_MARKETS_PREVIEW,
  defaultChartKeywords,
  MAX_CHART_KEYWORDS,
  pickDefaultMarket,
  sortKeywordsForDashboard,
  sortMarketsForDashboard,
  toggleChartKeyword,
} from "@/lib/rank-dashboard";
import { formatKeywordPosition } from "@/lib/research";
import type { BoardChange, RankAnnotation } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Keyword rows shown before "All keywords" is opened. */
const KEYWORD_ROWS_PREVIEW = 10;

const POSITION_TONE_CLASSES: Record<string, string> = {
  default: "",
  medium: "text-amber-500",
  muted: "text-muted-foreground",
  strong: "font-semibold text-emerald-500",
};

function toAnnotation(change: BoardChange): RankAnnotation {
  return {
    date: change.date,
    field: change.field,
    label: change.label,
    language: change.language,
    newValue: change.newValue,
    oldValue: change.oldValue,
    type: change.type,
  };
}

/**
 * Dashboard view of keyword positions: the markets ordered by strength, and
 * for the chosen market a positions-over-time chart of up to
 * MAX_CHART_KEYWORDS keywords next to their current position and change.
 * One board request per market keeps the cost at one market's keywords, not
 * every snapshot of every market.
 */
export function KeywordPositionsCard({
  appId,
  homeCountry,
}: {
  appId: string;
  homeCountry: string | null;
}) {
  const markets = useTrackingMarkets(appId);
  const [pickedCountry, setPickedCountry] = useState<string | null>(null);
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [picks, setPicks] = useState<Record<string, string[]>>({});

  const sortedMarkets = useMemo(
    () => sortMarketsForDashboard(markets.data?.markets ?? []),
    [markets.data?.markets],
  );
  const country =
    pickedCountry && sortedMarkets.some((m) => m.country === pickedCountry)
      ? pickedCountry
      : pickDefaultMarket(sortedMarkets, homeCountry);

  const board = useTrackingBoard(appId, country ?? undefined, {
    enabled: country !== null,
  });

  const keywords = useMemo(
    () => sortKeywordsForDashboard(board.data?.keywords ?? []),
    [board.data?.keywords],
  );
  const selected = useMemo<string[]>(
    () =>
      (country ? picks[country] : undefined) ??
      defaultChartKeywords(board.data?.keywords ?? []),
    [board.data?.keywords, country, picks],
  );
  const seriesColors = useMemo(
    () =>
      Object.fromEntries(
        selected.map((k, i) => [k, SERIES_COLORS[i % SERIES_COLORS.length]]),
      ),
    [selected],
  );
  const snapshots = useMemo(
    () => boardToSnapshots(board.data?.keywords ?? [], selected),
    [board.data?.keywords, selected],
  );

  // No tracking, no supported store or a failed read: the summary card
  // further down already explains the empty state.
  if (markets.isError || markets.data?.rankTracking.supported === false) {
    return null;
  }
  if (markets.isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (!country || !sortedMarkets.length) return null;

  const visibleMarkets = showAllMarkets
    ? sortedMarkets
    : sortedMarkets.slice(0, DASHBOARD_MARKETS_PREVIEW);
  const visibleKeywords = showAllKeywords
    ? keywords
    : keywords.slice(0, KEYWORD_ROWS_PREVIEW);
  const chartFull = selected.length >= MAX_CHART_KEYWORDS;
  const stats = board.data?.stats;

  function toggle(keyword: string) {
    if (!country) return;
    setPicks((current) => ({
      ...current,
      [country]: toggleChartKeyword(selected, keyword),
    }));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChart className="h-4 w-4" />
            Keyword positions
          </CardTitle>
          <CardDescription>
            {marketLabel(country)}
            {stats
              ? `: ${stats.ranked} of ${stats.tracked} keywords ranking, ${stats.top10} in the top 10`
              : ""}
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/apps/${appId}/research?tab=keywords&country=${country}`}>
            Open full tracker
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2" aria-label="Markets">
          {visibleMarkets.map((m) => (
            <Button
              key={m.country}
              aria-pressed={m.country === country}
              className="h-auto gap-1.5 py-1 text-xs"
              onClick={() => setPickedCountry(m.country)}
              size="sm"
              variant={m.country === country ? "default" : "outline"}
            >
              <span className="font-semibold">{m.country.toUpperCase()}</span>
              <span className={cn(m.country !== country && "text-muted-foreground")}>
                {m.top10} top 10 · {m.ranked} ranked
              </span>
            </Button>
          ))}
          {sortedMarkets.length > DASHBOARD_MARKETS_PREVIEW && (
            <Button
              className="h-auto py-1 text-xs"
              onClick={() => setShowAllMarkets((v) => !v)}
              size="sm"
              variant="ghost"
            >
              {showAllMarkets
                ? "Fewer markets"
                : `All ${sortedMarkets.length} markets`}
            </Button>
          )}
        </div>

        {board.isLoading || !board.data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              {selected.length ? (
                <RankChart
                  annotations={board.data.changes.map(toAnnotation)}
                  seriesColors={seriesColors}
                  snapshots={snapshots}
                />
              ) : (
                <p className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  Tick keywords in the table to draw their positions.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                #1 is at the top. A hollow dot below the chart is a check where
                the store did not show the app in the scanned results.
              </p>
            </div>

            <div className="space-y-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <span className="sr-only">On the chart</span>
                    </TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Best</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleKeywords.map((k) => {
                    const onChart = selected.includes(k.keyword);
                    const position = formatKeywordPosition(
                      k.measuredAt ? k.position : undefined,
                    );
                    return (
                      <TableRow key={k.keyword}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Show ${k.keyword} on the chart`}
                            checked={onChart}
                            disabled={!onChart && chartFull}
                            onCheckedChange={() => toggle(k.keyword)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="inline-flex items-center gap-2">
                            {onChart && (
                              <span
                                aria-hidden
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: seriesColors[k.keyword] }}
                              />
                            )}
                            {k.keyword}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right tabular-nums",
                            POSITION_TONE_CLASSES[position.tone],
                          )}
                          title={
                            k.measuredAt
                              ? undefined
                              : "Measured at the next check (00:00 / 12:00)"
                          }
                        >
                          {position.label}
                        </TableCell>
                        <TableCell className="text-right">
                          {k.delta === null ? null : <DeltaBadge delta={k.delta} />}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {k.bestPosition === null ? "-" : `#${k.bestPosition}`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  Up to {MAX_CHART_KEYWORDS} keywords on the chart at once.
                </span>
                {keywords.length > KEYWORD_ROWS_PREVIEW && (
                  <Button
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => setShowAllKeywords((v) => !v)}
                    size="sm"
                    variant="ghost"
                  >
                    {showAllKeywords
                      ? "Fewer keywords"
                      : `All ${keywords.length} keywords`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
