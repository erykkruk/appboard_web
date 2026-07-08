import type { ResearchSeverity, ResearchStoreKind } from "@/lib/types";

export const STORE_LABELS: Record<ResearchStoreKind, string> = {
  appstore: "App Store",
  playstore: "Google Play",
};

export const STORE_SHORT_LABELS: Record<ResearchStoreKind, string> = {
  appstore: "iOS",
  playstore: "Android",
};

export const SEVERITY_BADGE_CLASS: Record<ResearchSeverity, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function formatResearchDate(raw: string): string {
  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
