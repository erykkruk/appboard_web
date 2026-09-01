"use client";

import { Loader2, Plus, Search, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useIsFeatureEnabled } from "@/hooks/use-features";
import { useResearchSearch } from "@/hooks/use-research";
import { useImportApp } from "@/hooks/use-stores";
import { parseStoreUrl } from "@/lib/research";
import type { ImportAppInput, ResearchSuggestion } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 350;

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * The link-first "add your app" input: paste an App Store / Google Play link
 * (or search by name) and get a fully synced app from public data - no API
 * credentials needed.
 */
export function AddAppForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const importApp = useImportApp();
  const researchEnabled = useIsFeatureEnabled("RESEARCH");

  const [query, setQuery] = useState("");
  const [formError, setFormError] = useState("");

  const term = query.trim();
  const isLink = parseStoreUrl(term) !== null;
  // A half-typed URL is not a name search yet.
  const looksLikeUrl = isLink || term.includes("://");
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS);
  const search = useResearchSearch(
    researchEnabled && !looksLikeUrl && !importApp.isPending
      ? debouncedTerm
      : "",
    "us",
    "both",
  );
  const suggestions = search.data ?? [];
  const showSuggestions =
    researchEnabled &&
    !looksLikeUrl &&
    term.length >= 2 &&
    debouncedTerm.length >= 2;

  const runImport = useCallback(
    async (input: ImportAppInput) => {
      if (importApp.isPending) return;
      setFormError("");
      try {
        const result = await importApp.mutateAsync(input);
        toast.success(
          result.created
            ? `${result.app.name} added - public data synced`
            : `${result.app.name} is already in your workspace`,
        );
        router.push(`/apps/${result.app.id}/dashboard`);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Failed to import the app. Please try again.";
        setFormError(message);
        toast.error(message);
      }
    },
    [importApp, router],
  );

  const pickSuggestion = (suggestion: ResearchSuggestion) =>
    runImport({
      externalId: suggestion.id,
      platform: suggestion.store === "appstore" ? "ios" : "android",
    });

  const submitQuery = () => {
    if (!term) return;
    if (isLink) {
      // Country only when the pasted URL actually carries one - the backend
      // derives it from the link otherwise (defaults to "us").
      const parsed = parseStoreUrl(term, "");
      runImport(
        parsed?.country
          ? { country: parsed.country, url: term }
          : { url: term },
      );
      return;
    }
    if (suggestions.length > 0) {
      pickSuggestion(suggestions[0]);
      return;
    }
    setFormError(
      researchEnabled
        ? "Paste an App Store / Google Play link, or type an app name and pick it from the list."
        : "Paste an App Store or Google Play link to your app.",
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitQuery();
      }}
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            autoFocus={autoFocus}
            placeholder={
              researchEnabled
                ? "App name, or paste a store link…"
                : "Paste an App Store / Google Play link…"
            }
            value={query}
            disabled={importApp.isPending}
            onChange={(e) => {
              setQuery(e.target.value);
              setFormError("");
            }}
            className="h-11"
          />
          {showSuggestions && (search.isFetching || suggestions.length > 0) && (
            <div className="absolute inset-x-0 top-12 z-40 max-h-80 overflow-y-auto rounded-lg border bg-background text-left shadow-lg">
              {search.isFetching && suggestions.length === 0 && (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching both stores…
                </div>
              )}
              {suggestions.map((s) => (
                <button
                  key={`${s.store}:${s.id}`}
                  type="button"
                  className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-muted/60"
                  onClick={() => pickSuggestion(s)}
                >
                  {s.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.icon}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-lg"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {s.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.developer}
                    </span>
                  </span>
                  <Badge variant="secondary" className="flex-none text-xs">
                    {s.store === "appstore" ? "App Store" : "Google Play"}
                  </Badge>
                  {s.rating ? (
                    <span className="flex flex-none items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {s.rating.toFixed(1)}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          type="submit"
          className="h-11 flex-none"
          disabled={importApp.isPending || !term}
        >
          {importApp.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Add app
        </Button>
      </div>
      {importApp.isPending && (
        <p className="mt-2 flex items-center gap-2 text-left text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Syncing public data - listing, screenshots, ratings and reviews…
        </p>
      )}
      {!importApp.isPending && formError && (
        <p className="mt-2 text-left text-xs text-destructive">{formError}</p>
      )}
      {!importApp.isPending && !formError && (
        <p className="mt-2 text-left text-xs text-muted-foreground">
          No API credentials needed - we pull the public store listing.
        </p>
      )}
    </form>
  );
}

export function AddAppDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add your app
          </DialogTitle>
          <DialogDescription>
            Paste a store link or search by name. You get the full listing,
            screenshots, ratings and reviews instantly - connect API
            credentials later only if you want to publish.
          </DialogDescription>
        </DialogHeader>
        <AddAppForm autoFocus />
      </DialogContent>
    </Dialog>
  );
}
