"use client";

import { Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useResearchSearch } from "@/hooks/use-research";
import {
  parseStoreLinks,
  researchAppKey,
  type ResearchListedApp,
} from "@/lib/research";
import type { ResearchSearchScope, ResearchSuggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

import { STORE_LABELS, STORE_SHORT_LABELS } from "./shared";

const SEARCH_DEBOUNCE_MS = 350;

const SCOPE_OPTIONS: Array<{ label: string; value: ResearchSearchScope }> = [
  { label: "Both", value: "both" },
  { label: "App Store", value: "appstore" },
  { label: "Google Play", value: "playstore" },
];

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function AppListSection({
  apps,
  country,
  onAdd,
  onRemove,
  onToggle,
}: {
  apps: ResearchListedApp[];
  country: string;
  onAdd: (suggestion: ResearchSuggestion) => void;
  onRemove: (key: string) => void;
  onToggle: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ResearchSearchScope>("both");
  const [links, setLinks] = useState("");

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const search = useResearchSearch(debouncedQuery, country, scope);
  const suggestions = search.data ?? [];
  const showSuggestions =
    debouncedQuery.trim().length >= 2 && query.trim().length >= 2;

  function addLinks() {
    for (const parsed of parseStoreLinks(links, country)) {
      onAdd({
        developer: "(from link)",
        id: parsed.id,
        store: parsed.store,
        title: parsed.url.length > 50 ? parsed.id : parsed.url,
        url: parsed.url,
      });
    }
    setLinks("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. App list</CardTitle>
        <CardDescription>
          Add apps from search or paste store links. The list is saved in your
          browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search apps by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex shrink-0 overflow-hidden rounded-md border">
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScope(option.value)}
                className={cn(
                  "px-3 text-sm transition-colors",
                  scope === option.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {showSuggestions && (search.isFetching || suggestions.length > 0) && (
          <div className="max-h-72 overflow-y-auto rounded-md border">
            {search.isFetching && suggestions.length === 0 && (
              <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </p>
            )}
            {suggestions.map((suggestion) => {
              const key = researchAppKey(suggestion);
              const onList = apps.some((a) => researchAppKey(a) === key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => (onList ? onRemove(key) : onAdd(suggestion))}
                  className={cn(
                    "flex w-full items-center gap-3 border-b p-2 text-left last:border-b-0 hover:bg-accent",
                    onList && "bg-accent",
                  )}
                >
                  {suggestion.icon && (
                    <img
                      src={suggestion.icon}
                      alt=""
                      className="h-9 w-9 rounded-lg"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {suggestion.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {suggestion.developer}
                      {suggestion.rating
                        ? ` · ★ ${suggestion.rating.toFixed(1)}`
                        : ""}
                    </span>
                  </span>
                  <Badge variant="secondary">
                    {STORE_LABELS[suggestion.store]}
                  </Badge>
                  <span className="w-16 text-center text-xs text-muted-foreground">
                    {onList ? "listed ✓" : "+ add"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            className="min-h-16"
            placeholder="…or paste App Store / Google Play links (one per line)"
            value={links}
            onChange={(e) => setLinks(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={addLinks}
            disabled={!links.trim()}
          >
            <Plus className="h-4 w-4" />
            Add to list
          </Button>
        </div>

        {apps.length > 0 && (
          <div className="rounded-md border">
            {apps.map((app) => {
              const key = researchAppKey(app);
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 border-b p-2 last:border-b-0"
                >
                  <Checkbox
                    checked={app.checked}
                    onCheckedChange={() => onToggle(key)}
                    aria-label={`Select ${app.title}`}
                  />
                  {app.icon && (
                    <img src={app.icon} alt="" className="h-8 w-8 rounded-lg" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {app.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {app.developer}
                    </span>
                  </span>
                  <Badge variant="secondary">
                    {STORE_SHORT_LABELS[app.store]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(key)}
                    aria-label="Remove from list"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
