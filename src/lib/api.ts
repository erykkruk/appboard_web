import type {
	AgeRating,
	AgeRatingInput,
	AgeRatingPreset,
	AiResponse,
	App,
	AppAiPrompt,
	AppReviewDetail,
	AppVersion,
	AsoProfile,
	AsoProfileInput,
	Asset,
	CategoriesData,
	ConnectStoreData,
	DraftReplyRequest,
	GenerateDescriptionRequest,
	GenerateListingFieldRequest,
	GeneratePrivacyRequest,
	GenerateReleaseNotesRequest,
	GlobalPromptEntry,
	HistoryEntry,
	Listing,
	PrivacyDeclaration,
	PrivacyDeclarationInput,
	PrivacyTemplate,
	PublishingOverview,
	PublishLocalizationsResult,
	PublishResult,
	Review,
	ReviewStats,
	SettingRow,
	Settings,
	SplitPreviewResult,
	SplitUploadResult,
	Store,
	SuggestCategoryRequest,
	SuggestCategoryResponse,
	SuggestKeywordsRequest,
	SyncVersionsResult,
	TranslateLocalizationRequest,
	TranslateRequest,
	UpdateCategoriesInput,
	UpdateCopyrightResult,
	UpdateLocalizationResult,
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
		const info =
			data && typeof data === "object" && "info" in data
				? (data as { info: string }).info
				: undefined;
		super(info ?? `API Error: ${code} (${status})`);
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
	ai: {
		draftReply: (data: DraftReplyRequest) =>
			fetchApi<AiResponse>("/api/ai/draft-reply", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		generateDescription: (data: GenerateDescriptionRequest) =>
			fetchApi<AiResponse>("/api/ai/generate-description", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		generatePrivacy: (data: GeneratePrivacyRequest) =>
			fetchApi<AiResponse>("/api/ai/generate-privacy", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		generateListingField: (data: GenerateListingFieldRequest) =>
			fetchApi<AiResponse>("/api/ai/generate-listing-field", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		generateReleaseNotes: (data: GenerateReleaseNotesRequest) =>
			fetchApi<AiResponse>("/api/ai/generate-release-notes", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		suggestCategory: (data: SuggestCategoryRequest) =>
			fetchApi<SuggestCategoryResponse>("/api/ai/suggest-category", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		suggestKeywords: (data: SuggestKeywordsRequest) =>
			fetchApi<AiResponse>("/api/ai/suggest-keywords", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		translate: (data: TranslateRequest) =>
			fetchApi<AiResponse>("/api/ai/translate", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		translateLocalization: (data: TranslateLocalizationRequest) =>
			fetchApi<{
				model: string;
				translations: Record<string, string>;
			}>("/api/ai/translate-localization", {
				body: JSON.stringify(data),
				method: "POST",
			}),
	},

	apps: {
		get: (appId: string) =>
			fetchApi<{ app: App }>(`/api/apps/${appId}`).then((r) => r.app),
		list: (params?: { platform?: string; storeId?: string }) =>
			fetchApi<{ apps: App[] }>(`/api/apps${toQuery(params ?? {})}`).then(
				(r) => r.apps,
			),
	},

	asoProfile: {
		get: (appId: string) =>
			fetchApi<{ asoProfile: AsoProfile | null }>(
				`/api/apps/${appId}/aso-profile`,
			).then((r) => r.asoProfile),
		update: (appId: string, data: AsoProfileInput) =>
			fetchApi<{ asoProfile: AsoProfile }>(`/api/apps/${appId}/aso-profile`, {
				body: JSON.stringify(data),
				method: "PUT",
			}).then((r) => r.asoProfile),
	},

	assets: {
		delete: (appId: string, assetId: string) =>
			fetchApi<void>(`/api/apps/${appId}/assets/${assetId}`, {
				method: "DELETE",
			}),
		list: (
			appId: string,
			params?: { language?: string; deviceType?: string; assetType?: string },
		) =>
			fetchApi<{ assets: Asset[] }>(
				`/api/apps/${appId}/assets${toQuery(params ?? {})}`,
			).then((r) => r.assets),
		reorder: (appId: string, data: { assetIds: string[] }) =>
			fetchApi<void>(`/api/apps/${appId}/assets/reorder`, {
				body: JSON.stringify(data),
				method: "PATCH",
			}),
		sync: (appId: string) =>
			fetchApi<{ synced: number }>(`/api/apps/${appId}/assets/sync`, {
				method: "POST",
			}),
		upload: (appId: string, formData: FormData) =>
			fetchApi<{ asset: Asset }>(`/api/apps/${appId}/assets/upload`, {
				body: formData,
				headers: {},
				method: "POST",
			}).then((r) => r.asset),
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

	listings: {
		categories: (appId: string) =>
			fetchApi<CategoriesData>(
				`/api/apps/${appId}/listings/categories`,
			),
		get: (appId: string, language: string) =>
			fetchApi<{ draft: Listing | null; remote: Listing | null }>(
				`/api/apps/${appId}/listings/${language}`,
			).then((r) => r.draft ?? r.remote),
		list: (appId: string) =>
			fetchApi<{ listings: Listing[] }>(`/api/apps/${appId}/listings`).then(
				(r) => r.listings,
			),
		publish: (appId: string) =>
			fetchApi<{ published: number }>(`/api/apps/${appId}/listings/publish`, {
				method: "POST",
			}),
		sync: (appId: string) =>
			fetchApi<{ synced: number }>(`/api/apps/${appId}/listings/sync`, {
				method: "POST",
			}),
		update: (appId: string, language: string, data: Partial<Listing>) =>
			fetchApi<{ listing: Listing }>(
				`/api/apps/${appId}/listings/${language}`,
				{
					body: JSON.stringify(data),
					method: "PUT",
				},
			).then((r) => r.listing),
		updateCategories: (appId: string, data: UpdateCategoriesInput) =>
			fetchApi<{ primaryCategory: string; secondaryCategory: string | null }>(
				`/api/apps/${appId}/listings/categories`,
				{
					body: JSON.stringify(data),
					method: "PUT",
				},
			),
	},

	publishing: {
		addLocalization: (
			appId: string,
			versionId: string,
			locale: string,
			copyScreenshotsFrom?: string,
		) =>
			fetchApi<{ added: boolean; language: string }>(
				`/api/apps/${appId}/publishing/versions/${versionId}/localizations`,
				{
					body: JSON.stringify({
						locale,
						...(copyScreenshotsFrom ? { copyScreenshotsFrom } : {}),
					}),
					method: "POST",
				},
			),
		addLocalizationWithTranslation: (
			appId: string,
			versionId: string,
			locale: string,
			sourceLocale: string,
			copyScreenshotsFrom?: string,
		) =>
			fetchApi<{ added: boolean; language: string; translated: boolean }>(
				`/api/apps/${appId}/publishing/versions/${versionId}/localizations/translate`,
				{
					body: JSON.stringify({
						locale,
						sourceLocale,
						...(copyScreenshotsFrom ? { copyScreenshotsFrom } : {}),
					}),
					method: "POST",
				},
			),
		createVersion: (appId: string, versionString: string) =>
			fetchApi<{ version: { versionString: string; state: string } }>(
				`/api/apps/${appId}/publishing/create-version`,
				{
					body: JSON.stringify({ versionString }),
					method: "POST",
				},
			).then((r) => r.version),
		deleteAllScreenshots: (appId: string, screenshotSetId: string) =>
			fetchApi<{ deleted: number }>(
				`/api/apps/${appId}/publishing/screenshot-sets/${screenshotSetId}`,
				{ method: "DELETE" },
			),
		deleteLocalization: (
			appId: string,
			versionId: string,
			localizationId: string,
		) =>
			fetchApi<{ deleted: boolean }>(
				`/api/apps/${appId}/publishing/versions/${versionId}/localizations/${localizationId}`,
				{ method: "DELETE" },
			),
		deleteReviewAttachment: (appId: string, attachmentId: string) =>
			fetchApi<{ deleted: boolean }>(
				`/api/apps/${appId}/publishing/review-attachments/${attachmentId}`,
				{ method: "DELETE" },
			),
		deleteScreenshot: (appId: string, screenshotId: string) =>
			fetchApi<{ deleted: boolean }>(
				`/api/apps/${appId}/publishing/screenshots/${screenshotId}`,
				{ method: "DELETE" },
			),
		overview: (appId: string) =>
			fetchApi<PublishingOverview>(`/api/apps/${appId}/publishing/overview`),
		previewScreenshot: (
			appId: string,
			displayType: string,
			file: File,
			crop?: { x: number; y: number; width: number; height: number },
		) => {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("displayType", displayType);
			if (crop) {
				formData.append("cropX", String(crop.x));
				formData.append("cropY", String(crop.y));
				formData.append("cropWidth", String(crop.width));
				formData.append("cropHeight", String(crop.height));
			}
			return fetchApi<{ preview: string; width: number; height: number }>(
				`/api/apps/${appId}/publishing/screenshots/preview`,
				{ body: formData, headers: {}, method: "POST" },
			);
		},
		publish: (appId: string, submitForReview?: boolean) =>
			fetchApi<PublishResult>(`/api/apps/${appId}/publishing/publish`, {
				body: JSON.stringify(submitForReview ? { submitForReview: true } : {}),
				method: "POST",
			}),
		publishLocalizations: (appId: string, versionId: string) =>
			fetchApi<PublishLocalizationsResult>(
				`/api/apps/${appId}/publishing/versions/${versionId}/publish-localizations`,
				{ method: "POST" },
			),
		reorderScreenshots: (
			appId: string,
			screenshotSetId: string,
			screenshotIds: string[],
		) =>
			fetchApi<{ reordered: boolean }>(
				`/api/apps/${appId}/publishing/screenshots/reorder`,
				{
					body: JSON.stringify({ screenshotIds, screenshotSetId }),
					method: "PATCH",
				},
			),
		reviewDetail: (appId: string, versionId: string) =>
			fetchApi<{ reviewDetail: AppReviewDetail | null }>(
				`/api/apps/${appId}/publishing/versions/${versionId}/review-detail`,
			).then((r) => r.reviewDetail),
		submitReview: (appId: string) =>
			fetchApi<{ submitted: boolean }>(
				`/api/apps/${appId}/publishing/submit-review`,
				{ method: "POST" },
			),
		syncVersions: (appId: string) =>
			fetchApi<SyncVersionsResult>(
				`/api/apps/${appId}/publishing/sync-versions`,
				{ method: "POST" },
			),
		updateCopyright: (appId: string, versionId: string, copyright: string) =>
			fetchApi<UpdateCopyrightResult>(
				`/api/apps/${appId}/publishing/versions/${versionId}/copyright`,
				{ body: JSON.stringify({ copyright }), method: "PATCH" },
			),
		updateLocalization: (
			appId: string,
			versionId: string,
			localizationId: string,
			data: Partial<{
				title: string;
				subtitle: string;
				description: string;
				keywords: string;
				whatsNew: string;
				promotionalText: string;
				marketingUrl: string;
				supportUrl: string;
			}>,
		) =>
			fetchApi<UpdateLocalizationResult>(
				`/api/apps/${appId}/publishing/versions/${versionId}/localizations/${localizationId}`,
				{ body: JSON.stringify(data), method: "PATCH" },
			),
		updateReviewDetail: (
			appId: string,
			versionId: string,
			data: Partial<{
				contactFirstName: string;
				contactLastName: string;
				contactPhone: string;
				contactEmail: string;
				demoAccountName: string;
				demoAccountPassword: string;
				demoAccountRequired: boolean;
				notes: string;
			}>,
		) =>
			fetchApi<{ updated: boolean }>(
				`/api/apps/${appId}/publishing/versions/${versionId}/review-detail`,
				{ body: JSON.stringify(data), method: "PATCH" },
			),
		uploadReviewAttachment: (appId: string, versionId: string, file: File) => {
			const formData = new FormData();
			formData.append("file", file);
			return fetchApi<{ uploaded: boolean; attachmentId: string }>(
				`/api/apps/${appId}/publishing/versions/${versionId}/review-detail/attachments`,
				{ body: formData, headers: {}, method: "POST" },
			);
		},
		uploadScreenshot: (
			appId: string,
			versionId: string,
			language: string,
			displayType: string,
			file: File,
			crop?: { x: number; y: number; width: number; height: number },
		) => {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("versionId", versionId);
			formData.append("language", language);
			formData.append("displayType", displayType);
			if (crop) {
				formData.append("cropX", String(crop.x));
				formData.append("cropY", String(crop.y));
				formData.append("cropWidth", String(crop.width));
				formData.append("cropHeight", String(crop.height));
			}
			return fetchApi<{ uploaded: boolean; screenshotId: string }>(
				`/api/apps/${appId}/publishing/screenshots/upload`,
				{ body: formData, headers: {}, method: "POST" },
			);
		},
		copyScreenshots: (
			appId: string,
			versionId: string,
			sourceLanguage: string,
			targetLanguage: string,
			displayType?: string,
		) =>
			fetchApi<{ copied: number }>(
				`/api/apps/${appId}/publishing/screenshots/copy`,
				{
					body: JSON.stringify({
						sourceLanguage,
						targetLanguage,
						versionId,
						...(displayType ? { displayType } : {}),
					}),
					method: "POST",
				},
			),
		splitPreview: (
			appId: string,
			displayType: string,
			file: File,
			parts: number,
			targetWidth?: number,
			targetHeight?: number,
		) => {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("parts", String(parts));
			formData.append("displayType", displayType);
			if (targetWidth) formData.append("targetWidth", String(targetWidth));
			if (targetHeight) formData.append("targetHeight", String(targetHeight));
			return fetchApi<SplitPreviewResult>(
				`/api/apps/${appId}/publishing/screenshots/split-preview`,
				{ body: formData, headers: {}, method: "POST" },
			);
		},
		splitUploadScreenshots: (
			appId: string,
			versionId: string,
			language: string,
			displayType: string,
			file: File,
			parts: number,
			insertAt?: number,
			targetWidth?: number,
			targetHeight?: number,
			crop?: { x: number; y: number; width: number; height: number },
		) => {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("versionId", versionId);
			formData.append("language", language);
			formData.append("displayType", displayType);
			formData.append("parts", String(parts));
			if (insertAt !== undefined) formData.append("insertAt", String(insertAt));
			if (targetWidth) formData.append("targetWidth", String(targetWidth));
			if (targetHeight) formData.append("targetHeight", String(targetHeight));
			if (crop) {
				formData.append("cropX", String(Math.round(crop.x)));
				formData.append("cropY", String(Math.round(crop.y)));
				formData.append("cropWidth", String(Math.round(crop.width)));
				formData.append("cropHeight", String(Math.round(crop.height)));
			}
			return fetchApi<SplitUploadResult>(
				`/api/apps/${appId}/publishing/screenshots/split-upload`,
				{ body: formData, headers: {}, method: "POST" },
			);
		},
		version: (appId: string) =>
			fetchApi<{ version: VersionInfo | null }>(
				`/api/apps/${appId}/publishing/version`,
			).then((r) => r.version),
		versionDetail: (appId: string, versionId: string) =>
			fetchApi<VersionDetail>(
				`/api/apps/${appId}/publishing/versions/${versionId}`,
			),
		versionScreenshots: (appId: string, versionId: string) =>
			fetchApi<{ screenshots: VersionScreenshot[] }>(
				`/api/apps/${appId}/publishing/versions/${versionId}/screenshots`,
			).then((r) => r.screenshots),
		versions: (appId: string) =>
			fetchApi<{ versions: AppVersion[]; source?: "live" | "cache" }>(
				`/api/apps/${appId}/publishing/versions`,
			).then((r) => r.versions),
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
		reply: (appId: string, reviewId: string, body: { text: string }) =>
			fetchApi<{ review: Review }>(
				`/api/apps/${appId}/reviews/${reviewId}/reply`,
				{
					body: JSON.stringify(body),
					method: "POST",
				},
			).then((r) => r.review),
		stats: (appId: string) =>
			fetchApi<ReviewStats>(`/api/apps/${appId}/reviews/stats`),
		sync: (appId: string) =>
			fetchApi<{ synced: number }>(`/api/apps/${appId}/reviews/sync`, {
				method: "POST",
			}),
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
		getKey: (key: string) =>
			fetchApi<{ value: string }>(`/api/settings/${key}`),
		setKey: (key: string, value: string) =>
			fetchApi<void>(`/api/settings/${key}`, {
				body: JSON.stringify({ value }),
				method: "PUT",
			}),
		update: (data: Partial<Settings>) =>
			fetchApi<{ settings: SettingRow[] }>("/api/settings", {
				body: JSON.stringify(data),
				method: "PATCH",
			}).then((r) => {
				const settings: Settings = {};
				for (const row of r.settings) {
					settings[row.key.toLowerCase()] = row.value ?? undefined;
				}
				return settings;
			}),
		getPrompts: () =>
			fetchApi<{ prompts: Record<string, GlobalPromptEntry> }>(
				"/api/settings/prompts",
			).then((r) => r.prompts),
		getPromptDefaults: () =>
			fetchApi<{ defaults: Record<string, string> }>(
				"/api/settings/prompts/defaults",
			).then((r) => r.defaults),
		setPrompt: (mode: string, field: string, prompt: string) =>
			fetchApi<void>(`/api/settings/prompts/${mode}/${field}`, {
				body: JSON.stringify({ prompt }),
				method: "PUT",
			}),
		deletePrompt: (mode: string, field: string) =>
			fetchApi<void>(`/api/settings/prompts/${mode}/${field}`, {
				method: "DELETE",
			}),
	},

	appAiPrompts: {
		list: (appId: string) =>
			fetchApi<{ prompts: AppAiPrompt[] }>(
				`/api/apps/${appId}/ai-prompts`,
			).then((r) => r.prompts),
		set: (appId: string, mode: string, field: string, prompt: string) =>
			fetchApi<void>(`/api/apps/${appId}/ai-prompts/${mode}/${field}`, {
				body: JSON.stringify({ prompt }),
				method: "PUT",
			}),
		delete: (appId: string, mode: string, field: string) =>
			fetchApi<void>(`/api/apps/${appId}/ai-prompts/${mode}/${field}`, {
				method: "DELETE",
			}),
	},

	privacyDeclaration: {
		get: (appId: string) =>
			fetchApi<{ privacyDeclaration: PrivacyDeclaration | null }>(
				`/api/apps/${appId}/privacy-declaration`,
			).then((r) => r.privacyDeclaration),
		update: (appId: string, data: PrivacyDeclarationInput) =>
			fetchApi<{ privacyDeclaration: PrivacyDeclaration }>(
				`/api/apps/${appId}/privacy-declaration`,
				{
					body: JSON.stringify(data),
					method: "PUT",
				},
			).then((r) => r.privacyDeclaration),
		templates: () =>
			fetchApi<{ templates: PrivacyTemplate[] }>(
				"/api/privacy-templates",
			).then((r) => r.templates),
	},

	ageRating: {
		get: (appId: string) =>
			fetchApi<{ ageRating: AgeRating | null }>(
				`/api/apps/${appId}/age-rating`,
			).then((r) => r.ageRating),
		update: (appId: string, data: AgeRatingInput) =>
			fetchApi<{
				ageRating: AgeRating & {
					syncedToStore: boolean;
					syncError: string | null;
				};
			}>(`/api/apps/${appId}/age-rating`, {
				body: JSON.stringify(data),
				method: "PUT",
			}).then((r) => r.ageRating),
		presets: () =>
			fetchApi<{ presets: AgeRatingPreset[] }>(
				"/api/age-rating-presets",
			).then((r) => r.presets),
	},

	stores: {
		connect: (data: ConnectStoreData) =>
			fetchApi<{ store: Store }>("/api/stores/connect", {
				body: JSON.stringify(data),
				method: "POST",
			}).then((r) => r.store),
		disconnect: (id: string) =>
			fetchApi<void>(`/api/stores/${id}`, { method: "DELETE" }),
		list: () =>
			fetchApi<{ stores: Store[] }>("/api/stores").then((r) => r.stores),
		sync: (id: string) =>
			fetchApi<{ synced: number }>(`/api/stores/${id}/sync`, {
				method: "POST",
			}),
	},
};

export { ApiError };
