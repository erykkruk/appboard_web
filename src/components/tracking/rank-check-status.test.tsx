import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

import type { RankCheckRun } from "@/lib/types";

import { RankCheckStatus } from "./rank-check-status";

afterEach(cleanup);

const RUN: RankCheckRun = {
  appId: "a",
  checked: 120,
  error: null,
  failed: 0,
  failures: [],
  finishedAt: null,
  id: "r",
  kind: "manual",
  measured: 120,
  progress: 120 / 700,
  ranked: 80,
  startedAt: "2026-11-03T00:00:00.000Z",
  status: "running",
  total: 700,
};

describe("RankCheckStatus", () => {
  test("shows progress while a check runs", () => {
    render(<RankCheckStatus run={RUN} />);
    expect(screen.getByText(/120 of 700 keywords/)).toBeDefined();
  });

  test("calls refused lookups 'could not be measured', not lost rankings", () => {
    render(
      <RankCheckStatus
        run={{
          ...RUN,
          checked: 700,
          failed: 2,
          failures: [
            { attempts: 4, country: "de", error: "x", keyword: "partyspiel", status: 403 },
            { attempts: 4, country: "pl", error: "fetch failed", keyword: "quiz", status: null },
          ],
          progress: 1,
          status: "completed",
        }}
      />,
    );
    expect(screen.getByText(/2 of 700 keywords could not be measured/)).toBeDefined();
    expect(screen.getByText("partyspiel (Germany): HTTP 403")).toBeDefined();
    expect(screen.getByText("quiz (Poland): fetch failed")).toBeDefined();
  });

  test("stays quiet after a clean check", () => {
    const { container } = render(
      <RankCheckStatus run={{ ...RUN, checked: 700, progress: 1, status: "completed" }} />,
    );
    expect(container.textContent).toBe("");
  });

  test("says when a check was interrupted", () => {
    render(
      <RankCheckStatus
        run={{ ...RUN, error: "Interrupted by a server restart", status: "interrupted" }}
      />,
    );
    expect(screen.getByText(/stopped early/)).toBeDefined();
  });
});
