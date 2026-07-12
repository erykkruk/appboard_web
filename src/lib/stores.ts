import type { StoreType } from "@/lib/types";

/** Human labels for every store type — mirrors the backend's STORE_TYPE_LABELS. */
export const STORE_TYPE_LABELS: Record<StoreType, string> = {
  app_store: "App Store",
  google_play: "Google Play",
  huawei_appgallery: "Huawei AppGallery",
  amazon_appstore: "Amazon Appstore",
  samsung_galaxy: "Samsung Galaxy Store",
  xiaomi_getapps: "Xiaomi GetApps",
  rustore: "RuStore",
  onestore: "ONE Store",
};

/** Two-letter badge shown on the connect cards / store logos. */
export const STORE_TYPE_BADGE: Record<StoreType, string> = {
  app_store: "AS",
  google_play: "GP",
  huawei_appgallery: "HW",
  amazon_appstore: "AM",
  samsung_galaxy: "SG",
  xiaomi_getapps: "XI",
  rustore: "RU",
  onestore: "1S",
};

/** Alternative stores are gated behind the MULTI_STORE feature flag. */
export const ALTERNATIVE_STORE_TYPES: StoreType[] = [
  "huawei_appgallery",
  "amazon_appstore",
  "samsung_galaxy",
  "xiaomi_getapps",
  "rustore",
  "onestore",
];

export function isAlternativeStoreType(type: StoreType): boolean {
  return ALTERNATIVE_STORE_TYPES.includes(type);
}

export function storeTypeLabel(type: StoreType): string {
  return STORE_TYPE_LABELS[type] ?? type;
}
