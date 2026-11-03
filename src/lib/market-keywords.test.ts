import { describe, expect, test } from "bun:test";

import { MAX_KEYWORDS_PER_SCORING } from "@/lib/keyword-research";
import type { BoardKeyword, KeywordSuggestion } from "@/lib/types";

import { buildMarketKeywordRows, keywordsToScore } from "./market-keywords";

function tracked(name: string, overrides: Partial<BoardKeyword> = {}): BoardKeyword {
  return {
    bestPosition: null,
    classification: null,
    country: "pl",
    delta: null,
    difficulty: null,
    difficultyDelta: null,
    difficultyLabel: null,
    keyword: name,
    leader: null,
    measuredAt: "2026-11-03T00:00:00.000Z",
    metadataFields: [],
    opportunity: null,
    pick: false,
    platform: "appstore",
    popularity: null,
    position: null,
    previousPosition: null,
    rankTrend: [],
    scoreTrend: [],
    scoredAt: null,
    ...overrides,
  };
}

function idea(name: string, overrides: Partial<KeywordSuggestion> = {}): KeywordSuggestion {
  return {
    appRank: null,
    classification: null,
    difficulty: null,
    keyword: name,
    opportunity: null,
    popularity: null,
    scoredAt: null,
    winnable: null,
    ...overrides,
  };
}

describe("buildMarketKeywordRows", () => {
  test("lists tracked keywords by position, then ideas by popularity with unscored last", () => {
    const rows = buildMarketKeywordRows(
      [
        tracked("kalambury", { position: 12 }),
        tracked("quiz rodzinny", { position: 3 }),
        tracked("gry na impreze", { position: null, popularity: 40 }),
      ],
      [
        idea("teleturniej", { popularity: 20, scoredAt: "2026-11-03" }),
        idea("gra na tv"),
        idea("quiz dla par", { popularity: 50, scoredAt: "2026-11-03" }),
      ],
    );
    expect(rows.map((r) => r.keyword)).toEqual([
      "quiz rodzinny",
      "kalambury",
      "gry na impreze",
      "quiz dla par",
      "teleturniej",
      "gra na tv",
    ]);
    expect(rows.slice(0, 3).every((r) => r.tracked)).toBe(true);
    expect(rows.slice(3).every((r) => !r.tracked)).toBe(true);
  });

  test("drops an idea that is already tracked, ignoring case", () => {
    const rows = buildMarketKeywordRows(
      [tracked("Quiz Rodzinny")],
      [idea("quiz rodzinny"), idea("teleturniej")],
    );
    expect(rows.map((r) => r.keyword)).toEqual(["Quiz Rodzinny", "teleturniej"]);
  });

  test("keeps 'never checked' apart from 'not in the results' and carries the difficulty trend", () => {
    const [unchecked, missing] = buildMarketKeywordRows(
      [
        tracked("a", { measuredAt: null }),
        tracked("b", {
          difficulty: 30,
          position: null,
          scoreTrend: [
            { day: "2026-11-02", difficulty: 40, popularity: 10 },
            { day: "2026-11-03", difficulty: 30, popularity: 12 },
          ],
          scoredAt: "2026-11-03",
        }),
      ],
      [],
    ).sort((x, y) => x.keyword.localeCompare(y.keyword));
    expect(unchecked.position).toBeUndefined();
    expect(missing.position).toBeNull();
    expect(missing.difficultyTrend).toEqual([40, 30]);
    expect(missing.winnable).toBe(true);
    expect(unchecked.winnable).toBeNull();
  });

  test("an idea that was never scored has no position yet", () => {
    const [row] = buildMarketKeywordRows([], [idea("teleturniej", { appRank: 7 })]);
    expect(row.position).toBeUndefined();
  });
});

describe("keywordsToScore", () => {
  test("sends only unscored rows, tracked first, capped at one scoring request", () => {
    const rows = buildMarketKeywordRows(
      [tracked("scored", { difficulty: 10, scoredAt: "2026-11-03" }), tracked("tracked new")],
      Array.from({ length: 30 }, (_, i) => idea(`idea ${String(i).padStart(2, "0")}`)),
    );
    const picked = keywordsToScore(rows);
    expect(picked[0]).toBe("tracked new");
    expect(picked).not.toContain("scored");
    expect(picked).toHaveLength(MAX_KEYWORDS_PER_SCORING);
  });

  test("returns nothing when every row is scored", () => {
    const rows = buildMarketKeywordRows(
      [tracked("a", { difficulty: 10, scoredAt: "2026-11-03" })],
      [idea("b", { difficulty: 20, scoredAt: "2026-11-03" })],
    );
    expect(keywordsToScore(rows)).toEqual([]);
  });
});
