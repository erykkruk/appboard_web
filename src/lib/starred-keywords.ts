/** Which keywords a list shows: only the team's own (starred) ones, or all. */
export type KeywordFilter = "starred" | "all";

/** URL query key of the filter, e.g. `?kw=starred`. */
export const KEYWORD_FILTER_PARAM = "kw";

const KEYWORD_FILTERS: readonly KeywordFilter[] = ["starred", "all"];

/** A server older than 0.21.0 sends no `starred`: nothing is starred there. */
export function isStarred(keyword: { starred?: boolean }): boolean {
  return keyword.starred === true;
}

/**
 * The filter in effect: an explicit choice from the URL wins; without one a
 * list opens on the starred keywords once the market has any, and on all of
 * them until then (an empty "Starred" view would look like lost data).
 */
export function resolveKeywordFilter(
  param: string | null,
  hasStarred: boolean,
): KeywordFilter {
  if (KEYWORD_FILTERS.includes(param as KeywordFilter)) {
    return param as KeywordFilter;
  }
  return hasStarred ? "starred" : "all";
}

export function filterByStar<T extends { starred?: boolean }>(
  items: T[],
  filter: KeywordFilter,
): T[] {
  return filter === "starred" ? items.filter(isStarred) : items;
}
