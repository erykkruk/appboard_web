import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { RankSnapshot } from "@/lib/types";

import { orderForHighlight, RankChart } from "./rank-chart";

afterEach(cleanup);

function snap(keyword: string, position: number | null, day: number): RankSnapshot {
  return {
    country: "us",
    createdAt: new Date(Date.UTC(2026, 10, day)).toISOString(),
    keyword,
    position,
  } as RankSnapshot;
}

const snapshots = [
  snap("game show", 18, 1),
  snap("game show", 12, 2),
  snap("buzzin", 1, 1),
  snap("buzzin", 1, 2),
  snap("jackbox", null, 2),
];

describe("orderForHighlight", () => {
  test("draws the highlighted keyword last", () => {
    const order = orderForHighlight(
      [{ keyword: "a" }, { keyword: "b" }, { keyword: "c" }],
      "a",
    ).map((s) => s.keyword);
    expect(order).toEqual(["b", "c", "a"]);
  });

  test("keeps the order without a highlight", () => {
    expect(orderForHighlight([{ keyword: "a" }, { keyword: "b" }], null).map((s) => s.keyword)).toEqual(["a", "b"]);
  });
});

describe("RankChart highlight", () => {
  test("hovering a legend entry highlights it and dims the others", () => {
    render(<RankChart annotations={[]} snapshots={snapshots} />);
    const entry = screen.getByRole("button", { name: "game show" });
    fireEvent.mouseEnter(entry);
    expect(entry.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "buzzin" }).className).toContain("opacity-40");
    expect(screen.getByText(/game show · #12/)).toBeTruthy();
    fireEvent.mouseLeave(entry);
    expect(entry.getAttribute("aria-pressed")).toBe("false");
  });

  test("hovering a line highlights its legend entry and reports it", () => {
    const seen: Array<string | null> = [];
    const { container } = render(
      <RankChart
        annotations={[]}
        onActiveKeywordChange={(k) => seen.push(k)}
        snapshots={snapshots}
      />,
    );
    const line = container.querySelector('g[data-keyword="jackbox"]');
    expect(line).not.toBeNull();
    fireEvent.mouseEnter(line as Element);
    expect(screen.getByRole("button", { name: "jackbox" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/jackbox · not in top 50/)).toBeTruthy();
    expect(seen).toEqual(["jackbox"]);
  });

  test("follows a highlight controlled by the parent", () => {
    render(<RankChart activeKeyword="buzzin" annotations={[]} snapshots={snapshots} />);
    expect(screen.getByRole("button", { name: "buzzin" }).getAttribute("aria-pressed")).toBe("true");
  });
});
