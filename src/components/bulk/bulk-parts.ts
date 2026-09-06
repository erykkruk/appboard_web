import type { BulkCopyPart, Platform } from "@/lib/types";

export interface BulkPartDefinition {
  id: BulkCopyPart;
  label: string;
  description: string;
  /** Overwrites user-visible draft text on the targets, so the picker warns loudly. */
  overwritesDrafts: boolean;
}

/** Order here is the order parts are listed, previewed and sent to the API. */
export const BULK_PART_DEFINITIONS: readonly BulkPartDefinition[] = [
  {
    id: "about",
    label: "About",
    description: "About this app - the brief every AI answer is built on",
    overwritesDrafts: false,
  },
  {
    id: "privacy",
    label: "Privacy",
    description: "Privacy and Data safety answers",
    overwritesDrafts: false,
  },
  {
    id: "ageRating",
    label: "Age rating",
    description: "Age rating questionnaire answers",
    overwritesDrafts: false,
  },
  {
    id: "keywords",
    label: "Keywords",
    description: "Tracked keywords, per country",
    overwritesDrafts: false,
  },
  {
    id: "prompts",
    label: "AI prompts",
    description: "Per-field AI prompt overrides",
    overwritesDrafts: false,
  },
  {
    id: "listings",
    label: "Listings",
    description:
      "Listing text per language - THIS OVERWRITES titles and descriptions in the target drafts",
    overwritesDrafts: true,
  },
];

export const BULK_PART_LABELS: Record<BulkCopyPart, string> = {
  about: "About",
  ageRating: "Age rating",
  keywords: "Keywords",
  listings: "Listings",
  privacy: "Privacy",
  prompts: "AI prompts",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  android: "Google Play",
  ios: "App Store",
};

/** Long descriptions would blow the preview table apart; the full text stays in a tooltip. */
export const PREVIEW_TEXT_LIMIT = 80;

export function truncateText(
  value: string,
  limit: number = PREVIEW_TEXT_LIMIT,
): string {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= limit) return singleLine;
  return `${singleLine.slice(0, limit - 3).trimEnd()}...`;
}
