import { describe, expect, test } from "bun:test";
import { Microscope } from "lucide-react";

import {
  activeAppNavSection,
  APP_NAV,
  APP_NAV_SECTIONS,
  appNavItemHref,
  GLOBAL_NAV,
  isAppNavItemActive,
  isSectionActive,
  type NavItem,
  SETTINGS_NAV,
  supportsRankTracking,
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
  test("app nav is grouped into sections, daily marketing work first", () => {
    expect(
      APP_NAV_SECTIONS.map((section) => [section.label, labels(section.items)]),
    ).toEqual([
      ["Marketing & ASO", ["Dashboard", "Keyword rankings", "Research", "Fixes"]],
      [
        "Store",
        [
          "Text & keywords",
          "Screenshots",
          "About this app",
          "In-app products",
          "History",
          "Publish",
        ],
      ],
      ["Reviews", ["Reviews"]],
      ["Sales", ["Sales"]],
      ["Automations", ["Reminders"]],
      ["Tools", ["Write with AI"]],
      ["Settings", ["Settings"]],
    ]);
  });

  test("the flat app nav is every section's pages in order", () => {
    expect(APP_NAV).toEqual(APP_NAV_SECTIONS.flatMap((section) => section.items));
  });

  test("every existing app route is still in the nav", () => {
    const suffixes = new Set(APP_NAV.map((item) => item.suffix));
    for (const suffix of [
      "/dashboard",
      "/fixes",
      "/text",
      "/write",
      "/information",
      "/screenshots",
      "/research",
      "/publish",
      "/purchases",
      "/reviews",
      "/history",
      "/reminders",
      "/settings",
    ]) {
      expect(suffixes.has(suffix)).toBe(true);
    }
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

describe("app nav tabs", () => {
  const base = "/apps/a1";
  const rankings = APP_NAV.find((item) => item.label === "Keyword rankings") as NavItem;
  const research = APP_NAV.find((item) => item.label === "Research") as NavItem;

  test("keyword rankings links straight to the research tab", () => {
    expect(appNavItemHref(rankings, base)).toBe("/apps/a1/research?tab=keywords");
    expect(appNavItemHref(research, base)).toBe("/apps/a1/research");
  });

  test("only the rankings pill is active on the keywords tab", () => {
    const path = "/apps/a1/research";
    expect(isAppNavItemActive(rankings, APP_NAV, base, path, "keywords")).toBe(true);
    expect(isAppNavItemActive(research, APP_NAV, base, path, "keywords")).toBe(false);
  });

  test("research stays active on its other tabs", () => {
    const path = "/apps/a1/research";
    expect(isAppNavItemActive(research, APP_NAV, base, path, null)).toBe(true);
    expect(isAppNavItemActive(research, APP_NAV, base, path, "history")).toBe(true);
    expect(isAppNavItemActive(rankings, APP_NAV, base, path, "history")).toBe(false);
  });
});

describe("activeAppNavSection", () => {
  const base = "/apps/a1";
  const section = (path: string, tab: string | null = null) =>
    activeAppNavSection(APP_NAV_SECTIONS, base, path, tab)?.id;

  test("a page opens the section it belongs to", () => {
    expect(section("/apps/a1/dashboard")).toBe("marketing");
    expect(section("/apps/a1/research", "keywords")).toBe("marketing");
    expect(section("/apps/a1/text")).toBe("store");
    expect(section("/apps/a1/purchases/p1")).toBe("store");
    expect(section("/apps/a1/sales")).toBe("sales");
    expect(section("/apps/a1/reminders")).toBe("automations");
    expect(section("/apps/a1/write")).toBe("tools");
  });

  test("version pages belong to the store listing", () => {
    expect(section("/apps/a1/versions/v1/screenshots")).toBe("store");
  });

  test("a page outside every section falls back to the first one", () => {
    expect(section("/apps/a1/setup")).toBe("marketing");
  });
});

describe("supportsRankTracking", () => {
  test("an Apple TV only app has no rankings", () => {
    expect(supportsRankTracking({ devices: ["tv"], platform: "ios" })).toBe(false);
  });

  test("iPhone apps, iPhone + TV apps and Android TV apps are tracked", () => {
    expect(supportsRankTracking({ devices: ["phone"], platform: "ios" })).toBe(true);
    expect(supportsRankTracking({ devices: ["phone", "tv"], platform: "ios" })).toBe(true);
    expect(supportsRankTracking({ devices: ["tv"], platform: "android" })).toBe(true);
    expect(supportsRankTracking({ devices: [], platform: "ios" })).toBe(true);
  });
});
