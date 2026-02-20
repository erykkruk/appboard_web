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
