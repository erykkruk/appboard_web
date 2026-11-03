import { describe, expect, test } from "bun:test";

import type { TrackingSchedule } from "@/lib/types";

import { nextRunLabel } from "./automation-tab";

const SCHEDULE: TrackingSchedule = {
  autoResearchHour: 6,
  nextAutoResearchAt: "2026-11-04T05:00:00.000Z",
  rankCheckHours: [0, 12],
  scoreRefreshHour: 1,
  timezone: "Europe/Warsaw",
};

describe("nextRunLabel", () => {
  test("names the next run when auto-research is on", () => {
    expect(nextRunLabel(true, SCHEDULE)).toBe(
      `Next run: ${new Date(SCHEDULE.nextAutoResearchAt as string).toLocaleString()}`,
    );
  });

  test("says it is off when disabled", () => {
    expect(nextRunLabel(false, SCHEDULE)).toBe("Auto-research is off.");
  });

  test("copes with a server that sends no schedule", () => {
    expect(nextRunLabel(true, undefined)).toBe("Next run: not scheduled yet.");
  });
});
