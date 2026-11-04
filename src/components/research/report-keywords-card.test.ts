import { describe, expect, test } from "bun:test";

import { trackedKeywordsFor } from "./report-keywords-card";

describe("trackedKeywordsFor", () => {
  test("returns the market's tracked keywords, case-insensitively", () => {
    const tracked = trackedKeywordsFor(
      [
        { country: "PL", keyword: "Buzz Gra" },
        { country: "pl", keyword: "teleturniej " },
        { country: "de", keyword: "partyspiele" },
      ],
      "pl",
    );
    expect([...tracked].sort()).toEqual(["buzz gra", "teleturniej"]);
  });

  test("is empty for a market without tracked keywords", () => {
    expect(trackedKeywordsFor([{ country: "us", keyword: "trivia" }], "pl").size).toBe(0);
  });
});
