"use client";

import {
  ChevronDown,
  ChevronRight,
  Loader2,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { Fragment, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppleMovers, useAppleAdsStatus } from "@/hooks/use-apple-ads";
import {
  useDeleteScoreSnapshot,
  useScoreHistory,
  useScoreSummary,
  useScoreTrend,
} from "@/hooks/use-keyword-history";
import {
  CLASSIFICATION_META,
  countryLabel,
  difficultyMeta,
  formatDownloadRange,
} from "@/lib/keyword-research";
import type {
  KeywordClassification,
  KeywordTrendPoint,
} from "@/lib/types";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 120;

/** Minimal SVG line chart for daily popularity/difficulty trend points. */
function TrendChart({ points }: { points: KeywordTrendPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Trends appear once a keyword has snapshots on at least two days.
        Tracked keywords refresh automatically every night.
      </p>
    );
  }
  const x = (index: number) =>
    (index / (points.length - 1)) * (CHART_WIDTH - 20) + 10;
  const y = (value: number) =>
    CHART_HEIGHT - 12 - (value / 100) * (CHART_HEIGHT - 24);
  const path = (selector: (p: KeywordTrendPoint) => number | null) =>
    points
      .map((p, i) => {
        const value = selector(p);
        return value === null ? null : `${x(i)},${y(value)}`;
      })
      .filter((v): v is string => v !== null)
      .map((coord, i) => `${i === 0 ? "M" : "L"}${coord}`)
      .join(" ");

  return (
    <div className="space-y-1">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full max-w-xl"
        role="img"
        aria-label="Keyword trend chart"
      >
        <line
          x1="10"
          y1={y(50)}
          x2={CHART_WIDTH - 10}
          y2={y(50)}
          className="stroke-border"
          strokeDasharray="4 4"
        />
        <path
          d={path((p) => p.popularity)}
          fill="none"
          strokeWidth="2"
          className="stroke-blue-500"
        />
        <path
          d={path((p) => p.difficulty)}
          fill="none"
          strokeWidth="2"
          className="stroke-orange-500"
        />
        <path
          d={path((p) => p.opportunity)}
          fill="none"
          strokeWidth="2"
          className="stroke-green-500"
        />
      </svg>
      <p className="text-xs text-muted-foreground">
        <span className="text-blue-500">popularity</span> ·{" "}
        <span className="text-orange-500">difficulty</span> ·{" "}
        <span className="text-green-500">opportunity</span> · {points[0].day}{" "}
        to {points[points.length - 1].day}
      </p>
    </div>
  );
}

function SummaryCards() {
  const summary = useScoreSummary();
  if (!summary.data?.length) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {summary.data.map((entry) => (
        <Card key={entry.country}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {countryLabel(entry.country)} - ASO posture
            </CardTitle>
            <CardDescription>
              {entry.keywords} scored keyword{entry.keywords === 1 ? "" : "s"},{" "}
              {entry.ranked} ranked
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Estimated downloads from current ranks:{" "}
              <span className="font-medium">
                {formatDownloadRange(
                  entry.estimatedDailyDownloads.low,
                  entry.estimatedDailyDownloads.high,
                )}
                /day
              </span>
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(entry.classifications).map(([key, count]) => {
                const meta =
                  CLASSIFICATION_META[key as KeywordClassification];
                return (
                  <Badge
                    key={key}
                    variant="outline"
                    className={meta?.className}
                  >
                    {meta?.label ?? key} x{count}
                  </Badge>
                );
              })}
            </div>
            {entry.topOpportunities.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Top opportunities:{" "}
                {entry.topOpportunities
                  .slice(0, 3)
                  .map((o) => `${o.keyword} (${o.opportunity})`)
                  .join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MoversCard({ country }: { country: string }) {
  const status = useAppleAdsStatus();
  const hasApple =
    (status.data?.activeWeeks.some((w) => w.country === country) ?? false);
  const movers = useAppleMovers(country, hasApple);
  if (!hasApple || !movers.data?.movers.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4" />
          Official popularity movers ({countryLabel(country)})
        </CardTitle>
        <CardDescription>
          Biggest week-over-week changes in Apple&apos;s dataset (
          {movers.data.weeks[1]} to {movers.data.weeks[0]})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-1 sm:grid-cols-2">
          {movers.data.movers.map((mover) => (
            <div
              key={mover.term}
              className="flex items-center justify-between text-sm"
            >
              <span className="truncate">{mover.term}</span>
              <span
                className={
                  mover.delta > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {mover.delta > 0 ? "+" : ""}
                {mover.delta} ({mover.previous} to {mover.current})
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendRow({ country, keyword }: { country: string; keyword: string }) {
  const trend = useScoreTrend(keyword, country);
  if (trend.isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  return <TrendChart points={trend.data ?? []} />;
}

/**
 * Server-side keyword score history: the latest stored snapshot per
 * keyword+country (from daily snapshots kept for 90 days), with an
 * expandable popularity/difficulty/opportunity trend chart.
 */
export function KeywordHistorySection() {
  const history = useScoreHistory();
  const deleteSnapshot = useDeleteScoreSnapshot();
  const [expanded, setExpanded] = useState<string | null>(null);

  const entries = history.data ?? [];
  const countries = [...new Set(entries.map((e) => e.country))];

  return (
    <div className="space-y-6">
      <SummaryCards />
      {countries.map((country) => (
        <MoversCard key={country} country={country} />
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Score history</CardTitle>
          <CardDescription>
            Latest stored score per keyword and country. Every search stores
            one snapshot per day; tracked keywords refresh nightly, so trends
            build up automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.isLoading && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!history.isLoading && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No stored scores yet - run a keyword search first.
            </p>
          )}
          {entries.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Keyword</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Pop</TableHead>
                  <TableHead>Diff</TableHead>
                  <TableHead>Opp</TableHead>
                  <TableHead>Targeting</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const key = `${entry.keyword}:${entry.country}`;
                  const isOpen = expanded === key;
                  const classification =
                    CLASSIFICATION_META[
                      entry.classification as KeywordClassification
                    ];
                  return (
                    <Fragment key={entry.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : key)}
                      >
                        <TableCell>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {entry.keyword}
                        </TableCell>
                        <TableCell>{entry.country.toUpperCase()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.day}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {entry.popularity ?? "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`tabular-nums font-medium ${difficultyMeta(entry.classification).className ? "" : ""}`}
                          >
                            {entry.difficulty}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {entry.opportunity}
                        </TableCell>
                        <TableCell>
                          {classification ? (
                            <Badge
                              variant="outline"
                              className={classification.className}
                            >
                              {classification.label}
                            </Badge>
                          ) : (
                            entry.classification
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {entry.appRank ? `#${entry.appRank}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSnapshot.mutate(entry.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-muted/30">
                            <TrendRow
                              country={entry.country}
                              keyword={entry.keyword}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
