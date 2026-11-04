"use client";

import { LineChart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DeltaBadge } from "@/components/tracking/delta-badge";
import {
  KeywordDownloadsNote,
  KeywordDownloadsSortHeader,
  KeywordDownloadsValue,
} from "@/components/tracking/keyword-downloads";
import { MarketStrengthTable } from "@/components/tracking/market-strength-table";
import { RankChart, SERIES_COLORS } from "@/components/tracking/rank-chart";
import { StarToggle } from "@/components/tracking/star-toggle";
import { StarredFilter } from "@/components/tracking/starred-filter";
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
import { useKeywordFilter } from "@/hooks/use-keyword-filter";
import {
  useKeywordDownloads,
  useStarKeyword,
  useTrackingBoard,
  useTrackingMarkets,
  useTrackingMarketsHistory,
} from "@/hooks/use-tracking";
import {
  compareByDownloads,
  keywordDownloadsCells,
  keywordDownloadsHeaderTitle,
} from "@/lib/keyword-downloads";
import { marketLabel } from "@/lib/markets";
import {
  boardToSnapshots,
  defaultChartKeywords,
  earnedCounts,
  MAX_CHART_KEYWORDS,
  notRankedNow,
  pickDefaultMarket,
  singleHistoryDay,
  sortKeywordsForDashboard,
  toggleChartKeyword,
  unmeasuredKeywords,
} from "@/lib/rank-dashboard";
import { formatKeywordPosition } from "@/lib/research";
import { filterByStar, isStarred } from "@/lib/starred-keywords";
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

