"use client";

import { useMemo, useState } from "react";

import { DeltaBadge } from "@/components/tracking/delta-badge";
import { Sparkline } from "@/components/tracking/sparkline";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CLASSIFICATION_META } from "@/lib/keyword-research";
import { formatKeywordPosition } from "@/lib/research";
import type { BoardKeyword } from "@/lib/types";

type SortKey = "opportunity" | "difficulty" | "popularity" | "rank" | "keyword";

const SORTS: Record<SortKey, (a: BoardKeyword, b: BoardKeyword) => number> = {
  difficulty: (a, b) => (a.difficulty ?? 101) - (b.difficulty ?? 101),
  keyword: (a, b) => a.keyword.localeCompare(b.keyword),
  opportunity: (a, b) =>
    (b.opportunity ?? -1) - (a.opportunity ?? -1) ||
    (a.difficulty ?? 101) - (b.difficulty ?? 101),
  popularity: (a, b) => (b.popularity ?? -1) - (a.popularity ?? -1),
  rank: (a, b) => (a.position ?? 999) - (b.position ?? 999),
};

const SORT_LABELS: Record<SortKey, string> = {
  difficulty: "Sort: difficulty",
  keyword: "Sort: A-Z",
  opportunity: "Sort: opportunity, then difficulty",
  popularity: "Sort: popularity",
  rank: "Sort: our position",
};

function difficultyColor(difficulty: number): string {
  if (difficulty <= 30) return "bg-green-600 dark:bg-green-500";
  if (difficulty < 70) return "bg-amber-500";
  return "bg-red-600 dark:bg-red-500";
}

function formatNumber(value: number | null): string {
  return value === null ? "-" : value.toLocaleString();
}

/**
 * One row per tracked term, carrying everything needed to decide what to do
 * with it: where we stand, what the term costs, where it is heading, whether
 * our own metadata already targets it, and who owns the first result.
 */
export function KeywordBoardTable({ keywords }: { keywords: BoardKeyword[] }) {
  const [query, setQuery] = useState("");
  const [picksOnly, setPicksOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("opportunity");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return keywords
      .filter((k) => (picksOnly ? k.pick : true))
      .filter((k) => (needle ? k.keyword.toLowerCase().includes(needle) : true))
      .sort(SORTS[sort]);
  }, [keywords, picksOnly, query, sort]);

  const picks = keywords.filter((k) => k.pick).length;

  if (!keywords.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No keywords tracked in this market yet. Add some above, or run an audit -
        it seeds the terms worth measuring.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-56"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search keyword"
          value={query}
        />
        <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
          <input
            checked={picksOnly}
            className="h-4 w-4 accent-primary"
            onChange={(e) => setPicksOnly(e.target.checked)}
            type="checkbox"
          />
          Only winnable targets ({picks})
        </Label>
        <Select onValueChange={(v) => setSort(v as SortKey)} value={sort}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Best</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Popularity</TableHead>
              <TableHead>Targeting</TableHead>
              <TableHead>In your listing</TableHead>
              <TableHead>Leader</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const position = formatKeywordPosition(
                row.measuredAt ? row.position : undefined,
              );
              const meta = row.classification
                ? CLASSIFICATION_META[row.classification]
                : null;
              return (
                <TableRow key={`${row.country}-${row.keyword}`}>
                  <TableCell className="font-medium">{row.keyword}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={
                        position.tone === "strong"
                          ? "font-semibold text-green-600 dark:text-green-500"
                          : position.tone === "muted"
                            ? "text-muted-foreground"
                            : ""
                      }
                    >
                      {position.label}
                    </span>{" "}
                    <DeltaBadge delta={row.delta} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.bestPosition === null ? "-" : `#${row.bestPosition}`}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.difficulty === null ? (
                      <span className="text-muted-foreground">not scored</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-1.5 w-16 overflow-hidden rounded bg-muted">
                          <span
                            className={`block h-full ${difficultyColor(row.difficulty)}`}
                            style={{ width: `${row.difficulty}%` }}
                          />
                        </span>
                        <span className="tabular-nums">{row.difficulty}</span>
                        {row.difficultyDelta ? (
                          <span
                            className={
                              row.difficultyDelta < 0
                                ? "text-xs text-green-600 dark:text-green-500"
                                : "text-xs text-red-600 dark:text-red-500"
                            }
                          >
                            {row.difficultyDelta > 0 ? "+" : ""}
                            {row.difficultyDelta}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Sparkline
                      title="Difficulty over time - down is easier"
                      values={row.scoreTrend.map((p) => p.difficulty)}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatNumber(row.popularity)}
                  </TableCell>
                  <TableCell>
                    {meta ? (
                      <Badge className={meta.className} variant="outline">
                        {meta.label}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.metadataFields.length
                      ? row.metadataFields.join(", ")
                      : "not used"}
                  </TableCell>
                  <TableCell className="max-w-56 text-xs text-muted-foreground">
                    {row.leader ? (
                      <span title={`${row.leader.developer}`}>
                        {row.leader.title}
                        {row.leader.ratingsCount !== null
                          ? ` (${row.leader.ratingsCount.toLocaleString()} ratings)`
                          : ""}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          No keyword matches this filter.
        </p>
      )}
    </div>
  );
}
