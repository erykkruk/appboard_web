import { describe, expect, test } from "bun:test";

import {
  DEFAULT_RANK_CHECK_HOURS,
  deferredReason,
  isDeferredRun,
  rankCheckFrequencyLabel,
  rankCheckHours,
  rankCheckSlotsLabel,
  rankCheckTimesLabel,
} from "./rank-schedule";

const DEFERRED_ERROR =
  "Deferred: the store throttled the check before this one (3 throttle answers in 30 min), so this check was not started. Every keyword is measured at the next scheduled check";

describe("rankCheckHours", () => {
  test("uses the hours of the app's store", () => {
    expect(rankCheckHours({ rankCheckHours: [0] })).toEqual([0]);
  });

  test("falls back to 00:00 and 12:00 for an older server", () => {
    expect(rankCheckHours(undefined)).toEqual(DEFAULT_RANK_CHECK_HOURS);
    expect(rankCheckHours({ rankCheckHours: [] })).toEqual([0, 12]);
  });
});

describe("schedule labels", () => {
  test("names one, two or more slots", () => {
    expect(rankCheckTimesLabel([0])).toBe("00:00");
    expect(rankCheckTimesLabel([0, 12])).toBe("00:00 and 12:00");
    expect(rankCheckTimesLabel([0, 6, 12])).toBe("00:00, 06:00 and 12:00");
  });

  test("short slot hint and frequency", () => {
    expect(rankCheckSlotsLabel([0, 12])).toBe("00:00 / 12:00");
    expect(rankCheckSlotsLabel([0])).toBe("00:00");
    expect(rankCheckFrequencyLabel([0])).toBe("once a day");
    expect(rankCheckFrequencyLabel([0, 12])).toBe("twice a day");
    expect(rankCheckFrequencyLabel([0, 8, 16])).toBe("3 times a day");
  });
});

describe("deferred runs", () => {
  test("recognises a deferred run and strips the prefix", () => {
    const run = { error: DEFERRED_ERROR, status: "interrupted" as const };
    expect(isDeferredRun(run)).toBe(true);
    expect(deferredReason(run)).toStartWith("the store throttled");
  });

  test("a restart or a failed run is not deferred", () => {
    expect(
      isDeferredRun({ error: "Interrupted by a server restart", status: "interrupted" }),
    ).toBe(false);
    expect(isDeferredRun({ error: DEFERRED_ERROR, status: "failed" })).toBe(false);
    expect(isDeferredRun({ error: null, status: "interrupted" })).toBe(false);
  });
});
