import {
  Bell,
  Clock,
  CloudCog,
  CreditCard,
  FileText,
  Globe,
  Image,
  ImagePlus,
  Info,
  LayoutDashboard,
  LineChart,
  Lock,
  type LucideIcon,
  MessageSquareText,
  Microscope,
  Package,
  Rocket,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  ToggleLeft,
  Wand2,
} from "lucide-react";

import type { FeatureKey } from "@/lib/types";

/**
 * A single navigation entry. Entries are either relative to a base path
 * (`suffix`, used by the app workspace) or absolute (`href`, used by global
 * and settings navigation).
 */
export type NavItem = {
  label: string;
  icon: LucideIcon;
  suffix?: string;
  href?: string;
  featureKey?: FeatureKey;
  iosOnly?: boolean;
  section?: string;
  /** Opens a tab of the page behind `suffix` (`?tab=`), with its own pill. */
  tab?: string;
  /** Hidden for apps whose store has no searchable results (Apple TV only). */
  needsRankTracking?: boolean;
};

/** A group of app pages: the first nav row picks the section, the second its page. */
export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

/**
 * App workspace navigation, relative to `/apps/:appId`, grouped by what the
 * work is for. Marketing comes first because it is the daily view; Store holds
 * everything that ends up on the store page and the push that sends it there.
 */
export const APP_NAV_SECTIONS: NavSection[] = [
  {
    id: "marketing",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, suffix: "/dashboard" },
      {
        featureKey: "RESEARCH",
        icon: LineChart,
        label: "Keyword rankings",
        needsRankTracking: true,
        suffix: "/research",
        tab: "keywords",
      },
      { featureKey: "RESEARCH", icon: Microscope, label: "Research", suffix: "/research" },
      { icon: Wand2, label: "Fixes", suffix: "/fixes" },
    ],
    label: "Marketing & ASO",
  },
  {
    id: "store",
    items: [
      { featureKey: "LISTINGS", icon: FileText, label: "Text & keywords", suffix: "/text" },
      { featureKey: "SCREENSHOTS", icon: Image, label: "Screenshots", suffix: "/screenshots" },
      { icon: Info, label: "About this app", suffix: "/information" },
      {
        featureKey: "PURCHASES",
        icon: Package,
        label: "In-app products",
        suffix: "/purchases",
      },
      { featureKey: "HISTORY", icon: Clock, label: "History", suffix: "/history" },
      { featureKey: "PUBLISHING", icon: Rocket, label: "Publish", suffix: "/publish" },
    ],
    label: "Store",
  },
  {
    id: "reviews",
    items: [{ featureKey: "REVIEWS", icon: Star, label: "Reviews", suffix: "/reviews" }],
    label: "Reviews",
  },
  {
    id: "sales",
    items: [{ icon: CreditCard, label: "Sales", suffix: "/sales" }],
    label: "Sales",
  },
  {
    id: "automations",
    items: [
      // Rank checks, the weekly digest, auto research and reminders: the same
      // controls as the Research "Automation" tab, on their own page.
      { featureKey: "RESEARCH", icon: Bell, label: "Reminders", suffix: "/reminders" },
    ],
    label: "Automations",
  },
  {
    id: "tools",
    items: [{ featureKey: "AI", icon: Sparkles, label: "Write with AI", suffix: "/write" }],
    label: "Tools",
  },
  {
    id: "settings",
    items: [{ icon: Settings, label: "Settings", suffix: "/settings" }],
    label: "Settings",
  },
];

/** Every app page, flat, in section order. */
export const APP_NAV: NavItem[] = APP_NAV_SECTIONS.flatMap((section) => section.items);

