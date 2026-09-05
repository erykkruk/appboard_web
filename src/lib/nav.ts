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
  Lock,
  type LucideIcon,
  MessageSquareText,
  Microscope,
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
};

/** App workspace navigation, relative to `/apps/:appId`. */
export const APP_NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, suffix: "/dashboard" },
  { label: "Fixes", icon: Wand2, suffix: "/fixes" },
  { featureKey: "AI", icon: Sparkles, label: "Write with AI", suffix: "/write" },
  { label: "Information", icon: Info, suffix: "/information" },
  {
    featureKey: "SCREENSHOTS",
    icon: Image,
    label: "Screenshots",
    suffix: "/screenshots",
  },
  { label: "Research", icon: Microscope, suffix: "/research", featureKey: "RESEARCH" },
  { label: "Publish", icon: Rocket, suffix: "/publish", featureKey: "PUBLISHING" },
  { label: "Purchases", icon: CreditCard, suffix: "/purchases", featureKey: "PURCHASES" },
  { label: "Reviews", icon: Star, suffix: "/reviews", featureKey: "REVIEWS" },
  { label: "History", icon: Clock, suffix: "/history", featureKey: "HISTORY" },
  { featureKey: "RESEARCH", icon: Bell, label: "Reminders", suffix: "/reminders" },
  { label: "Settings", icon: Settings, suffix: "/settings" },
];

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
