"use client";

import { ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";

import { StarToggle } from "@/components/tracking/star-toggle";
import { StarredFilter } from "@/components/tracking/starred-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupTrackedKeywords } from "@/lib/keyword-groups";
import { marketLabel } from "@/lib/markets";
import {
  filterByStar,
  isStarred,
  type KeywordFilter,
} from "@/lib/starred-keywords";
import type { TrackedKeyword, TrackingMarket } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Tracked keywords as one collapsible row per market. Hundreds of chips in
 * one wall hid the tracker below; collapsed rows keep every market scannable
 * (name, slots used, how many rank) and open on demand. The selected market
 * starts open, a filter opens every match.
 */
export function TrackedKeywordGroups({
  countries,
  filter = "all",
  keywords,
  markets,
  maxPerMarket,
  onFilterChange,
  onRemove,
  onToggleStar,
  selectedCountry,
}: {
  countries: string[];
  /** Starred / All; the switch shows when `onFilterChange` is given. */
  filter?: KeywordFilter;
  keywords: TrackedKeyword[];
  /** Ranking counts per market, when the overview has loaded. */
  markets: TrackingMarket[];
  maxPerMarket: number;
  onFilterChange?: (next: KeywordFilter) => void;
  onRemove: (keywordId: string) => void;
  /** Star buttons show on each keyword when given. */
  onToggleStar?: (keyword: TrackedKeyword) => void;
  selectedCountry: string;
}) {
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const statsByCountry = useMemo(
    () => new Map(markets.map((m) => [m.country, m])),
    [markets],
  );
  const groups = useMemo(() => {
    const shown = filterByStar(keywords, filter);
    const totals = new Map<string, number>();
    for (const k of keywords) totals.set(k.country, (totals.get(k.country) ?? 0) + 1);
    // Slots used stay the market's real count whatever the star filter.
    return groupTrackedKeywords(shown, countries, query, marketLabel)
      .filter((group) => filter === "all" || group.keywords.length > 0)
      .map((group) => ({ ...group, total: totals.get(group.country) ?? 0 }));
  }, [countries, filter, keywords, query]);
  const starredCount = keywords.filter(isStarred).length;
  const filtering = query.trim().length > 0 || filter === "starred";

  const isOpen = (country: string) =>
    filtering ||
    opened.has(country) ||
    (country === selectedCountry && !closed.has(country));

  function toggle(country: string) {
    const open = isOpen(country);
    setOpened((current) => {
      const next = new Set(current);
      if (open) next.delete(country);
      else next.add(country);
      return next;
    });
    setClosed((current) => {
      const next = new Set(current);
      if (open) next.add(country);
      else next.delete(country);
      return next;
    });
  }

  function expandAll() {
    setOpened(new Set(countries));
    setClosed(new Set());
  }

  function collapseAll() {
    setOpened(new Set());
    setClosed(new Set(countries));
  }

  if (!countries.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {onFilterChange && (
          <StarredFilter
            allCount={keywords.length}
            filter={filter}
            onChange={onFilterChange}
            starredCount={starredCount}
          />
        )}
        <Input
          aria-label="Filter keywords and markets"
          className="max-w-xs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter keywords or markets"
          value={query}
        />
        <Button onClick={expandAll} size="sm" variant="ghost">
          Expand all
        </Button>
        <Button onClick={collapseAll} size="sm" variant="ghost">
          Collapse all
        </Button>
        <span className="text-xs text-muted-foreground">
          {keywords.length} keywords in {countries.length}{" "}
          {countries.length === 1 ? "market" : "markets"}
        </span>
      </div>

      <div className="divide-y rounded-md border">
        {groups.map((group) => {
          const open = isOpen(group.country);
          const stats = statsByCountry.get(group.country);
          const panelId = `tracked-${group.country}`;
          return (
            <div key={group.country}>
              <button
                aria-controls={panelId}
                aria-expanded={open}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50",
                  group.country === selectedCountry && "bg-muted/40",
                )}
                onClick={() => toggle(group.country)}
                type="button"
              >
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-90",
                  )}
                />
                <span className="font-medium">{marketLabel(group.country)}</span>
                <span className="text-xs text-muted-foreground">
                  {group.country.toUpperCase()}
                </span>
                <span className="ml-auto flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                  {stats && (
                    <span>
                      {stats.ranked} ranked · {stats.top10} top 10
                    </span>
                  )}
                  <span>
                    {filtering && group.keywords.length !== group.total
                      ? `${group.keywords.length} of `
                      : ""}
                    {group.total}/{maxPerMarket}
                  </span>
                </span>
              </button>
              {open && (
                <div className="flex flex-wrap gap-2 px-3 pt-1 pb-3" id={panelId}>
                  {group.keywords.map((k) => (
                    <Badge key={k.id} className="gap-1 pr-1" variant="secondary">
                      {onToggleStar && (
                        <StarToggle
                          className="-ml-1 h-5 w-5"
                          keyword={k.keyword}
                          onToggle={() => onToggleStar(k)}
                          starred={isStarred(k)}
                        />
                      )}
                      {k.keyword}
                      <button
                        aria-label={`Remove ${k.keyword}`}
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                        onClick={() => onRemove(k.id)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!groups.length && (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            {query.trim()
              ? <>No keyword or market matches &quot;{query}&quot;.</>
              : "No starred keywords yet. Switch to All and star the ones you target."}
          </p>
        )}
      </div>
    </div>
  );
}
