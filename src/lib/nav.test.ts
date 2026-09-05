import { describe, expect, test } from "bun:test";
import { Microscope } from "lucide-react";

import {
  APP_NAV,
  GLOBAL_NAV,
  isSectionActive,
  type NavItem,
  SETTINGS_NAV,
  VERSION_NAV,
} from "@/lib/nav";
import type { FeatureKey } from "@/lib/types";

const labels = (items: NavItem[]) => items.map((item) => item.label);

function allowedByFeatures(
  items: NavItem[],
  features: Partial<Record<FeatureKey, boolean>>,
): NavItem[] {
  return items.filter((item) =>
    item.featureKey ? (features[item.featureKey] ?? true) : true,
  );
}

describe("nav model", () => {
  test("app nav keeps the workspace order", () => {
    // Order is the flow: audit, fixes, writing, then the store page, then
    // growth, then housekeeping. Reminders is the last step of the flow.
    expect(labels(APP_NAV)).toEqual([
      "Dashboard",
      "Fixes",
      "Text & keywords",
      "Write with AI",
      "About this app",
      "Screenshots",
      "Research",
      "Publish",
      "Purchases",
      "Reviews",
      "History",
      "Reminders",
      "Settings",
    ]);
  });

  test("settings and global nav use absolute hrefs", () => {
    for (const item of [...SETTINGS_NAV, ...GLOBAL_NAV]) {
      expect(item.href).toBeString();
      expect(item.suffix).toBeUndefined();
    }
  });

  test("global research entry carries its feature key", () => {
    const research = GLOBAL_NAV.find((item) => item.label === "Research");
    expect(research?.featureKey).toBe("RESEARCH");
  });
});

describe("iosOnly filter", () => {
  test("drops iOS-only entries on Android", () => {
    const androidLabels = labels(VERSION_NAV.filter((item) => !item.iosOnly));
    expect(androidLabels).not.toContain("App Review");
    expect(androidLabels).not.toContain("Age Rating");
    expect(androidLabels).toContain("Listings");
  });

  test("keeps every entry on iOS", () => {
    const isIos = true;
    const iosLabels = labels(
      VERSION_NAV.filter((item) => !item.iosOnly || isIos),
    );
    expect(iosLabels).toEqual(labels(VERSION_NAV));
  });
});

describe("feature filter", () => {
  test("hides entries whose feature is disabled", () => {
    const visible = labels(allowedByFeatures(APP_NAV, { RESEARCH: false }));
    expect(visible).not.toContain("Research");
    expect(visible).toContain("Dashboard");
  });

  test("keeps entries without a feature key and unknown features", () => {
    const visible = labels(allowedByFeatures(APP_NAV, {}));
    expect(visible).toEqual(labels(APP_NAV));
  });
});

describe("isSectionActive", () => {
  test("matches a suffix entry on an exact path and on a child route", () => {
    expect(isSectionActive("/apps/a1/research", APP_NAV, "/apps/a1")).toBe(true);
    expect(isSectionActive("/apps/a1/research/keywords", APP_NAV, "/apps/a1")).toBe(
      true,
    );
  });

  test("matches an href entry", () => {
    expect(isSectionActive("/settings/features", SETTINGS_NAV)).toBe(true);
  });

  test("misses when no entry of the section matches", () => {
    expect(
      isSectionActive("/apps/a1/dashboard", VERSION_NAV, "/apps/a1/versions/v1"),
    ).toBe(false);
    expect(isSectionActive("/research", SETTINGS_NAV)).toBe(false);
  });

  test("does not match a sibling path with the same prefix", () => {
    const items: NavItem[] = [
      { label: "Research", icon: Microscope, href: "/research" },
    ];
    expect(isSectionActive("/research-runs", items)).toBe(false);
  });

  test("ignores a base path of another app", () => {
    expect(isSectionActive("/apps/a2/research", APP_NAV, "/apps/a1")).toBe(false);
  });
});
