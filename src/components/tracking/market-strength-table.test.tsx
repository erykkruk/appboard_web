import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { TrackingMarket } from "@/lib/types";

import { MarketStrengthTable } from "./market-strength-table";

afterEach(cleanup);

function market(country: string, overrides: Partial<TrackingMarket> = {}): TrackingMarket {
  return {
    avgPosition: null,
    bestPosition: null,
    country,
    declined: 0,
    dropped: 0,
    entered: 0,
    failedLastRun: 0,
    improved: 0,
    lastCheckedAt: null,
    measured: 0,
    medianPosition: null,
    ranked: 0,
    top10: 0,
    top50: 0,
    tracked: 3,
    ...overrides,
  };
}

function renderTable(markets: TrackingMarket[]) {
  render(
    <MarketStrengthTable homeCountry={null} markets={markets} onSelect={() => {}} selected="pl" />,
  );
}

describe("MarketStrengthTable starred column", () => {
  test("stays hidden until something is starred", () => {
    renderTable([market("pl"), market("us")]);
    expect(screen.queryByText("Starred top 10")).toBeNull();
  });

  test("shows starred in the top 10 of all starred per market", () => {
    renderTable([market("pl", { starred: 2, starredTop10: 1 }), market("us")]);
    expect(screen.getByText("Starred top 10")).toBeDefined();
    expect(screen.getByText("1/2")).toBeDefined();
  });
});

describe("MarketStrengthTable sparklines", () => {
  const history = {
    from: "2026-08-07",
    markets: [
      {
        country: "pl",
        points: [
          { day: "2026-11-02", measured: 3, median: 30, ranked: 1, top10: 0, top50: 1, tracked: 3 },
          { day: "2026-11-03", measured: 3, median: 8, ranked: 2, top10: 1, top50: 2, tracked: 3 },
        ],
      },
    ],
    timeZone: "Europe/Warsaw",
    to: "2026-11-03",
  };

  test("are absent without history", () => {
    renderTable([market("pl"), market("us")]);
    expect(screen.queryByRole("button", { name: /day-by-day chart/ })).toBeNull();
  });

  test("open the chart without picking the market row", async () => {
    const picked: string[] = [];
    render(
      <MarketStrengthTable
        history={history}
        homeCountry={null}
        markets={[market("pl", { earnedTop10: 1 }), market("us")]}
        onSelect={(country) => picked.push(country)}
        selected="us"
      />,
    );
    expect(screen.getAllByRole("button", { name: /day-by-day chart/ })).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: /^Top 10 in Poland/ }));

    expect(await screen.findByText("Top 10 in Poland")).toBeDefined();
    expect(picked).toEqual([]);
  });
});
