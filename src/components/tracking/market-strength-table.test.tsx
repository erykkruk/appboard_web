import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

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
