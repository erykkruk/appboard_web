import type {
  AiResponse,
  App,
  AppVersion,
  Asset,
  ConnectStoreData,
  DraftReplyRequest,
  GenerateDescriptionRequest,
  GenerateReleaseNotesRequest,
  HistoryEntry,
  Listing,
  PublishResult,
  PublishingOverview,
  Review,
  ReviewStats,
  SettingRow,
  Settings,
  Store,
  SuggestKeywordsRequest,
  TranslateRequest,
  VersionDetail,
  VersionInfo,
  VersionScreenshot,
} from "./types";

const API_URL = "";

class ApiError extends Error {
  status: number;
  code: string;
  data?: unknown;

  constructor(status: number, code: string, data?: unknown) {
    super(`API Error: ${code} (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ code: "UNKNOWN" }));
    throw new ApiError(res.status, error.code, error.data);
  }
  return res.json();
}

function toQuery(params: Record<string, string | boolean | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
}

export const api = {
  stores: {
    connect: (data: ConnectStoreData) =>
      fetchApi<{ store: Store }>("/api/stores/connect", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.store),
    list: () =>
      fetchApi<{ stores: Store[] }>("/api/stores").then((r) => r.stores),
    disconnect: (id: string) =>
      fetchApi<void>(`/api/stores/${id}`, { method: "DELETE" }),
    sync: (id: string) =>
      fetchApi<{ synced: number }>(`/api/stores/${id}/sync`, {
        method: "POST",
      }),
  },

  apps: {
    list: (params?: { platform?: string; storeId?: string }) =>
      fetchApi<{ apps: App[] }>(`/api/apps${toQuery(params ?? {})}`).then(
        (r) => r.apps,
      ),
    get: (appId: string) =>
      fetchApi<{ app: App }>(`/api/apps/${appId}`).then((r) => r.app),
  },

  listings: {
    list: (appId: string) =>
      fetchApi<{ listings: Listing[] }>(`/api/apps/${appId}/listings`).then(
        (r) => r.listings,
      ),
    get: (appId: string, language: string) =>
      fetchApi<{ draft: Listing | null; remote: Listing | null }>(
        `/api/apps/${appId}/listings/${language}`,
      ).then((r) => r.draft ?? r.remote),
    update: (appId: string, language: string, data: Partial<Listing>) =>
      fetchApi<{ listing: Listing }>(`/api/apps/${appId}/listings/${language}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }).then((r) => r.listing),
    publish: (appId: string) =>
      fetchApi<{ published: number }>(`/api/apps/${appId}/listings/publish`, {
        method: "POST",
      }),
    sync: (appId: string) =>
      fetchApi<{ synced: number }>(`/api/apps/${appId}/listings/sync`, {
        method: "POST",
      }),
  },

  assets: {
    list: (
      appId: string,
      params?: { language?: string; deviceType?: string; assetType?: string },
    ) =>
      fetchApi<{ assets: Asset[] }>(
        `/api/apps/${appId}/assets${toQuery(params ?? {})}`,
      ).then((r) => r.assets),
    upload: (appId: string, formData: FormData) =>
      fetchApi<{ asset: Asset }>(`/api/apps/${appId}/assets/upload`, {
        method: "POST",
        headers: {},
        body: formData,
      }).then((r) => r.asset),
    delete: (appId: string, assetId: string) =>
      fetchApi<void>(`/api/apps/${appId}/assets/${assetId}`, {
        method: "DELETE",
      }),
    reorder: (appId: string, data: { assetIds: string[] }) =>
      fetchApi<void>(`/api/apps/${appId}/assets/reorder`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    sync: (appId: string) =>
      fetchApi<{ synced: number }>(`/api/apps/${appId}/assets/sync`, {
        method: "POST",
      }),
  },

  reviews: {
    list: (
      appId: string,
      params?: {
        rating?: string;
        language?: string;
        storeType?: string;
        hasReply?: string;
      },
    ) =>
      fetchApi<{ reviews: Review[] }>(
        `/api/apps/${appId}/reviews${toQuery(params ?? {})}`,
      ).then((r) => r.reviews),
    stats: (appId: string) =>
      fetchApi<ReviewStats>(`/api/apps/${appId}/reviews/stats`),
    reply: (appId: string, reviewId: string, body: { text: string }) =>
      fetchApi<{ review: Review }>(
        `/api/apps/${appId}/reviews/${reviewId}/reply`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ).then((r) => r.review),
    sync: (appId: string) =>
      fetchApi<{ synced: number }>(`/api/apps/${appId}/reviews/sync`, {
        method: "POST",
      }),
  },

  ai: {
    translate: (data: TranslateRequest) =>
      fetchApi<AiResponse>("/api/ai/translate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    generateDescription: (data: GenerateDescriptionRequest) =>
      fetchApi<AiResponse>("/api/ai/generate-description", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    suggestKeywords: (data: SuggestKeywordsRequest) =>
      fetchApi<AiResponse>("/api/ai/suggest-keywords", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    draftReply: (data: DraftReplyRequest) =>
      fetchApi<AiResponse>("/api/ai/draft-reply", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    generateReleaseNotes: (data: GenerateReleaseNotesRequest) =>
      fetchApi<AiResponse>("/api/ai/generate-release-notes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  history: {
    list: (appId: string, params?: { language?: string; field?: string }) =>
      fetchApi<{ history: HistoryEntry[] }>(
        `/api/apps/${appId}/history${toQuery(params ?? {})}`,
      ).then((r) => r.history),
    rollback: (appId: string, historyId: string) =>
      fetchApi<void>(`/api/apps/${appId}/history/${historyId}/rollback`, {
        method: "POST",
      }),
  },

  publishing: {
    overview: (appId: string) =>
      fetchApi<PublishingOverview>(
        `/api/apps/${appId}/publishing/overview`,
      ),
    publish: (appId: string, submitForReview?: boolean) =>
      fetchApi<PublishResult>(`/api/apps/${appId}/publishing/publish`, {
        method: "POST",
        body: JSON.stringify(
          submitForReview ? { submitForReview: true } : {},
        ),
      }),
    version: (appId: string) =>
      fetchApi<{ version: VersionInfo | null }>(
        `/api/apps/${appId}/publishing/version`,
      ).then((r) => r.version),
    versions: (appId: string) =>
      fetchApi<{ versions: AppVersion[] }>(
        `/api/apps/${appId}/publishing/versions`,
      ).then((r) => r.versions),
    versionDetail: (appId: string, versionId: string) =>
      fetchApi<VersionDetail>(
        `/api/apps/${appId}/publishing/versions/${versionId}`,
      ),
    versionScreenshots: (appId: string, versionId: string) =>
      fetchApi<{ screenshots: VersionScreenshot[] }>(
        `/api/apps/${appId}/publishing/versions/${versionId}/screenshots`,
      ).then((r) => r.screenshots),
    createVersion: (appId: string, versionString: string) =>
      fetchApi<{ version: { versionString: string; state: string } }>(
        `/api/apps/${appId}/publishing/create-version`,
        {
          method: "POST",
          body: JSON.stringify({ versionString }),
        },
      ).then((r) => r.version),
    submitReview: (appId: string) =>
      fetchApi<{ submitted: boolean }>(
        `/api/apps/${appId}/publishing/submit-review`,
        { method: "POST" },
      ),
  },

  settings: {
    get: () =>
      fetchApi<{ settings: SettingRow[] }>("/api/settings").then((r) => {
        const settings: Settings = {};
        for (const row of r.settings) {
          settings[row.key.toLowerCase()] = row.value ?? undefined;
        }
        return settings;
      }),
    update: (data: Partial<Settings>) =>
      fetchApi<{ settings: SettingRow[] }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }).then((r) => {
        const settings: Settings = {};
        for (const row of r.settings) {
          settings[row.key.toLowerCase()] = row.value ?? undefined;
        }
        return settings;
      }),
    getKey: (key: string) =>
      fetchApi<{ value: string }>(`/api/settings/${key}`),
    setKey: (key: string, value: string) =>
      fetchApi<void>(`/api/settings/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      }),
  },
};

export { ApiError };
