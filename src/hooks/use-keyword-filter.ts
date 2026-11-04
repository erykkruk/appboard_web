"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  KEYWORD_FILTER_PARAM,
  type KeywordFilter,
  resolveKeywordFilter,
} from "@/lib/starred-keywords";

/**
 * The Starred / All keyword filter, kept in the URL (`?kw=starred`) so a
 * shared link, a reload and the back button keep the same view. Without a
 * choice in the URL it follows `hasStarred` (see resolveKeywordFilter).
 *
 * The URL is written with `history.replaceState`, which the App Router syncs
 * into `useSearchParams` (every list on the page follows one choice) without
 * a navigation. The local copy keeps the switch working where no router is
 * mounted (tests, embeds).
 */
export function useKeywordFilter(hasStarred: boolean): {
  filter: KeywordFilter;
  /**
   * Fix the view in place before starring: the first star must not flip a
   * default "All" list to "Starred" under the user's cursor.
   */
  pin: () => void;
  setFilter: (next: KeywordFilter) => void;
} {
  const searchParams = useSearchParams();
  const [picked, setPicked] = useState<KeywordFilter | null>(null);
  const chosen = searchParams?.get(KEYWORD_FILTER_PARAM) ?? picked;
  const filter = resolveKeywordFilter(chosen, hasStarred);

  function setFilter(next: KeywordFilter) {
    setPicked(next);
    const url = new URL(window.location.href);
    url.searchParams.set(KEYWORD_FILTER_PARAM, next);
    window.history.replaceState(window.history.state, "", url.toString());
  }

  function pin() {
    if (chosen === null) setFilter(filter);
  }

  return { filter, pin, setFilter };
}
