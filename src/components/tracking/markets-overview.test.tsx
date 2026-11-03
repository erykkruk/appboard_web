import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { TrackingMarket, TrackingMarketsOverview } from "@/lib/types";

import { MarketsOverview } from "./markets-overview";

afterEach(cleanup);

function market(country: string, overrides: Partial<TrackingMarket> = {}): TrackingMarket {
  return {
    avgPosition: 12.5,
    bestPosition: 2,
    country,
    declined: 0,
    dropped: 0,
    entered: 0,
    failedLastRun: 0,
    improved: 0,
    lastCheckedAt: "2026-11-03T00:00:00.000Z",
    measured: 10,
    medianPosition: 9,
    ranked: 6,
    top10: 4,
    top50: 6,
    tracked: 10,
    ...overrides,
  };
}

function overview(markets: TrackingMarket[]): TrackingMarketsOverview {
  return {
    app: { devices: ["phone"], externalId: "1", id: "a", name: "Buzzin", platform: "ios" },
    lastRun: null,
    markets,
    rankTracking: {
      devices: ["phone"],
      note: null,
      store: "appstore",
      supported: true,
      surface: "iphone-search",
    },
    totals: {
      ...market("all", { failedLastRun: 2, ranked: 12, top10: 8, tracked: 20 }),
      markets: markets.length,
    },
  };
}

describe("MarketsOverview", () => {
  test("one row per market with names, counts and movement", () => {
    render(
      <MarketsOverview
        onSelect={() => {}}
        overview={overview([
          market("pl", { declined: 1, improved: 3 }),
          market("us", { dropped: 1, entered: 2, measured: 8 }),
        ])}
        selectedCountry="pl"
      />,
    );

    expect(screen.getByText("Poland")).toBeDefined();
    expect(screen.getByText("United States")).toBeDefined();
    expect(screen.getByText("2 not measured")).toBeDefined();
    expect(screen.getByText("+2 in")).toBeDefined();
    expect(screen.getByText("-1 out")).toBeDefined();
    expect(screen.getByText(/12 of 20 keywords ranking/)).toBeDefined();
    expect(screen.getByText(/2 could not be measured/)).toBeDefined();
  });

  test("picking a market opens its board", () => {
    const onSelect = mock(() => {});
    render(
      <MarketsOverview
        onSelect={onSelect}
        overview={overview([market("de"), market("es")])}
        selectedCountry="de"
      />,
    );
    fireEvent.click(screen.getByText("Spain"));
    expect(onSelect).toHaveBeenCalledWith("es");
  });

  test("filters a long market list by name or code", () => {
    const codes = ["at", "be", "ch", "de", "dk", "es", "fi", "fr", "it"];
    render(
      <MarketsOverview
        onSelect={() => {}}
        overview={overview(codes.map((c) => market(c)))}
        selectedCountry="at"
      />,
    );
    fireEvent.change(screen.getByLabelText("Filter markets"), {
      target: { value: "fin" },
    });
    expect(screen.getByText("Finland")).toBeDefined();
    expect(screen.queryByText("Germany")).toBeNull();
  });

  test("explains an empty overview", () => {
    render(
      <MarketsOverview onSelect={() => {}} overview={overview([])} selectedCountry="us" />,
    );
    expect(screen.getByText(/No markets yet/)).toBeDefined();
  });
});
