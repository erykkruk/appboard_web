import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import type { ByVersionColumn, RankByVersion } from "@/lib/types";

import { RankByVersionTable } from "./rank-by-version-table";

function column(key: string, overrides: Partial<ByVersionColumn> = {}): ByVersionColumn {
  return {
    changedFields: [],
    inferred: false,
    key,
    listing: { keywords: "quiz,party", subtitle: "Trivia night", title: "Buzzin" },
    listings: [],
    measuredFrom: "2026-11-01T00:00:00.000Z",
    measuredTo: "2026-11-02T00:00:00.000Z",
    measurements: 4,
    releasedAt: "2026-11-01T00:00:00.000Z",
    versionString: key === "unknown" ? null : key,
    ...overrides,
  };
}

const DATA: RankByVersion = {
  country: "us",
  keywords: [
    {
      cells: {
        "1.7.4": { best: 9, delta: null, last: 9, measurements: 2, ranked: 2 },
        "1.7.5": { best: 3, delta: 6, last: 4, measurements: 2, ranked: 2 },
      },
      keyword: "party game",
      starred: true,
      tracked: true,
    },
    {
      cells: {
        "1.7.4": { best: null, delta: null, last: null, measurements: 2, ranked: 0 },
        "1.7.5": { best: 20, delta: null, last: 20, measurements: 2, ranked: 2 },
      },
      keyword: "trivia",
      starred: false,
      tracked: true,
    },
  ],
  versions: [
    column("1.7.5", {
      changedFields: ["subtitle"],
      listing: { keywords: "quiz,party", subtitle: "Werewolf & trivia", title: "Buzzin" },
    }),
    column("1.7.4", { inferred: true, listing: { keywords: "quiz", subtitle: null, title: null } }),
  ],
};

afterEach(cleanup);

describe("RankByVersionTable", () => {
  test("shows one column per version, newest first, with position and change", () => {
    render(<RankByVersionTable data={DATA} platform="ios" />);

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent ?? "");
    expect(headers[1]).toContain("1.7.5");
    expect(headers[1]).toContain("Subtitle changed");
    expect(headers[2]).toContain("estimated");

    const party = screen.getByText("party game").closest("tr") as HTMLElement;
    expect(within(party).getByText("#4")).toBeTruthy();
    expect(within(party).getByText("6")).toBeTruthy();
    expect(within(party).getByText("best #3")).toBeTruthy();
    const trivia = screen.getByText("trivia").closest("tr") as HTMLElement;
    expect(within(trivia).getByText("new")).toBeTruthy();
    expect(within(trivia).getByText("Not in top 50")).toBeTruthy();
  });

  test("shows the listing text of the version you click", () => {
    render(<RankByVersionTable data={DATA} platform="ios" />);

    expect(screen.getByText("Werewolf & trivia")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /1\.7\.4/ }));

    expect(screen.getByText("quiz")).toBeTruthy();
    expect(screen.getAllByText("Not known for this version")).toHaveLength(2);
    expect(screen.getByText("Matched afterwards from the store version history")).toBeTruthy();
  });

  test("keeps only starred keywords under the Starred filter", () => {
    render(<RankByVersionTable data={DATA} filter="starred" onFilterChange={() => {}} />);

    expect(screen.getByText("party game")).toBeTruthy();
    expect(screen.queryByText("trivia")).toBeNull();
  });

  test("explains an empty market", () => {
    render(<RankByVersionTable data={{ country: "us", keywords: [], versions: [] }} />);

    expect(screen.getByText(/No positions measured in this market yet/)).toBeTruthy();
  });
});
