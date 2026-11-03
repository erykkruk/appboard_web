"use client";

import { ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupTrackedKeywords } from "@/lib/keyword-groups";
import { marketLabel } from "@/lib/markets";
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
  keywords,
  markets,
  maxPerMarket,
  onRemove,
  selectedCountry,
}: {
  countries: string[];
  keywords: TrackedKeyword[];
  /** Ranking counts per market, when the overview has loaded. */
  markets: TrackingMarket[];
  maxPerMarket: number;
  onRemove: (keywordId: string) => void;
  selectedCountry: string;
}) {
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const statsByCountry = useMemo(
    () => new Map(markets.map((m) => [m.country, m])),
    [markets],
  );
  const groups = useMemo(
    () => groupTrackedKeywords(keywords, countries, query, marketLabel),
    [countries, keywords, query],
  );
  const filtering = query.trim().length > 0;

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
            No keyword or market matches &quot;{query}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
