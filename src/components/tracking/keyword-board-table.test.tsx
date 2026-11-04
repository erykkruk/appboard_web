import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { BoardKeyword } from "@/lib/types";

import { KeywordBoardTable } from "./keyword-board-table";

afterEach(cleanup);

function keyword(overrides: Partial<BoardKeyword> = {}): BoardKeyword {
  return {
    bestPosition: 3,
    classification: "sweet-spot",
    country: "pl",
    delta: 9,
    difficulty: 34,
    difficultyDelta: -6,
    difficultyLabel: "easy",
    keyword: "quiz na tv",
    leader: {
      developer: "Rival Studio",
      rating: 4.5,
      ratingsCount: 12000,
      title: "Rival App",
    },
    measuredAt: "2026-09-06",
    metadataFields: ["subtitle"],
    opportunity: 70,
    pick: true,
    platform: "appstore",
    popularity: 55,
    position: 3,
    previousPosition: 12,
    rankTrend: [
      { day: "2026-09-05", position: 12 },
      { day: "2026-09-06", position: 3 },
    ],
    scoreTrend: [
      { day: "2026-09-05", difficulty: 40, popularity: 55 },
      { day: "2026-09-06", difficulty: 34, popularity: 55 },
    ],
    scoredAt: "2026-09-06",
    ...overrides,
  };
}

describe("KeywordBoardTable", () => {
  test("shows position, difficulty, metadata use and the leader in one row", () => {
    render(<KeywordBoardTable keywords={[keyword()]} />);

    expect(screen.getByText("quiz na tv")).toBeDefined();
    // Current position and best position are both #3 for this row.
    expect(screen.getAllByText("#3")).toHaveLength(2);
    expect(screen.getByText("34")).toBeDefined();
    expect(screen.getByText("subtitle")).toBeDefined();
    expect(screen.getByText(/Rival App/)).toBeDefined();
  });

  test("says 'not in top 50' for a measured keyword we do not rank for", () => {
    render(
      <KeywordBoardTable
        keywords={[keyword({ bestPosition: null, position: null })]}
      />,
    );
    expect(screen.getByText("Not in top 50")).toBeDefined();
  });

  test("distinguishes never measured from measured and absent", () => {
    render(
      <KeywordBoardTable
        keywords={[keyword({ measuredAt: null, position: null })]}
      />,
    );
    expect(screen.getByText("Not checked")).toBeDefined();
  });

  test("filters down to winnable targets on request", () => {
    render(
      <KeywordBoardTable
        keywords={[
          keyword(),
          keyword({
            classification: "high-competition",
            difficulty: 88,
            keyword: "gry",
            pick: false,
          }),
        ]}
      />,
    );
    expect(screen.getByText("gry")).toBeDefined();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.queryByText("gry")).toBeNull();
    expect(screen.getByText("quiz na tv")).toBeDefined();
  });

  test("searches by keyword text", () => {
    render(
      <KeywordBoardTable
        keywords={[keyword(), keyword({ keyword: "kalambury" })]}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("Search keyword"), {
      target: { value: "kalam" },
    });
    expect(screen.queryByText("quiz na tv")).toBeNull();
    expect(screen.getByText("kalambury")).toBeDefined();
  });
});

describe("KeywordBoardTable stars", () => {
  const rows = [
    keyword({ keyword: "ours", keywordId: "kw-1", starred: true }),
    keyword({ keyword: "other", keywordId: "kw-2" }),
    keyword({ keyword: "history only", keywordId: null }),
  ];

  test("Starred shows only the starred rows", () => {
    render(<KeywordBoardTable filter="starred" keywords={rows} onFilterChange={() => {}} />);
    expect(screen.getByText("ours")).toBeDefined();
    expect(screen.queryByText("other")).toBeNull();
    expect(screen.getByRole("button", { name: "Starred (1)" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  test("an empty Starred view says how to star", () => {
    render(
      <KeywordBoardTable
        filter="starred"
        keywords={[keyword({ keyword: "other" })]}
        onFilterChange={() => {}}
      />,
    );
    expect(screen.getByText(/No starred keywords in this market yet/)).toBeDefined();
  });

  test("stars a row; a phrase that is no longer tracked cannot be starred", () => {
    const onToggleStar = mock(() => {});
    render(<KeywordBoardTable keywords={rows} onToggleStar={onToggleStar} />);
    fireEvent.click(screen.getByRole("button", { name: "Star other" }));
    expect(onToggleStar).toHaveBeenCalledWith(rows[1]);
    expect(
      (screen.getByRole("button", { name: "Star history only" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test("without the callbacks the table has no star column or switch", () => {
    render(<KeywordBoardTable keywords={rows} />);
    expect(screen.queryByRole("button", { name: /Star / })).toBeNull();
    expect(screen.queryByRole("group", { name: "Show keywords" })).toBeNull();
  });
});
