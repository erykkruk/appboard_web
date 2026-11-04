import { describe, expect, test } from "bun:test";

import {
  listingFieldLabel,
  previousCells,
  VERSIONS_SHOWN_BY_DEFAULT,
  versionEntry,
  versionLabel,
  visibleVersions,
} from "@/lib/rank-by-version";
import type { ByVersionCell, ByVersionColumn } from "@/lib/types";

function column(key: string, overrides: Partial<ByVersionColumn> = {}): ByVersionColumn {
  return {
    changedFields: [],
    inferred: false,
    key,
    listing: null,
    listings: [],
    measuredFrom: "2026-11-01T00:00:00.000Z",
    measuredTo: "2026-11-02T00:00:00.000Z",
    measurements: 2,
    releasedAt: null,
    versionString: key === "unknown" ? null : key,
    ...overrides,
  };
}

function cell(last: number | null): ByVersionCell {
  return { best: last, delta: null, last, measurements: 1, ranked: last === null ? 0 : 1 };
}

describe("versionLabel", () => {
  test("names the version, or says it is unknown", () => {
    expect(versionLabel(column("1.7.5"))).toBe("1.7.5");
    expect(versionLabel(column("unknown"))).toBe("Unknown version");
  });
});

describe("listingFieldLabel", () => {
  test("calls the second line a subtitle on iOS and a short description on Play", () => {
    expect(listingFieldLabel("subtitle", "ios")).toBe("Subtitle");
    expect(listingFieldLabel("subtitle", "android")).toBe("Short description");
    expect(listingFieldLabel("keywords", "ios")).toBe("Keyword field");
  });
});

describe("visibleVersions", () => {
  test("caps the columns unless all are wanted", () => {
    const versions = Array.from({ length: VERSIONS_SHOWN_BY_DEFAULT + 2 }, (_, i) =>
      column(`1.${i}`),
    );
    expect(visibleVersions(versions, false)).toHaveLength(VERSIONS_SHOWN_BY_DEFAULT);
    expect(visibleVersions(versions, true)).toHaveLength(versions.length);
  });
});

describe("previousCells", () => {
  test("pairs each version with the closest older one the keyword was measured in", () => {
    // Arrange: newest first; the keyword was not measured under 1.1.
    const versions = [column("1.2"), column("1.1"), column("1.0")];
    const cells = { "1.0": cell(9), "1.2": cell(4) };

    // Act
    const previous = previousCells(cells, versions);

    // Assert
    expect(previous["1.2"]?.last).toBe(9);
    expect(previous["1.0"]).toBeUndefined();
  });
});

describe("versionEntry", () => {
  test("marks coming into and falling out of the scanned results", () => {
    expect(versionEntry(cell(null), cell(12))).toBe("entered");
    expect(versionEntry(cell(12), cell(null))).toBe("dropped");
    expect(versionEntry(cell(12), cell(3))).toBeNull();
    expect(versionEntry(undefined, cell(3))).toBeNull();
  });
});