/** "2026-11-03" as "3 Nov" in the reader's locale. */
function formatDay(day: string): string {
  return new Date(`${day}T12:00:00.000Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * Dashboard view of keyword positions: how strong the app is in every market
 * (a sortable table that ignores the app's own name), and for the chosen
 * market a positions-over-time chart of its most searched keywords (up to
 * MAX_CHART_KEYWORDS) next to their current position and change.
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
  const marketsHistory = useTrackingMarketsHistory(appId);
  const [pickedCountry, setPickedCountry] = useState<string | null>(null);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  const [sortByDownloads, setSortByDownloads] = useState(false);

  const marketRows = useMemo(
    () => markets.data?.markets ?? [],
    [markets.data?.markets],
  );
  const country = useMemo(
    () =>
      pickedCountry && marketRows.some((m) => m.country === pickedCountry)
        ? pickedCountry
        : pickDefaultMarket(marketRows, homeCountry),
    [homeCountry, marketRows, pickedCountry],
  );
  const selectedMarket = useMemo(
    () => marketRows.find((m) => m.country === country) ?? null,
    [country, marketRows],
  );

  const board = useTrackingBoard(appId, country ?? undefined, {
    enabled: country !== null,
  });

  const downloads = useKeywordDownloads(appId, country ?? undefined, {
    enabled: country !== null,
  });
  const downloadCells = useMemo(
    () =>
      downloads.data
        ? keywordDownloadsCells(downloads.data, board.data?.keywords ?? [])
        : null,
    [board.data?.keywords, downloads.data],
  );

  const keywords = useMemo(() => {
    const sorted = sortKeywordsForDashboard(board.data?.keywords ?? []);
    return sortByDownloads && downloadCells
      ? [...sorted].sort(compareByDownloads(downloadCells))
      : sorted;
  }, [board.data?.keywords, downloadCells, sortByDownloads]);
  const starredCount = keywords.filter(isStarred).length;
  const { filter, pin, setFilter } = useKeywordFilter(starredCount > 0);
  const listed = useMemo(() => filterByStar(keywords, filter), [filter, keywords]);
  const starKeyword = useStarKeyword(appId);
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
  const notMeasured = useMemo(
    () => unmeasuredKeywords(board.data?.keywords ?? [], selected),
    [board.data?.keywords, selected],
  );
  const outOfResults = useMemo(
    () => notRankedNow(board.data?.keywords ?? [], selected),
    [board.data?.keywords, selected],
  );
  const onlyDay = useMemo(
    () => singleHistoryDay(board.data?.keywords ?? []),
    [board.data?.keywords],
  );

  // No tracking, no supported store or a failed read: the summary card
  // further down already explains the empty state.
  if (markets.isError || markets.data?.rankTracking.supported === false) {
    return null;
  }
  if (markets.isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (!country || !marketRows.length) return null;

  const visibleKeywords = showAllKeywords
    ? listed
    : listed.slice(0, KEYWORD_ROWS_PREVIEW);
  const chartFull = selected.length >= MAX_CHART_KEYWORDS;
  const earned = selectedMarket ? earnedCounts(selectedMarket) : null;

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
            {selectedMarket && earned
              ? `: ${earned.ranked} of ${selectedMarket.tracked} keywords ranking beyond your app name, ${earned.top10} in the top 10`
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
        <MarketStrengthTable
          history={marketsHistory.data}
          homeCountry={homeCountry}
          markets={marketRows}
          onSelect={setPickedCountry}
          selected={country}
        />

        {board.isLoading || !board.data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                {marketLabel(country)}: positions over time
              </h3>
              {onlyDay ? (
                <p className="flex h-32 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
                  History starts {formatDay(onlyDay)}. Positions are kept per
                  day, so lines appear once a second day is measured (checks
                  run at 00:00 and 12:00). Today&apos;s positions are in the
                  table below.
                </p>
              ) : selected.length ? (
                <RankChart
                  activeKeyword={hoveredKeyword}
                  annotations={board.data.changes.map(toAnnotation)}
                  onActiveKeywordChange={setHoveredKeyword}
                  seriesColors={seriesColors}
                  snapshots={snapshots}
                />
              ) : (
                <p className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  Tick keywords in the table to draw their positions.
                </p>
              )}
              {!onlyDay && (
                <p className="text-xs text-muted-foreground">
                  #1 is at the top. A dot on the &quot;not ranked&quot; line is a
                  check where the store did not show the app in the scanned
                  results.
                </p>
              )}
              {outOfResults.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Not in the results at the last check:{" "}
                  {outOfResults.join(", ")}.
                </p>
              )}
              {notMeasured.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Not measured yet, so not on the chart:{" "}
                  {notMeasured.join(", ")}. Measured at the next check (00:00 /
                  12:00).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <StarredFilter
                allCount={keywords.length}
                filter={filter}
                onChange={setFilter}
                starredCount={starredCount}
              />
              <KeywordDownloadsNote report={downloads.data} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <span className="sr-only">On the chart</span>
                    </TableHead>
                    <TableHead className="w-8">
                      <span className="sr-only">Starred</span>
                    </TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Popularity</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Best</TableHead>
                    {downloads.data && (
                      <TableHead
                        aria-sort={sortByDownloads ? "descending" : undefined}
                        className="text-right"
                      >
                        <KeywordDownloadsSortHeader
                          active={sortByDownloads}
                          onToggle={() => setSortByDownloads((v) => !v)}
                          title={keywordDownloadsHeaderTitle(downloads.data)}
                        />
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleKeywords.map((k) => {
                    const onChart = selected.includes(k.keyword);
                    const position = formatKeywordPosition(
                      k.measuredAt ? k.position : undefined,
                    );
                    return (
                      <TableRow
                        key={k.keyword}
                        className={cn(
                          onChart && hoveredKeyword === k.keyword && "bg-muted",
                        )}
                        data-highlighted={hoveredKeyword === k.keyword || undefined}
                        onMouseEnter={() => onChart && setHoveredKeyword(k.keyword)}
                        onMouseLeave={() => setHoveredKeyword(null)}
                      >
                        <TableCell>
                          <Checkbox
                            aria-label={`Show ${k.keyword} on the chart`}
                            checked={onChart}
                            disabled={!onChart && chartFull}
                            onCheckedChange={() => toggle(k.keyword)}
                          />
                        </TableCell>
                        <TableCell>
                          <StarToggle
                            disabled={!k.keywordId}
                            keyword={k.keyword}
                            onToggle={() => {
                              if (!k.keywordId) return;
                              pin();
                              starKeyword.mutate({
                                keywordId: k.keywordId,
                                starred: !isStarred(k),
                              });
                            }}
                            starred={isStarred(k)}
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
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {k.popularity ?? "-"}
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
                        {downloadCells && (
                          <TableCell className="text-right">
                            <KeywordDownloadsValue cell={downloadCells.get(k.keyword)} />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {!listed.length && (
                    <TableRow>
                      <TableCell
                        className="text-center text-sm text-muted-foreground"
                        colSpan={downloadCells ? 8 : 7}
                      >
                        No starred keywords in this market yet. Star the ones
                        you target with the star next to them in All.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {starredCount > 0
                    ? `The chart opens on your starred keywords (up to ${MAX_CHART_KEYWORDS})`
                    : `The chart opens on the ${MAX_CHART_KEYWORDS} most searched keywords`}
                  ; tick up to {MAX_CHART_KEYWORDS} of your own.
                </span>
                {listed.length > KEYWORD_ROWS_PREVIEW && (
                  <Button
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => setShowAllKeywords((v) => !v)}
                    size="sm"
                    variant="ghost"
                  >
                    {showAllKeywords
                      ? "Fewer keywords"
                      : `All ${listed.length} keywords`}
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
