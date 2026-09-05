import type { Platform } from "@/lib/types";

/**
 * Store field limits, mirrored from the backend's CHAR_LIMITS. Kept as a
 * per-platform field list so an editor can render exactly the fields a store
 * has, in the order the store shows them, with the right counters.
 */
export interface ListingFieldSpec {
  key:
    | "title"
    | "shortDesc"
    | "promoText"
    | "fullDesc"
    | "keywords"
    | "whatsNew"
    | "videoUrl";
  label: string;
  maxLength: number;
  multiline?: boolean;
  rows?: number;
  /** Shown under the field; the reason the field matters, not what it is. */
  hint?: string;
  /** Apple does not publish this field, so a link import starts it empty. */
  hiddenInPublicListing?: boolean;
}

const IOS_FIELDS: ListingFieldSpec[] = [
  { key: "title", label: "Name", maxLength: 30, hint: "Strongest ranking field." },
  {
    key: "shortDesc",
    label: "Subtitle",
    maxLength: 30,
    hint: "Indexed like the name; shows under it in search.",
    hiddenInPublicListing: true,
  },
  {
    key: "keywords",
    label: "Keyword field",
    maxLength: 100,
    hint: "Comma-separated, no spaces. Words already in the name or subtitle are wasted here.",
    hiddenInPublicListing: true,
  },
  {
    key: "promoText",
    label: "Promotional text",
    maxLength: 170,
    hint: "Editable without a release; not indexed for search.",
  },
  {
    key: "fullDesc",
    label: "Description",
    maxLength: 4000,
    multiline: true,
    rows: 12,
    hint: "Not indexed on the App Store - it sells, it does not rank. The first three lines show before 'more'.",
  },
  { key: "whatsNew", label: "What's new", maxLength: 4000, multiline: true, rows: 4 },
];

const ANDROID_FIELDS: ListingFieldSpec[] = [
  { key: "title", label: "Title", maxLength: 50, hint: "Strongest ranking field." },
  {
    key: "shortDesc",
    label: "Short description",
    maxLength: 80,
    hint: "First thing people read; indexed for search.",
  },
  {
    key: "fullDesc",
    label: "Full description",
    maxLength: 4000,
    multiline: true,
    rows: 12,
    hint: "Indexed on Google Play - repeat your main terms naturally, 2-3 times.",
  },
  {
    key: "videoUrl",
    label: "Promo video (YouTube URL)",
    maxLength: 1024,
    hint: "Shown at the top of the listing on Google Play.",
  },
];

export function listingFieldsFor(platform: Platform): ListingFieldSpec[] {
  return platform === "ios" ? IOS_FIELDS : ANDROID_FIELDS;
}
