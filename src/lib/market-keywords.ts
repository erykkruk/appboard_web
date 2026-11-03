import { isWinnableScore } from "@/lib/aso-engine/listing-audit";
import { MAX_KEYWORDS_PER_SCORING } from "@/lib/keyword-research";
import type { BoardKeyword, KeywordSuggestion } from "@/lib/types";

/** One row of the per-market keyword table: a tracked keyword or an idea. */
export interface MarketKeywordRow {
  keyword: string;
  tracked: boolean;
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
    popularity: k.popularity,
    position,
    scoredAt: k.scoredAt,
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
    popularity: s.popularity,
    position: s.scoredAt === null ? undefined : s.appRank,
    scoredAt: s.scoredAt,
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
