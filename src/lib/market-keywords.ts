import { isWinnableScore } from "@/lib/aso-engine/listing-audit";
import { MAX_KEYWORDS_PER_SCORING } from "@/lib/keyword-research";
import { type KeywordFilter, isStarred } from "@/lib/starred-keywords";
import type { BoardKeyword, KeywordSuggestion } from "@/lib/types";

/** One row of the per-market keyword table: a tracked keyword or an idea. */
export interface MarketKeywordRow {
  keyword: string;
  tracked: boolean;
  /** Tracked keyword id; null for an idea (or history no longer tracked). */
  keywordId: string | null;
  starred: boolean;
  /**
   * Tracked: latest rank check (undefined = never checked, null = not in
   * the scanned results). Idea: App Store position seen when it was scored.
   */
  position: number | null | undefined;
  popularity: number | null;
  difficulty: number | null;
  difficultyTrend: Array<number | null>;
  scoredAt: string | null;
  winnable: boolean | null;
}

function trackedRow(k: BoardKeyword): MarketKeywordRow {
  const position = k.measuredAt === null ? undefined : k.position;
  return {
    difficulty: k.difficulty,
    difficultyTrend: k.scoreTrend.map((p) => p.difficulty),
    keyword: k.keyword,
    keywordId: k.keywordId ?? null,
    popularity: k.popularity,
    position,
    scoredAt: k.scoredAt,
    starred: isStarred(k),
    tracked: true,
    winnable:
      k.difficulty === null
        ? null
        : isWinnableScore({ appRank: k.position, difficulty: k.difficulty }),
  };
}

function ideaRow(s: KeywordSuggestion): MarketKeywordRow {
  return {
    difficulty: s.difficulty,
    difficultyTrend: [],
    keyword: s.keyword,
    keywordId: null,
    popularity: s.popularity,
    position: s.scoredAt === null ? undefined : s.appRank,
    scoredAt: s.scoredAt,
    starred: false,
    tracked: false,
    winnable: s.winnable,
  };
}

function byPopularity(a: MarketKeywordRow, b: MarketKeywordRow): number {
  return (b.popularity ?? -1) - (a.popularity ?? -1);
}

function byPosition(a: MarketKeywordRow, b: MarketKeywordRow): number {
  const pa = a.position ?? Number.POSITIVE_INFINITY;
  const pb = b.position ?? Number.POSITIVE_INFINITY;
  return pa - pb || byPopularity(a, b) || a.keyword.localeCompare(b.keyword);
}

/**
 * Tracked keywords first (best position, then most searched), then the ideas
 * for the market (most searched first, unscored last). An idea that is
 * already tracked is dropped, so a row never shows up twice.
 */
export function buildMarketKeywordRows(
  tracked: BoardKeyword[],
  suggestions: KeywordSuggestion[],
): MarketKeywordRow[] {
  const trackedRows = tracked.map(trackedRow).sort(byPosition);
  const taken = new Set(trackedRows.map((r) => r.keyword.toLowerCase()));
  const ideas = suggestions
    .filter((s) => !taken.has(s.keyword.toLowerCase()))
    .map(ideaRow)
    .sort(
      (a, b) =>
        Number(a.scoredAt === null) - Number(b.scoredAt === null) ||
        byPopularity(a, b) ||
        a.keyword.localeCompare(b.keyword),
    );
  return [...trackedRows, ...ideas];
}

/**
 * Starred narrows the tracked keywords to the starred ones; ideas always stay
 * listed, they are where the next keyword to star comes from.
 */
export function filterMarketKeywordRows(
  rows: MarketKeywordRow[],
  filter: KeywordFilter,
): MarketKeywordRow[] {
  return filter === "starred" ? rows.filter((r) => !r.tracked || r.starred) : rows;
}

/**
 * What one "Score missing" click sends: never-scored rows, tracked ones
 * first, capped at one scoring request's limit so a page never fires
 * hundreds of store searches.
 */
export function keywordsToScore(
  rows: MarketKeywordRow[],
  limit = MAX_KEYWORDS_PER_SCORING,
): string[] {
  return rows
    .filter((r) => r.scoredAt === null)
    .sort((a, b) => Number(b.tracked) - Number(a.tracked))
    .slice(0, limit)
    .map((r) => r.keyword);
}