/** Version navigation, relative to `/apps/:appId/versions/:versionId`. */
export const VERSION_NAV: NavItem[] = [
  { label: "Languages", icon: Globe, suffix: "/languages" },
  { label: "Listings", icon: FileText, suffix: "", featureKey: "LISTINGS" },
  { label: "Previews & Screenshots", icon: Image, suffix: "/screenshots", featureKey: "SCREENSHOTS" },
  { label: "Store Graphics", icon: ImagePlus, suffix: "/graphics", featureKey: "SCREENSHOTS" },
  { label: "Privacy", icon: Lock, suffix: "/privacy" },
  { label: "App Review", icon: ShieldCheck, suffix: "/review", iosOnly: true },
  { label: "Age Rating", icon: ShieldAlert, suffix: "/age-rating", iosOnly: true, featureKey: "AGE_RATING" },
];

/** Settings navigation, absolute hrefs. */
export const SETTINGS_NAV: NavItem[] = [
  { label: "General", icon: Settings, href: "/settings" },
  { label: "Features", icon: ToggleLeft, href: "/settings/features" },
  { label: "Prompts", icon: MessageSquareText, href: "/settings/prompts" },
  { label: "Monetization", icon: CreditCard, href: "/settings/monetization" },
  { label: "Privacy Templates", icon: Lock, href: "/settings/templates" },
  { label: "Google Play Setup", icon: CloudCog, href: "/settings/google-play-setup" },
];

/** Workspace-wide destinations that live outside a single app. */
export const GLOBAL_NAV: NavItem[] = [
  { label: "Research", icon: Microscope, href: "/research", featureKey: "RESEARCH" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function navItemHref(item: NavItem, basePath = ""): string {
  return item.href ?? `${basePath}${item.suffix ?? ""}`;
}

/** Where an app nav pill links to, including its tab. */
export function appNavItemHref(item: NavItem, basePath: string): string {
  const path = navItemHref(item, basePath);
  return item.tab ? `${path}?tab=${item.tab}` : path;
}

/**
 * Whether an app nav pill is the current page. A pill with a `tab` lights up
 * only on that tab; the plain pill of the same page steps aside while a
 * sibling's tab is open, so exactly one of them is active.
 */
export function isAppNavItemActive(
  item: NavItem,
  items: NavItem[],
  basePath: string,
  pathname: string,
  currentTab: string | null,
): boolean {
  const path = navItemHref(item, basePath);
  if (!pathname.startsWith(path)) return false;
  if (item.tab) return currentTab === item.tab;
  return !items.some(
    (other) =>
      other !== item &&
      other.tab !== undefined &&
      other.suffix === item.suffix &&
      other.tab === currentTab,
  );
}

/**
 * Whether any entry of a section matches the current path. Grouped top-level
 * entries need this to light up while a nested child route is open.
 */
export function isSectionActive(
  pathname: string,
  items: NavItem[],
  basePath?: string,
): boolean {
  return items.some((item) => {
    const href = navItemHref(item, basePath);
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}

/**
 * The section the current page belongs to. Version pages are part of the
 * store listing; a page outside every section (setup, start) falls back to
 * the first section.
 */
export function activeAppNavSection(
  sections: NavSection[],
  basePath: string,
  pathname: string,
  currentTab: string | null,
): NavSection | undefined {
  if (pathname.startsWith(`${basePath}/versions/`)) {
    return sections.find((section) => section.id === "store") ?? sections[0];
  }
  const items = sections.flatMap((section) => section.items);
  return (
    sections.find((section) =>
      section.items.some((item) =>
        isAppNavItemActive(item, items, basePath, pathname, currentTab),
      ),
    ) ?? sections[0]
  );
}

/**
 * Apple publishes no tvOS search results, so an iOS app that only runs on
 * Apple TV has no rankings to measure. Mirrors the backend's rank support.
 */
export function supportsRankTracking(app: {
  devices?: readonly string[] | null;
  platform?: string | null;
}): boolean {
  if (app.platform !== "ios") return true;
  const devices = app.devices?.length ? app.devices : ["phone"];
  return devices.includes("phone") || devices.includes("tablet");
}
