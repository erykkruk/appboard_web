import { describe, expect, test } from "bun:test";

import { filterByStar, isStarred, resolveKeywordFilter } from "./starred-keywords";

describe("resolveKeywordFilter", () => {
  test("an explicit choice in the URL wins", () => {
    expect(resolveKeywordFilter("all", true)).toBe("all");
    expect(resolveKeywordFilter("starred", false)).toBe("starred");
  });

  test("without a choice opens on Starred only once something is starred", () => {
    expect(resolveKeywordFilter(null, false)).toBe("all");
    expect(resolveKeywordFilter(null, true)).toBe("starred");
  });

  test("ignores an unknown value", () => {
    expect(resolveKeywordFilter("nonsense", true)).toBe("starred");
    expect(resolveKeywordFilter("", false)).toBe("all");
  });
});

describe("filterByStar", () => {
  const rows = [
    { keyword: "a", starred: true },
    { keyword: "b", starred: false },
    // A server older than 0.21.0 sends no flag: not starred.
    { keyword: "c" },
  ];

  test("Starred keeps only the starred rows", () => {
    expect(filterByStar(rows, "starred").map((r) => r.keyword)).toEqual(["a"]);
  });

  test("All keeps every row", () => {
    expect(filterByStar(rows, "all")).toHaveLength(3);
  });

  test("a missing flag is not starred", () => {
    expect(isStarred({})).toBe(false);
  });
});
