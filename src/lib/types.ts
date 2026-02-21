export type StoreType = "google_play" | "app_store";

export interface Store {
  id: string;
  type: StoreType;
  name: string;
  status: string;
  createdAt: string;
  lastSyncedAt: string | null;
}

export type Platform = "android" | "ios";

export interface App {
  id: string;
  storeId: string;
  platform: Platform;
  name: string;
  bundleId: string;
  externalId?: string;
  iconUrl: string | null;
  lastSyncedAt: string | null;
  store?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface Listing {
  id: string;
  appId: string;
  language: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  whatsNew: string;
  keywords: string;
  promoText: string;
  source: string;
  isDirty: boolean;
  [key: string]: string | boolean;
}

export interface Asset {
  id: string;
  appId: string;
  language: string;
  deviceType: string;
  assetType: string;
  url: string;
  sortOrder: number;
  width: number;
  height: number;
  fileSize?: number;
  externalId?: string;
}

export interface Review {
  id: string;
  appId: string;
  externalId: string;
  storeType: string;
  authorName: string;
  rating: number;
  title?: string;
  body: string;
  language?: string;
  appVersion?: string;
  device?: string;
  replyText?: string;
  repliedAt?: string;
  reviewDate: string;
  territory?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
  noReplyCount: number;
}

export interface HistoryEntry {
  id: string;
  appId: string;
  listingId?: string;
  language: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface Settings {
  openrouter_api_key?: string;
  ai_model?: string;
  ai_temperature?: string;
  [key: string]: string | undefined;
}

export interface AiResponse {
  result: string;
  model: string;
  mock: boolean;
}

export interface ConnectStoreData {
  name: string;
  type: StoreType;
  credentials: Record<string, string | boolean>;
}

export interface SettingRow {
  id: string;
  key: string;
  value: string | null;
  isEncrypted: boolean;
}

export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLangs: string[];
}

export interface GenerateDescriptionRequest {
  prompt: string;
  appName: string;
  platform: StoreType;
}

export interface SuggestKeywordsRequest {
  description: string;
  platform: StoreType;
  language: string;
}

export interface DraftReplyRequest {
  reviewText: string;
  rating: number;
  appName: string;
}

export interface GenerateReleaseNotesRequest {
  changes: string;
  appName: string;
}

export interface PublishingOverview {
  listings: {
    count: number;
    changes: { language: string; fields: string[] }[];
  };
  assets: {
    count: number;
    added: number;
    removed: number;
  };
  hasPendingChanges: boolean;
  version: {
    versionString: string;
    state: string;
    isEditable: boolean;
    suggestedVersion: string | null;
  } | null;
}

export interface PublishResult {
  listings: { published: number };
  assets: { published: number };
}

export interface VersionInfo {
  versionString: string;
  state: string;
  isEditable: boolean;
}

export interface AppVersion {
  id: string;
  versionString: string;
  state: string;
  isEditable: boolean;
}

export interface VersionLocalization {
  localizationId: string;
  language: string;
  title: string;
  subtitle: string;
  description: string;
  keywords: string;
  whatsNew?: string;
  promotionalText?: string;
  marketingUrl?: string;
  supportUrl?: string;
}

export interface VersionDetail {
  versionId: string;
  versionString: string;
  state: string;
  localizations: VersionLocalization[];
}

export interface VersionScreenshot {
  externalId: string;
  language: string;
  deviceType: string;
  displayType: string;
  screenshotSetId: string;
  url: string;
  width: number | null;
  height: number | null;
}

export const APP_STORE_LANGUAGES = [
  { label: "Arabic", locale: "ar-SA" },
  { label: "Catalan", locale: "ca" },
  { label: "Chinese (Simplified)", locale: "zh-Hans" },
  { label: "Chinese (Traditional)", locale: "zh-Hant" },
  { label: "Croatian", locale: "hr" },
  { label: "Czech", locale: "cs" },
  { label: "Danish", locale: "da" },
  { label: "Dutch", locale: "nl-NL" },
  { label: "English (Australia)", locale: "en-AU" },
  { label: "English (Canada)", locale: "en-CA" },
  { label: "English (U.K.)", locale: "en-GB" },
  { label: "English (U.S.)", locale: "en-US" },
  { label: "Finnish", locale: "fi" },
  { label: "French", locale: "fr-FR" },
  { label: "French (Canada)", locale: "fr-CA" },
  { label: "German", locale: "de-DE" },
  { label: "Greek", locale: "el" },
  { label: "Hebrew", locale: "he" },
  { label: "Hindi", locale: "hi" },
  { label: "Hungarian", locale: "hu" },
  { label: "Indonesian", locale: "id" },
  { label: "Italian", locale: "it" },
  { label: "Japanese", locale: "ja" },
  { label: "Korean", locale: "ko" },
  { label: "Malay", locale: "ms" },
  { label: "Norwegian", locale: "no" },
  { label: "Polish", locale: "pl" },
  { label: "Portuguese (Brazil)", locale: "pt-BR" },
  { label: "Portuguese (Portugal)", locale: "pt-PT" },
  { label: "Romanian", locale: "ro" },
  { label: "Russian", locale: "ru" },
  { label: "Slovak", locale: "sk" },
  { label: "Spanish (Mexico)", locale: "es-MX" },
  { label: "Spanish (Spain)", locale: "es-ES" },
  { label: "Swedish", locale: "sv" },
  { label: "Thai", locale: "th" },
  { label: "Turkish", locale: "tr" },
  { label: "Ukrainian", locale: "uk" },
  { label: "Vietnamese", locale: "vi" },
] as const;
