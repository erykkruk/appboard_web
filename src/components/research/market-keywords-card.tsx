"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Sparkline } from "@/components/tracking/sparkline";
import { StarToggle } from "@/components/tracking/star-toggle";
import { StarredFilter } from "@/components/tracking/starred-filter";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useKeywordScores } from "@/hooks/use-keyword-research";
import {
  useAddKeywords,
  useKeywordSuggestions,
  useStarKeyword,
  useTrackAndStarKeyword,
  useTrackingBoard,
  useTrackingMarkets,
} from "@/hooks/use-tracking";
import {
  buildMarketKeywordRows,
  filterMarketKeywordRows,
  keywordsToScore,
  type MarketKeywordRow,
} from "@/lib/market-keywords";
import { marketLabel } from "@/lib/markets";
import { pickDefaultMarket, sortMarketsForDashboard } from "@/lib/rank-dashboard";
import { formatKeywordPosition } from "@/lib/research";
import { MAX_TRACKED_KEYWORDS_PER_LANGUAGE } from "@/lib/types";
import { cn } from "@/lib/utils";

const POSITION_TONE_CLASSES: Record<string, string> = {
  default: "",
  medium: "text-amber-500",
  muted: "text-muted-foreground",
  strong: "font-semibold text-emerald-500",
};

function WinnableCell({ row }: { row: MarketKeywordRow }) {
  if (row.difficulty === null) {
    return <span className="text-muted-foreground">not scored</span>;
  }
  return (
    <span
      className={cn(
        "tabular-nums",
        row.winnable ? "text-emerald-500" : "text-muted-foreground",
      )}
    >
      {row.difficulty}
      <span className="ml-2 text-xs">{row.winnable ? "winnable" : "hard"}</span>
    </span>
  );
}

/**
 * The keywords of one market in one table: what we track, then ideas mined
 * from the apps that rank for them. Everything shown comes from stored data;
 * the store is only asked when "Score missing" is clicked, at most one
 * scoring request's worth of keywords per click.
 */
export function MarketKeywordsCard({
  appId,
  appstoreId,
  homeCountry,
}: {
  appId: string;
  appstoreId?: string;
  homeCountry: string | null;
}) {
  const queryClient = useQueryClient();
  const markets = useTrackingMarkets(appId);
  const [picked, setPicked] = useState<string | null>(null);

  const sortedMarkets = useMemo(
    () => sortMarketsForDashboard(markets.data?.markets ?? []),
    [markets.data?.markets],
  );
  const country =
    picked && sortedMarkets.some((m) => m.country === picked)
      ? picked
      : pickDefaultMarket(sortedMarkets, homeCountry);

  const board = useTrackingBoard(appId, country ?? undefined, {
    enabled: country !== null,
  });
  const ideas = useKeywordSuggestions(appId, country);
  const scoring = useKeywordScores();
  const addKeywords = useAddKeywords(appId);
  const starKeyword = useStarKeyword(appId);
  const trackAndStar = useTrackAndStarKeyword(appId);

  const rows = useMemo(
    () =>
      buildMarketKeywordRows(
        board.data?.keywords ?? [],
        ideas.data?.suggestions ?? [],
      ),
    [board.data?.keywords, ideas.data?.suggestions],
  );
  const missing = useMemo(() => keywordsToScore(rows), [rows]);
  const trackedCount = rows.filter((r) => r.tracked).length;
  const starredCount = rows.filter((r) => r.starred).length;
  const { filter, pin, setFilter } = useKeywordFilter(starredCount > 0);
  const listed = useMemo(
    () => filterMarketKeywordRows(rows, filter),
    [filter, rows],
  );
  const cap = ideas.data?.cap ?? MAX_TRACKED_KEYWORDS_PER_LANGUAGE;
  const atCap = trackedCount >= cap;

  async function scoreMissing() {
    if (!country || missing.length === 0) return;
    await scoring.mutateAsync({
      country,
      keywords: missing,
      ...(appstoreId ? { appstoreId } : {}),
    });
    await queryClient.invalidateQueries({ queryKey: ["apps", appId, "tracking"] });
  }

  if (markets.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!country) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your keywords</CardTitle>
          <CardDescription>
            Track keywords in Keyword rankings first: this table then lists
            them per market with ideas for more.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your keywords</CardTitle>
        <CardDescription>
          The keywords you track in this market, then ideas taken from the
          apps that rank for them. Popularity and difficulty are refreshed
          every night; ideas are scored by the morning auto-research.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={country} onValueChange={setPicked}>
            <SelectTrigger className="w-56" aria-label="Market">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortedMarkets.map((m) => (
                <SelectItem key={m.country} value={m.country}>
                  {marketLabel(m.country)} ({m.country.toUpperCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground tabular-nums">
            {trackedCount}/{cap} tracked
          </span>
          <StarredFilter
            allCount={trackedCount}
            filter={filter}
            onChange={setFilter}
            starredCount={starredCount}
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={scoreMissing}
            disabled={missing.length === 0 || scoring.isPending}
          >
            {scoring.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Score missing ({missing.length})
          </Button>
        </div>

        {board.isLoading || ideas.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <span className="sr-only">Starred</span>
                </TableHead>
                <TableHead>Keyword</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Popularity</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listed.map((row) => {
                const pos = formatKeywordPosition(row.position);
                const keywordId = row.keywordId;
                return (
                  <TableRow key={`${row.tracked ? "t" : "i"}-${row.keyword}`}>
                    <TableCell>
                      {row.tracked ? (
                        <StarToggle
                          disabled={!keywordId}
                          keyword={row.keyword}
                          onToggle={() => {
                            if (!keywordId) return;
                            pin();
                            starKeyword.mutate({
                              keywordId,
                              starred: !row.starred,
                            });
                          }}
                          starred={row.starred}
                        />
                      ) : (
                        <StarToggle
                          disabled={atCap || trackAndStar.isPending}
                          keyword={row.keyword}
                          onToggle={() => {
                            pin();
                            trackAndStar.mutate({ country, keyword: row.keyword });
                          }}
                          starred={false}
                          title={
                            atCap
                              ? `This market already tracks ${cap} keywords`
                              : "Track and star this keyword"
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.keyword}
                      {row.tracked ? (
                        <Badge variant="secondary" className="ml-2">
                          tracked
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2">
                          idea
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={POSITION_TONE_CLASSES[pos.tone]}>
                      {pos.label}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.popularity ?? "-"}
                    </TableCell>
                    <TableCell>
                      <WinnableCell row={row} />
                    </TableCell>
                    <TableCell>
                      <Sparkline
                        values={row.difficultyTrend}
                        title="Difficulty over time"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {!row.tracked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={atCap || addKeywords.isPending}
                          title={
                            atCap
                              ? `This market already tracks ${cap} keywords`
                              : "Track this keyword"
                          }
                          onClick={() =>
                            addKeywords.mutate({
                              country,
                              keywords: [row.keyword],
                            })
                          }
                        >
                          <Plus className="h-4 w-4" />
                          Track
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {ideas.data && ideas.data.suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No ideas yet for this market: they appear once its tracked
            keywords have been scored (new keywords overnight, from 01:00).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
