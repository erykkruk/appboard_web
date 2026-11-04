"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { DeltaBadge } from "@/components/tracking/delta-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { marketLabel } from "@/lib/markets";
import {
  DASHBOARD_MARKETS_PREVIEW,
  DEFAULT_MARKET_SORT,
  earnedCounts,
  marketChange,
  type MarketSort,
  type MarketSortKey,
  nextMarketSort,
  sortMarketTable,
} from "@/lib/rank-dashboard";
import { MAX_TRACKED_KEYWORDS_PER_LANGUAGE, type TrackingMarket } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Column {
  align: "left" | "right";
  key: MarketSortKey;
  label: string;
  title?: string;
}

const COLUMNS: Column[] = [
  { align: "left", key: "country", label: "Market" },
  { align: "right", key: "tracked", label: "Tracked" },
  {
    align: "right",
    key: "ranked",
    label: "Ranked",
    title: "Keywords in the scanned results, not counting your app name",
  },
  { align: "right", key: "top10", label: "Top 10" },
  { align: "right", key: "top50", label: "Top 50" },
  { align: "right", key: "median", label: "Median" },
];

function SortIcon({ sort, column }: { sort: MarketSort; column: MarketSortKey }) {
  if (sort.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return sort.direction === "desc" ? (
    <ArrowDown className="h-3 w-3" />
  ) : (
    <ArrowUp className="h-3 w-3" />
  );
}

function ChangeCell({ market }: { market: TrackingMarket }) {
  const up = market.improved + market.entered;
  const down = market.declined + market.dropped;
  if (!up && !down) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="inline-flex gap-2 tabular-nums">
      {up > 0 && <span className="text-emerald-600">+{up}</span>}
      {down > 0 && <span className="text-red-600">-{down}</span>}
    </span>
  );
}

/**
 * How strong the app is in each tracked market, strongest first. Counts leave
 * out the app's own name, so a market where only "buzzin" ranks reads as
 * weak instead of as a top-10 market. Clicking a row picks the market for the
 * chart below.
 */
export function MarketStrengthTable({
  homeCountry,
  markets,
  onSelect,
  selected,
}: {
  homeCountry: string | null;
  markets: TrackingMarket[];
  onSelect: (country: string) => void;
  selected: string;
}) {
  const [sort, setSort] = useState<MarketSort>(DEFAULT_MARKET_SORT);
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(
    () => sortMarketTable(markets, sort, homeCountry),
    [homeCountry, markets, sort],
  );
  const visible = showAll ? rows : rows.slice(0, DASHBOARD_MARKETS_PREVIEW);
  // Only once something is starred: an all-dash column says nothing.
  const showStarred = markets.some((m) => (m.starred ?? 0) > 0);

  return (
    <div className="space-y-2">
      <Table aria-label="Markets by strength">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                aria-sort={
                  sort.key === column.key
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
                className={cn(column.align === "right" && "text-right")}
                title={column.title}
              >
                <button
                  className={cn(
                    "inline-flex items-center gap-1 hover:text-foreground",
                    column.align === "right" && "flex-row-reverse",
                  )}
                  onClick={() => setSort((s) => nextMarketSort(s, column.key))}
                  type="button"
                >
                  {column.label}
                  <SortIcon column={column.key} sort={sort} />
                </button>
              </TableHead>
            ))}
            {showStarred && (
              <TableHead
                className="text-right"
                title="Starred keywords in the top 10 now, of all starred in the market"
              >
                Starred top 10
              </TableHead>
            )}
            <TableHead>Best keyword</TableHead>
            <TableHead className="text-right">
              <button
                className="inline-flex flex-row-reverse items-center gap-1 hover:text-foreground"
                onClick={() => setSort((s) => nextMarketSort(s, "change"))}
                type="button"
              >
                Change
                <SortIcon column="change" sort={sort} />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((m) => {
            const earned = earnedCounts(m);
            const isSelected = m.country === selected;
            return (
              <TableRow
                key={m.country}
                aria-selected={isSelected}
                className={cn("cursor-pointer", isSelected && "bg-muted/60")}
                data-state={isSelected ? "selected" : undefined}
                onClick={() => onSelect(m.country)}
              >
                <TableCell className="font-medium">
                  <button
                    className="inline-flex items-center gap-2 text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(m.country);
                    }}
                    type="button"
                  >
                    <span className="w-6 font-semibold text-muted-foreground">
                      {m.country.toUpperCase()}
                    </span>
                    {marketLabel(m.country)}
                  </button>
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {m.tracked}/{MAX_TRACKED_KEYWORDS_PER_LANGUAGE}
                </TableCell>
                <TableCell className="text-right tabular-nums">{earned.ranked}</TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    earned.top10 > 0 && "font-semibold text-emerald-500",
                  )}
                >
                  {earned.top10}
                </TableCell>
                <TableCell className="text-right tabular-nums">{earned.top50}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {earned.median === null ? "-" : `#${earned.median}`}
                </TableCell>
                {showStarred && (
                  <TableCell className="text-right tabular-nums">
                    {m.starred ? (
                      <span
                        className={cn(
                          (m.starredTop10 ?? 0) > 0 && "font-semibold text-emerald-500",
                        )}
                      >
                        {m.starredTop10 ?? 0}/{m.starred}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  {m.bestEarned ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="truncate">{m.bestEarned.keyword}</span>
                      <span className="tabular-nums text-muted-foreground">
                        #{m.bestEarned.position}
                      </span>
                      {m.bestEarned.delta !== null && m.bestEarned.delta !== 0 && (
                        <DeltaBadge delta={m.bestEarned.delta} />
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right" title={`Net ${marketChange(m)}`}>
                  <ChangeCell market={m} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Counts leave out your app name. Strength = top 10 counted three
          times plus every keyword in the top 50.
        </span>
        {rows.length > DASHBOARD_MARKETS_PREVIEW && (
          <Button
            className="h-auto px-2 py-1 text-xs"
            onClick={() => setShowAll((v) => !v)}
            size="sm"
            variant="ghost"
          >
            {showAll ? "Fewer markets" : `All ${rows.length} markets`}
          </Button>
        )}
      </div>
    </div>
  );
}
