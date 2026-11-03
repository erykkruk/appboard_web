"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { marketLabel } from "@/lib/markets";
import type { TrackingMarket, TrackingMarketsOverview } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Show a filter box once the list stops fitting on one screen. */
const FILTER_FROM_MARKETS = 8;

function position(value: number | null): string {
  return value === null ? "-" : `#${value}`;
}

function checkedAt(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "Not checked";
}

function Moves({ market }: { market: TrackingMarket }) {
  const parts: React.ReactNode[] = [];
  if (market.improved) {
    parts.push(
      <span key="up" className="inline-flex items-center text-emerald-600">
        <ArrowUp className="h-3 w-3" aria-hidden />
        {market.improved}
        <span className="sr-only"> improved</span>
      </span>,
    );
  }
  if (market.declined) {
    parts.push(
      <span key="down" className="inline-flex items-center text-red-600">
        <ArrowDown className="h-3 w-3" aria-hidden />
        {market.declined}
        <span className="sr-only"> declined</span>
      </span>,
    );
  }
  if (market.entered) parts.push(<span key="in">+{market.entered} in</span>);
  if (market.dropped) parts.push(<span key="out">-{market.dropped} out</span>);
  if (!parts.length) return <span className="text-muted-foreground">-</span>;
  return <span className="flex flex-wrap items-center gap-2">{parts}</span>;
}

/**
 * Every market of the app in one table: how many tracked keywords rank, how
 * many sit on the first page, median position and what moved since each
 * keyword's previous measurement. Picking a row opens that market's board.
 */
export function MarketsOverview({
  onSelect,
  overview,
  selectedCountry,
}: {
  onSelect: (country: string) => void;
  overview: TrackingMarketsOverview;
  selectedCountry: string;
}) {
  const [filter, setFilter] = useState("");

  const markets = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return overview.markets;
    return overview.markets.filter(
      (m) =>
        m.country.includes(q) || marketLabel(m.country).toLowerCase().includes(q),
    );
  }, [filter, overview.markets]);

  if (!overview.markets.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No markets yet. Add keywords for a market above and it shows up here.
      </p>
    );
  }

  const { totals } = overview;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {totals.markets} markets, {totals.ranked} of {totals.tracked} keywords
        ranking, {totals.top10} in the top 10
        {totals.medianPosition === null
          ? ""
          : `, median position #${totals.medianPosition}`}
        {totals.failedLastRun
          ? `. ${totals.failedLastRun} could not be measured in the last check`
          : ""}
        .
      </p>
      {overview.markets.length >= FILTER_FROM_MARKETS && (
        <Input
          aria-label="Filter markets"
          className="max-w-xs"
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter markets"
          value={filter}
        />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Market</TableHead>
            <TableHead className="text-right">Tracked</TableHead>
            <TableHead className="text-right">Ranked</TableHead>
            <TableHead className="text-right">Top 10</TableHead>
            <TableHead className="text-right">Top 50</TableHead>
            <TableHead className="text-right">Median</TableHead>
            <TableHead className="text-right">Average</TableHead>
            <TableHead className="text-right">Best</TableHead>
            <TableHead>Since previous check</TableHead>
            <TableHead>Last checked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {markets.map((m) => (
            <TableRow
              key={m.country}
              className={cn(
                "cursor-pointer",
                m.country === selectedCountry && "bg-muted/60",
              )}
              data-state={m.country === selectedCountry ? "selected" : undefined}
              onClick={() => onSelect(m.country)}
            >
              <TableCell>
                <button
                  className="text-left font-medium hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(m.country);
                  }}
                  type="button"
                >
                  {marketLabel(m.country)}{" "}
                  <span className="text-xs text-muted-foreground">
                    {m.country.toUpperCase()}
                  </span>
                </button>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {m.tracked}
                {m.measured < m.tracked && (
                  <span className="block text-xs text-muted-foreground">
                    {m.tracked - m.measured} not measured
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{m.ranked}</TableCell>
              <TableCell className="text-right tabular-nums">{m.top10}</TableCell>
              <TableCell className="text-right tabular-nums">{m.top50}</TableCell>
              <TableCell className="text-right tabular-nums">
                {position(m.medianPosition)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {position(m.avgPosition)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {position(m.bestPosition)}
              </TableCell>
              <TableCell className="text-sm">
                <Moves market={m} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {checkedAt(m.lastCheckedAt)}
                {m.failedLastRun > 0 && (
                  <span className="block text-amber-600">
                    {m.failedLastRun} lookup(s) failed
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!markets.length && (
            <TableRow>
              <TableCell className="text-sm text-muted-foreground" colSpan={10}>
                No market matches &quot;{filter}&quot;.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
