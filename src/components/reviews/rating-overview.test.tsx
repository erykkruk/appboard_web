import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RatingOverview } from "./rating-overview";
import { GROUP_SUMMARY } from "@/test/ratings-fixtures";
import type { RatingsSummary } from "@/lib/types";

afterEach(() => cleanup());

describe("RatingOverview", () => {
  test("shows the total and a line per store", () => {
    const { container } = render(
      <RatingOverview
        summary={GROUP_SUMMARY}
        onRefresh={() => {}}
        isRefreshPending={false}
      />,
    );
    // Weighted over all 105 ratings of both stores.
    expect(container.querySelector("p.text-5xl")?.textContent).toBe("4.6");
    expect(screen.getByText(/105 ratings/)).toBeInTheDocument();
    expect(
      screen.getByText("App Store 4.7 from 32 ratings, 6 reviews"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Google Play 4.5 from 73 ratings, 21 reviews"),
    ).toBeInTheDocument();
    // Synced count differs from the store's count: say how many we hold.
    expect(screen.getByText("3 in AppBoard")).toBeInTheDocument();
    expect(screen.getByText("Google Play stars")).toBeInTheDocument();
    expect(screen.getByText(/Group Buzzin: 2 apps/)).toBeInTheDocument();
  });

  test("lists countries with the store when there are two stores", () => {
    render(
      <RatingOverview
        summary={GROUP_SUMMARY}
        onRefresh={() => {}}
        isRefreshPending={false}
      />,
    );
    expect(screen.getByText("Ratings by country")).toBeInTheDocument();
    expect(screen.getAllByText("Poland")).toHaveLength(2);
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("Store")).toBeInTheDocument();
  });

  test("collapses a long country list behind Show all", async () => {
    const many: RatingsSummary = {
      ...GROUP_SUMMARY,
      stores: [
        {
          ...GROUP_SUMMARY.stores[0],
          countries: ["pl", "us", "de", "es", "fr", "it", "gb", "br", "tr", "se"].map(
            (country, i) => ({
              average: 4,
              country,
              fetchedAt: "2026-11-04T03:20:00.000Z",
              histogram: null,
              ratingCount: 20 - i,
              writtenReviews: 0,
            }),
          ),
        },
      ],
    };
    render(
      <RatingOverview summary={many} onRefresh={() => {}} isRefreshPending={false} />,
    );
    expect(screen.queryByText("Sweden")).toBeNull();
    await userEvent.click(screen.getByText("Show all 10"));
    expect(screen.getByText("Sweden")).toBeInTheDocument();
    // One store: no Store column.
    expect(screen.queryByText("Store")).toBeNull();
  });

  test("empty and refreshing states, and the refresh button", async () => {
    const onRefresh = mock(() => {});
    const empty: RatingsSummary = {
      ...GROUP_SUMMARY,
      fetchedAt: null,
      refreshing: true,
      stores: [],
      total: { average: null, ratingCount: 0, writtenReviews: 0 },
    };
    const { rerender } = render(
      <RatingOverview summary={empty} onRefresh={onRefresh} isRefreshPending={false} />,
    );
    expect(screen.getByText(/Fetching the store ratings/)).toBeInTheDocument();
    expect(screen.getByText("No country has ratings yet.")).toBeInTheDocument();
    expect(screen.getByLabelText("Refresh store ratings")).toBeDisabled();

    rerender(
      <RatingOverview
        summary={{ ...empty, refreshing: false }}
        onRefresh={onRefresh}
        isRefreshPending={false}
      />,
    );
    expect(screen.getByText("No store ratings yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Refresh store ratings"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
