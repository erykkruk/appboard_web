import { describe, expect, test } from "bun:test";

import { groupTrackedKeywords } from "@/lib/keyword-groups";
import type { TrackedKeyword } from "@/lib/types";

const LABELS: Record<string, string> = { de: "Germany", pl: "Poland" };
const label = (c: string) => LABELS[c] ?? c;

function kw(country: string, keyword: string): TrackedKeyword {
  return { appId: "a", country, createdAt: "", id: `${country}-${keyword}`, keyword };
}

const KEYWORDS = [kw("pl", "quiz rodzinny"), kw("pl", "kalambury"), kw("de", "quizshow")];

describe("groupTrackedKeywords", () => {
  test("one group per market with every keyword when not filtering", () => {
    const groups = groupTrackedKeywords(KEYWORDS, ["de", "pl"], "", label);
    expect(groups.map((g) => [g.country, g.keywords.length, g.total])).toEqual([
      ["de", 1, 1],
      ["pl", 2, 2],
    ]);
  });

  test("a keyword filter keeps only matching keywords and drops empty markets", () => {
    const groups = groupTrackedKeywords(KEYWORDS, ["de", "pl"], "kalam", label);
    expect(groups.map((g) => [g.country, g.keywords.map((k) => k.keyword), g.total])).toEqual([
      ["pl", ["kalambury"], 2],
    ]);
  });

  test("a market name filter keeps the whole market", () => {
    const groups = groupTrackedKeywords(KEYWORDS, ["de", "pl"], "pola", label);
    expect(groups.map((g) => [g.country, g.keywords.length])).toEqual([["pl", 2]]);
  });

  test("a filter matching keywords in several markets keeps each of them", () => {
    const groups = groupTrackedKeywords(KEYWORDS, ["de", "pl"], "quiz", label);
    expect(groups.map((g) => g.country)).toEqual(["de", "pl"]);
  });
});
