import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { marketDays } from "@/lib/market-history";
import type { TrackingMarketHistoryPoint, TrackingMarketsHistory } from "@/lib/types";

import {
  HOVER_CLOSE_DELAY_MS,
  HOVER_OPEN_DELAY_MS,
  MarketTrendSparkline,
} from "./market-trend-sparkline";

afterEach(cleanup);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function point(
  day: string,
  overrides: Partial<TrackingMarketHistoryPoint> = {},
): TrackingMarketHistoryPoint {
  return {
    day,
    measured: 4,
    median: 30,
    ranked: 3,
    top10: 1,
    top50: 3,
    tracked: 5,
    ...overrides,
  };
}

const HISTORY: TrackingMarketsHistory = {
  from: "2026-10-01",
  markets: [
    {
      country: "pl",
      points: [
        point("2026-11-02", { top10: 0 }),
        point("2026-11-03", { top10: 1 }),
        point("2026-11-04", { measured: 2, median: 19, top10: 2 }),
      ],
    },
  ],
  timeZone: "Europe/Warsaw",
  to: "2026-11-04",
};

function renderSparkline(history = HISTORY) {
  return render(
    <MarketTrendSparkline
      days={marketDays(history, "pl")}
      marketName="Poland"
      metric="top10"
    />,
  );
}

function trigger() {
  return screen.getByRole("button", { name: /Top 10 in Poland/ });
}

function readout() {
  return screen.getByTestId("market-history-readout").textContent ?? "";
}

describe("MarketTrendSparkline", () => {
  test("is a labelled button that opens the day-by-day chart on click", async () => {
    renderSparkline();
    expect(trigger().getAttribute("aria-label")).toContain("open the day-by-day chart");
    expect(screen.queryByTestId("market-history-readout")).toBeNull();

    await userEvent.click(trigger());

    expect(await screen.findByText("Top 10 in Poland")).toBeDefined();
    // The newest day is read out first.
    expect(readout()).toContain("Top 10 2");
    expect(readout()).toContain("Median #19");
    expect(readout()).toContain("2 of 5 keywords measured that day");
  });

  test("Escape closes the chart", async () => {
    renderSparkline();
    await userEvent.click(trigger());
    await screen.findByText("Top 10 in Poland");

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByText("Top 10 in Poland")).toBeNull());
  });

  test("a second click closes a chart the first click pinned", async () => {
    renderSparkline();
    await userEvent.click(trigger());
    await screen.findByText("Top 10 in Poland");

    await userEvent.click(trigger());

    await waitFor(() => expect(screen.queryByText("Top 10 in Poland")).toBeNull());
  });

  test("opens on mouse hover after a delay and closes when the pointer leaves", async () => {
    renderSparkline();
    await act(async () => {
      fireEvent.pointerEnter(trigger(), { pointerType: "mouse" });
    });
    expect(screen.queryByText("Top 10 in Poland")).toBeNull();
    await act(() => wait(HOVER_OPEN_DELAY_MS + 50));
    expect(screen.getByText("Top 10 in Poland")).toBeDefined();

    await act(async () => {
      fireEvent.pointerLeave(trigger(), { pointerType: "mouse" });
      await wait(HOVER_CLOSE_DELAY_MS + 50);
    });
    expect(screen.queryByText("Top 10 in Poland")).toBeNull();
  });

  test("a touch does not open on hover", async () => {
    renderSparkline();
    await act(async () => {
      fireEvent.pointerEnter(trigger(), { pointerType: "touch" });
      await wait(HOVER_OPEN_DELAY_MS + 50);
    });
    expect(screen.queryByText("Top 10 in Poland")).toBeNull();
  });

  test("arrow keys walk the days and metrics toggle", async () => {
    renderSparkline();
    await userEvent.click(trigger());
    await screen.findByText("Top 10 in Poland");

    const plot = screen.getByRole("group", { name: /Day by day/ });
    fireEvent.keyDown(plot, { key: "Home" });
    expect(readout()).toContain("Top 10 0");
    fireEvent.keyDown(plot, { key: "ArrowRight" });
    expect(readout()).toContain("Top 10 1");

    const top10 = screen.getByRole("button", { name: "Top 10" });
    const median = screen.getByRole("button", { name: "Median" });
    expect(top10.getAttribute("aria-pressed")).toBe("true");
    expect(median.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(median);
    expect(median.getAttribute("aria-pressed")).toBe("true");
    // The last shown metric cannot be switched off.
    await userEvent.click(top10);
    await userEvent.click(median);
    expect(median.getAttribute("aria-pressed")).toBe("true");
  });

  test("renders no button without at least two measured days", () => {
    renderSparkline({
      ...HISTORY,
      markets: [{ country: "pl", points: [point("2026-11-04")] }],
    });
    expect(screen.queryByRole("button")).toBeNull();
  });
});
