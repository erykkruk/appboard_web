"use client";

import { useMemo, useState } from "react";

import { DeltaBadge } from "@/components/tracking/delta-badge";
import { StarredFilter } from "@/components/tracking/starred-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatVersionDay,
  LISTING_TEXT_FIELDS,
  listingFieldLabel,
  previousCells,
  versionEntry,
  VERSIONS_SHOWN_BY_DEFAULT,
  versionLabel,
  visibleVersions,
} from "@/lib/rank-by-version";
import { formatKeywordPosition } from "@/lib/research";
import {
  filterByStar,
  isStarred,
  type KeywordFilter,
} from "@/lib/starred-keywords";
import type { ByVersionCell, ByVersionColumn, RankByVersion } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  default: "",
  medium: "",
  muted: "text-muted-foreground",
  strong: "font-semibold text-green-600 dark:text-green-500",
} as const;

function PositionCell({
  cell,
  previous,
}: {
  cell: ByVersionCell | undefined;
  previous: ByVersionCell | undefined;
}) {
  if (!cell) return <span className="text-muted-foreground">-</span>;
  const position = formatKeywordPosition(cell.last);
  const entry = versionEntry(previous, cell);
  return (
    <span className="whitespace-nowrap">
      <span className={TONE_CLASSES[position.tone]}>{position.label}</span>{" "}
      {entry === "entered" && (
        <span className="text-xs text-emerald-600">new</span>
      )}
      {entry === "dropped" && <span className="text-xs text-red-600">out</span>}
      {cell.delta !== null && <DeltaBadge delta={cell.delta} />}
      {cell.best !== null && cell.best !== cell.last && (
        <span className="block text-xs text-muted-foreground">
          best #{cell.best}
        </span>
      )}
    </span>
  );
}

function VersionDetails({
  column,
  platform,
}: {
  column: ByVersionColumn;
  platform?: string | null;
}) {
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{versionLabel(column)}</span>
        {column.inferred && (
          <Badge variant="outline">
            Matched afterwards from the store version history
          </Badge>
        )}
        <span className="text-muted-foreground">
          {column.releasedAt
            ? `Released ${formatVersionDay(column.releasedAt)} · `
            : ""}
          measured {formatVersionDay(column.measuredFrom)} -{" "}
          {formatVersionDay(column.measuredTo)} ({column.measurements}{" "}
          {column.measurements === 1 ? "measurement" : "measurements"})
        </span>
      </div>
      {column.versionString === null && (
        <p className="text-muted-foreground">
          These positions were measured before AppBoard recorded store versions,
          or when the store did not say which version was live.
        </p>
      )}
      <dl className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        {LISTING_TEXT_FIELDS.map((field) => {
          const value = column.listing?.[field] ?? null;
          return (
            <div className="contents" key={field}>
              <dt className="text-muted-foreground">
                {listingFieldLabel(field, platform)}
                {column.changedFields.includes(field) && (
                  <Badge className="ml-2" variant="secondary">
                    changed
                  </Badge>
                )}
              </dt>
              <dd className={cn("break-words", !value && "text-muted-foreground")}>
                {value ?? "Not known for this version"}
              </dd>
            </div>
          );
        })}
      </dl>
      {column.listings.length > 1 && (
        <p className="text-xs text-muted-foreground">
          The listing text changed {column.listings.length - 1}{" "}
          {column.listings.length === 2 ? "time" : "times"} while this version
          was live; the newest text is shown.
        </p>
      )}
    </div>
  );
}

/**
 * Keyword x store version: where each keyword stood while each version (and
 * the title, subtitle and keywords it shipped with) was live, newest first.
 */
export function RankByVersionTable({
  data,
  filter = "all",
  onFilterChange,
  platform,
}: {
  data: RankByVersion;
  filter?: KeywordFilter;
  onFilterChange?: (next: KeywordFilter) => void;
  /** App platform, to name the second text field (subtitle or short description). */
  platform?: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const columns = visibleVersions(data.versions, showAll);
  const selected =
    data.versions.find((v) => v.key === selectedKey) ?? data.versions[0];
  const rows = useMemo(
    () => filterByStar(data.keywords, filter),
    [data.keywords, filter],
  );
  const starredCount = data.keywords.filter(isStarred).length;

  if (!data.versions.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No positions measured in this market yet. Every check from now on is
        stored with the store version that was live.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {onFilterChange && (
          <StarredFilter
            allCount={data.keywords.length}
            filter={filter}
            onChange={onFilterChange}
            starredCount={starredCount}
          />
        )}
        <p className="text-sm text-muted-foreground">
          Last position while each version was live, with the change against
          the version before. Click a version to see its listing text.
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              {columns.map((column) => (
                <TableHead className="align-bottom" key={column.key}>
                  <button
                    aria-pressed={selected?.key === column.key}
                    className={cn(
                      "flex flex-col items-start rounded px-1 py-0.5 text-left hover:bg-muted",
                      selected?.key === column.key && "bg-muted",
                    )}
                    onClick={() => setSelectedKey(column.key)}
                    type="button"
                  >
                    <span className="font-semibold text-foreground">
                      {versionLabel(column)}
                    </span>
                    <span className="text-xs font-normal">
                      {formatVersionDay(column.releasedAt ?? column.measuredFrom)}
                      {column.inferred ? " · estimated" : ""}
                    </span>
                    {column.changedFields.length > 0 && (
                      <span className="text-xs font-normal text-amber-600">
                        {column.changedFields
                          .map((f) => listingFieldLabel(f, platform))
                          .join(", ")}{" "}
                        changed
                      </span>
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const previous = previousCells(row.cells, data.versions);
              return (
                <TableRow key={row.keyword}>
                  <TableCell className="font-medium">
                    {row.keyword}
                    {!row.tracked && (
                      <span className="block text-xs text-muted-foreground">
                        no longer tracked
                      </span>
                    )}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <PositionCell
                        cell={row.cells[column.key]}
                        previous={previous[column.key]}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!rows.length && (
        <p className="text-sm text-muted-foreground">
          {filter === "starred" && starredCount === 0
            ? "No starred keywords in this market yet. Switch to All and star the ones you target."
            : "No keyword matches this filter."}
        </p>
      )}

      {data.versions.length > VERSIONS_SHOWN_BY_DEFAULT && (
        <Button onClick={() => setShowAll((v) => !v)} size="sm" variant="outline">
          {showAll
            ? "Show fewer versions"
            : `Show all versions (${data.versions.length})`}
        </Button>
      )}

      {selected && <VersionDetails column={selected} platform={platform} />}
    </div>
  );
}
