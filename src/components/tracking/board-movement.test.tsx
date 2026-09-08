import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import type { BoardMove } from "@/lib/types";

import { BoardMovement } from "./board-movement";

afterEach(cleanup);

const BASE = { country: "pl", difficultyDelta: null };

describe("BoardMovement", () => {
  test("words entering and leaving the scan instead of subtracting", () => {
    const movement: BoardMove[] = [
      { ...BASE, from: null, keyword: "domowka", kind: "entered", to: 9 },
      { ...BASE, from: 44, keyword: "kalambury", kind: "dropped", to: null },
    ];
    render(<BoardMovement movement={movement} />);

    expect(screen.getByText("entered at #9")).toBeDefined();
    expect(screen.getByText("fell out of the scan (was #44)")).toBeDefined();
  });

  test("reads a rank change as a direction, not a raw difference", () => {
    const movement: BoardMove[] = [
      { ...BASE, from: 12, keyword: "quiz na tv", kind: "moved", to: 3 },
      { ...BASE, from: 4, keyword: "teleturniej", kind: "moved", to: 17 },
    ];
    render(<BoardMovement movement={movement} />);

    expect(screen.getByText("up 9 to #3")).toBeDefined();
    expect(screen.getByText("down 13 to #17")).toBeDefined();
  });

  test("says nothing moved when nothing did", () => {
    render(<BoardMovement movement={[]} />);
    expect(
      screen.getByText("Nothing moved between the last two checks."),
    ).toBeDefined();
  });
});
