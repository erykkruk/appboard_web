import type {
	AgeRating,
	AgeRatingInput,
	AgeRatingPreset,
	AiChatMessage,
	AiResponse,
	App,
	AppAiPrompt,
	AppGroup,
	AppGroupMember,
	AppReviewDetail,
	AppVersion,
	AsoProfile,
	AsoProfileInput,
	Asset,
	CategoriesData,
	ConnectStoreData,
	ConnectStoreResponse,
	CreateGroupInput,
	CreatePurchaseInput,
	CreateSubscriptionInput,
	DraftReplyRequest,
	FeaturesResponse,
	GenerateDescriptionRequest,
	GenerateListingFieldRequest,
	GeneratePurchaseFieldRequest,
	GeneratePrivacyRequest,
	GenerateReleaseNotesRequest,
	GlobalPromptEntry,
	GroupAsoProfile,
	MonetizationPlan,
	QuickActionFocusContext,
	GroupAsoProfileInput,
	GroupLocalization,
	HistoryEntry,
	InAppPurchase,
	Listing,
	ListingDiff,
	PlatformCapabilities,
	PrivacyDeclaration,
	PrivacyDeclarationInput,
	PrivacyTemplate,
	PublishingOverview,
	PublishLocalizationsResult,
	PublishResult,
	PushPreview,
	PurchaseSyncResult,
	Review,
	ReviewInfo,
	ReviewStats,
	SettingRow,
	Settings,
	SplitPreviewResult,
	SplitUploadResult,
	Store,
	SubscriptionGroup,
	SuggestCategoryRequest,
	SuggestCategoryResponse,
	SuggestKeywordsRequest,
	SyncVersionsResult,
	TranslateLocalizationRequest,
	TranslateRequest,
	UpdateCategoriesInput,
	UpdateCopyrightResult,
	UpdateLocalizationResult,
	UpdatePurchaseInput,
	VersionDetail,
	VersionInfo,
	VersionScreenshot,
} from "./types";
import type { VaultParams, VaultSetupPayload } from "./vault-crypto";

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
		if (res.status === 401 && typeof window !== "undefined") {
			// Call Better Auth sign-out to clear HttpOnly session cookie
			await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
			window.location.href = "/login";
			throw new ApiError(401, "UNAUTHORIZED");
		}
		if (res.status === 423 && typeof window !== "undefined") {
			// Vault locked — let the VaultProvider prompt for the passphrase.
			window.dispatchEvent(new CustomEvent("vault-locked"));
		}
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
		generatePurchaseField: (data: GeneratePurchaseFieldRequest) =>
			fetchApi<AiResponse>("/api/ai/generate-purchase-field", {
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
		territories: () =>
			fetchApi<{
				territories: Array<{
					code: string;
					currency: string;
					name: string;
				}>;
			}>("/api/ai/territories").then((r) => r.territories),
		quickAction: (data: {
			appId: string;
			instruction: string;
			focusContext?: QuickActionFocusContext;
			territories?: string[];
		}) =>
			fetchApi<{ explanation: string; plan: MonetizationPlan | null }>(
				"/api/ai/purchase-quick-action",
				{
					body: JSON.stringify(data),
					method: "POST",
				},
			),
		monetizationExecute: (
			appId: string,
			plan: {
				deletes?: string[];
				groupDeletes?: string[];
				edits?: Array<{
					localizations?: Array<{
						description?: string;
						language: string;
						name?: string;
					}>;
					name?: string;
					prices?: Array<{
						currency: string;
						price: string;
						territory: string;
					}>;
					purchaseId: string;
				}>;
				groupEdits?: Array<{
					groupId: string;
					name?: string;
				}>;
				groups?: Array<{
					id?: string;
					name: string;
					subscriptions: Array<{
						duration: string;
						localizations?: Array<{
							description?: string;
							language: string;
							name?: string;
						}>;
						name: string;
						prices?: Array<{
							currency: string;
							price: string;
							territory: string;
						}>;
						productId: string;
					}>;
				}>;
				purchases?: Array<{
					localizations?: Array<{
						description?: string;
						language: string;
						name?: string;
					}>;
					name: string;
					prices?: Array<{
						currency: string;
						price: string;
						territory: string;
					}>;
					productId: string;
					productType: string;
				}>;
			},
		) =>
			fetchApi<{
				results: {
					created: Array<{ id: string; name: string; type: string }>;
					deleted: string[];
					edited: Array<{ id: string; name: string }>;
					failed: Array<{ error: string; item: string }>;
				};
			}>("/api/ai/monetization-execute", {
				body: JSON.stringify({ appId, plan }),
				method: "POST",
			}).then((r) => r.results),
		chatHistory: (appId: string, chatType: string) =>
			fetchApi<{ messages: AiChatMessage[] }>(
				`/api/ai/chat-history?${toQuery({ appId, chatType })}`,
			).then((r) => r.messages),
		addChatMessage: (data: {
			appId: string;
			chatType: string;
			content: string;
			role: "assistant" | "user";
		}) =>
			fetchApi<{ message: AiChatMessage }>("/api/ai/chat-history", {
				body: JSON.stringify(data),
				method: "POST",
			}).then((r) => r.message),
		clearChatHistory: (appId: string, chatType: string) =>
			fetchApi<{ success: boolean }>(
				`/api/ai/chat-history?${toQuery({ appId, chatType })}`,
				{ method: "DELETE" },
			),
	},

	appGroups: {
		addMember: (groupId: string, appId: string) =>
			fetchApi<{ member: AppGroupMember }>(
				`/api/app-groups/${groupId}/members`,
				{
					body: JSON.stringify({ appId }),
					method: "POST",
				},
			).then((r) => r.member),
		create: (data: { name: string; iconUrl?: string }) =>
			fetchApi<{ appGroup: AppGroup }>("/api/app-groups", {
				body: JSON.stringify(data),
				method: "POST",
			}).then((r) => r.appGroup),
		delete: (groupId: string) =>
			fetchApi<{ success: boolean }>(`/api/app-groups/${groupId}`, {
				method: "DELETE",
			}),
		get: (groupId: string) =>
			fetchApi<{ appGroup: AppGroup }>(`/api/app-groups/${groupId}`).then(
				(r) => r.appGroup,
			),
		list: () =>
			fetchApi<{ appGroups: AppGroup[] }>("/api/app-groups").then(
				(r) => r.appGroups,
			),
		removeMember: (groupId: string, appId: string) =>
			fetchApi<{ success: boolean }>(
				`/api/app-groups/${groupId}/members/${appId}`,
				{ method: "DELETE" },
			),
		reorderGroups: (groupIds: string[]) =>
			fetchApi<{ success: boolean }>("/api/app-groups/reorder", {
				body: JSON.stringify({ groupIds }),
				method: "PUT",
			}),
		reorderMembers: (groupId: string, appIds: string[]) =>
			fetchApi<{ success: boolean }>(
				`/api/app-groups/${groupId}/reorder`,
				{
					body: JSON.stringify({ appIds }),
					method: "PUT",
				},
			),
		update: (groupId: string, data: { name?: string; iconUrl?: string | null; useSharedProfile?: boolean }) =>
			fetchApi<{ appGroup: AppGroup }>(`/api/app-groups/${groupId}`, {
				body: JSON.stringify(data),
				method: "PUT",
			}).then((r) => r.appGroup),
		getAsoProfile: (groupId: string) =>
			fetchApi<{ asoProfile: GroupAsoProfile | null; useSharedProfile: boolean }>(
				`/api/app-groups/${groupId}/aso-profile`,
			),
		updateAsoProfile: (groupId: string, data: GroupAsoProfileInput) =>
			fetchApi<{ asoProfile: GroupAsoProfile }>(
				`/api/app-groups/${groupId}/aso-profile`,
				{
					body: JSON.stringify(data),
					method: "PUT",
				},
			).then((r) => r.asoProfile),
		enableSharedProfile: (groupId: string, sourceAppId?: string | null) =>
			fetchApi<{ asoProfile: GroupAsoProfile | null; useSharedProfile: boolean }>(
				`/api/app-groups/${groupId}/aso-profile/enable`,
				{
					body: JSON.stringify({ sourceAppId: sourceAppId ?? null }),
					method: "POST",
				},
			),
	},

	apps: {
		capabilities: (appId: string) =>
			fetchApi<{ capabilities: PlatformCapabilities }>(
				`/api/apps/${appId}/capabilities`,
			).then((r) => r.capabilities),
		get: (appId: string) =>
			fetchApi<{ app: App }>(`/api/apps/${appId}`).then((r) => r.app),
		list: (params?: { platform?: string; storeId?: string }) =>
			fetchApi<{ apps: App[] }>(`/api/apps${toQuery(params ?? {})}`).then(
				(r) => r.apps,
			),
	},

	purchases: {
		capabilities: (appId: string) =>
			fetchApi<{ reason?: string; supported: boolean }>(
				`/api/apps/${appId}/purchases/capabilities`,
			),
		list: (appId: string) =>
			fetchApi<{ purchases: InAppPurchase[] }>(
				`/api/apps/${appId}/purchases`,
			).then((r) => r.purchases),
		get: (appId: string, purchaseId: string) =>
			fetchApi<{ purchase: InAppPurchase }>(
				`/api/apps/${appId}/purchases/${purchaseId}`,
			).then((r) => r.purchase),
		create: (appId: string, data: CreatePurchaseInput) =>
			fetchApi<{ purchase: InAppPurchase }>(
				`/api/apps/${appId}/purchases`,
				{ body: JSON.stringify(data), method: "POST" },
			).then((r) => r.purchase),
		update: (appId: string, purchaseId: string, data: UpdatePurchaseInput) =>
			fetchApi<{ purchase: InAppPurchase }>(
				`/api/apps/${appId}/purchases/${purchaseId}`,
				{ body: JSON.stringify(data), method: "PATCH" },
			).then((r) => r.purchase),
		delete: (appId: string, purchaseId: string) =>
			fetchApi<{ success: boolean }>(
				`/api/apps/${appId}/purchases/${purchaseId}`,
				{ method: "DELETE" },
			),
		sync: (appId: string) =>
			fetchApi<PurchaseSyncResult>(
				`/api/apps/${appId}/purchases/sync`,
				{ method: "POST" },
			),
		subscriptionGroups: (appId: string) =>
			fetchApi<{ groups: SubscriptionGroup[] }>(
				`/api/apps/${appId}/subscription-groups`,
			).then((r) => r.groups),
		subscriptionGroup: (appId: string, groupId: string) =>
			fetchApi<{ group: SubscriptionGroup }>(
				`/api/apps/${appId}/subscription-groups/${groupId}`,
			).then((r) => r.group),
		createGroup: (appId: string, data: CreateGroupInput) =>
			fetchApi<{ group: SubscriptionGroup }>(
				`/api/apps/${appId}/subscription-groups`,
				{ body: JSON.stringify(data), method: "POST" },
			).then((r) => r.group),
		createSubscription: (appId: string, groupId: string, data: CreateSubscriptionInput) =>
			fetchApi<{ purchase: InAppPurchase }>(
				`/api/apps/${appId}/subscription-groups/${groupId}/subscriptions`,
				{ body: JSON.stringify(data), method: "POST" },
			).then((r) => r.purchase),
		updateGroup: (appId: string, groupId: string, data: { name?: string }) =>
			fetchApi<{ group: SubscriptionGroup }>(
				`/api/apps/${appId}/subscription-groups/${groupId}`,
				{ body: JSON.stringify(data), method: "PATCH" },
			).then((r) => r.group),
		deleteGroup: (appId: string, groupId: string) =>
			fetchApi<{ success: boolean }>(
				`/api/apps/${appId}/subscription-groups/${groupId}`,
				{ method: "DELETE" },
			),

		// Group localizations
		groupLocalizations: (appId: string, groupId: string) =>
			fetchApi<{ localizations: GroupLocalization[] }>(
				`/api/apps/${appId}/subscription-groups/${groupId}/localizations`,
			).then((r) => r.localizations),
		upsertGroupLocalizations: (appId: string, groupId: string, localizations: Array<{ language: string; name?: string | null; description?: string | null }>) =>
			fetchApi<{ localizations: GroupLocalization[] }>(
				`/api/apps/${appId}/subscription-groups/${groupId}/localizations`,
				{ body: JSON.stringify({ localizations }), method: "PUT" },
			).then((r) => r.localizations),
		deleteGroupLocalization: (appId: string, groupId: string, language: string) =>
			fetchApi<{ success: boolean }>(
				`/api/apps/${appId}/subscription-groups/${groupId}/localizations/${language}`,
				{ method: "DELETE" },
			),

		// Group availability
		groupAvailability: (appId: string, groupId: string) =>
			fetchApi<{ territories: string[] }>(
				`/api/apps/${appId}/subscription-groups/${groupId}/availability`,
			).then((r) => r.territories),
		updateGroupAvailability: (appId: string, groupId: string, territories: string[]) =>
			fetchApi<{ territories: string[] }>(
				`/api/apps/${appId}/subscription-groups/${groupId}/availability`,
				{ body: JSON.stringify({ territories }), method: "PUT" },
			).then((r) => r.territories),

		// Group review info
		groupReviewInfo: (appId: string, groupId: string) =>
			fetchApi<{ reviewInfo: ReviewInfo | null }>(
				`/api/apps/${appId}/subscription-groups/${groupId}/review-info`,
			).then((r) => r.reviewInfo),
		updateGroupReviewInfo: (appId: string, groupId: string, data: { reviewNotes?: string | null; screenshotUrl?: string | null }) =>
			fetchApi<{ reviewInfo: ReviewInfo }>(
				`/api/apps/${appId}/subscription-groups/${groupId}/review-info`,
				{ body: JSON.stringify(data), method: "PUT" },
			).then((r) => r.reviewInfo),

		// Purchase availability
		purchaseAvailability: (appId: string, purchaseId: string) =>
			fetchApi<{ territories: string[] | null }>(
				`/api/apps/${appId}/purchases/${purchaseId}/availability`,
			).then((r) => r.territories),
		updatePurchaseAvailability: (appId: string, purchaseId: string, territories: string[] | null) =>
			fetchApi<{ territories: string[] | null }>(
				`/api/apps/${appId}/purchases/${purchaseId}/availability`,
				{ body: JSON.stringify({ territories }), method: "PUT" },
			).then((r) => r.territories),

		// Purchase review info
		purchaseReviewInfo: (appId: string, purchaseId: string) =>
			fetchApi<{ reviewInfo: ReviewInfo | null }>(
				`/api/apps/${appId}/purchases/${purchaseId}/review-info`,
			).then((r) => r.reviewInfo),
		updatePurchaseReviewInfo: (appId: string, purchaseId: string, data: { reviewNotes?: string | null; screenshotUrl?: string | null; useGroupDefault?: boolean }) =>
			fetchApi<{ reviewInfo: ReviewInfo }>(
				`/api/apps/${appId}/purchases/${purchaseId}/review-info`,
				{ body: JSON.stringify(data), method: "PUT" },
			).then((r) => r.reviewInfo),

		// Effective localizations
		effectiveLocalizations: (appId: string, purchaseId: string) =>
			fetchApi<{ localizations: GroupLocalization[]; source: string; useGroupLocalizations: boolean }>(
				`/api/apps/${appId}/purchases/${purchaseId}/effective-localizations`,
			),
		updateUseGroupLocalizations: (appId: string, purchaseId: string, useGroupLocalizations: boolean) =>
			fetchApi<{ localizations: GroupLocalization[]; source: string; useGroupLocalizations: boolean }>(
				`/api/apps/${appId}/purchases/${purchaseId}/use-group-localizations`,
				{ body: JSON.stringify({ useGroupLocalizations }), method: "PUT" },
			),

		// Family sharing
		updateFamilySharing: (appId: string, purchaseId: string, familySharable: boolean) =>
			fetchApi<{ purchase: InAppPurchase }>(
				`/api/apps/${appId}/purchases/${purchaseId}/family-sharing`,
				{ body: JSON.stringify({ familySharable }), method: "PATCH" },
			).then((r) => r.purchase),
	},

	asoProfile: {
		copyFrom: (appId: string, sourceAppId: string) =>
			fetchApi<{ asoProfile: AsoProfile }>(
				`/api/apps/${appId}/aso-profile/copy-from`,
				{
					body: JSON.stringify({ sourceAppId }),
					method: "POST",
				},
			).then((r) => r.asoProfile),
		get: (appId: string) =>
			fetchApi<{ asoProfile: AsoProfile | null; locked?: boolean; groupId?: string }>(
				`/api/apps/${appId}/aso-profile`,
			),
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

	features: {
		get: () => fetchApi<FeaturesResponse>("/api/features"),
		update: (data: Record<string, boolean>) =>
			fetchApi<{ features: Record<string, boolean> }>("/api/features", {
				body: JSON.stringify(data),
				method: "PATCH",
			}).then((r) => r.features),
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
		diffs: (appId: string) =>
			fetchApi<{ diffs: ListingDiff[] }>(
				`/api/apps/${appId}/listings/diffs`,
			).then((r) => r.diffs),
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
		update: (
			appId: string,
			language: string,
			data: Partial<Listing> & {
				doNotTranslateFields?: string[];
				translationInstructions?: string;
			},
		) =>
			fetchApi<{ listing: Listing }>(
				`/api/apps/${appId}/listings/${language}`,
				{
					body: JSON.stringify(data),
					method: "PUT",
				},
			).then((r) => r.listing),
		publishCategories: (appId: string) =>
			fetchApi<{ success: boolean }>(
				`/api/apps/${appId}/listings/categories/publish`,
				{ method: "POST" },
			),
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
			fetchApi<{
				version: {
					copiedLanguages: string[];
					state: string;
					versionString: string;
				};
			}>(`/api/apps/${appId}/publishing/create-version`, {
				body: JSON.stringify({ versionString }),
				method: "POST",
			}).then((r) => r.version),
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
		pushPreview: (appId: string) =>
			fetchApi<PushPreview>(`/api/apps/${appId}/publishing/push-preview`),
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
				shortDescription: string;
				fullDescription: string;
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
		publishSettings: (appId: string) =>
			fetchApi<{ publishMode: string; publishScheduledAt: string | null }>(
				`/api/apps/${appId}/publishing/settings`,
			),
		updatePublishSettings: (
			appId: string,
			data: { publishMode: string; publishScheduledAt?: string },
		) =>
			fetchApi<{ publishMode: string; publishScheduledAt: string | null }>(
				`/api/apps/${appId}/publishing/settings`,
				{
					body: JSON.stringify(data),
					method: "PUT",
				},
			),
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
		getMonetizationPrompts: () =>
			fetchApi<{ prompts: Record<string, GlobalPromptEntry> }>(
				"/api/settings/monetization-prompts",
			).then((r) => r.prompts),
		getMonetizationPromptDefaults: () =>
			fetchApi<{ defaults: Record<string, string> }>(
				"/api/settings/monetization-prompts/defaults",
			).then((r) => r.defaults),
		setMonetizationPrompt: (field: string, prompt: string) =>
			fetchApi<void>(`/api/settings/monetization-prompts/${field}`, {
				body: JSON.stringify({ prompt }),
				method: "PUT",
			}),
		deleteMonetizationPrompt: (field: string) =>
			fetchApi<void>(`/api/settings/monetization-prompts/${field}`, {
				method: "DELETE",
			}),
		getPurchasePrompts: () =>
			fetchApi<{ prompts: Record<string, GlobalPromptEntry> }>(
				"/api/settings/purchase-prompts",
			).then((r) => r.prompts),
		getPurchasePromptDefaults: () =>
			fetchApi<{ defaults: Record<string, string> }>(
				"/api/settings/purchase-prompts/defaults",
			).then((r) => r.defaults),
		setPurchasePrompt: (mode: string, field: string, prompt: string) =>
			fetchApi<void>(`/api/settings/purchase-prompts/${mode}/${field}`, {
				body: JSON.stringify({ prompt }),
				method: "PUT",
			}),
		deletePurchasePrompt: (mode: string, field: string) =>
			fetchApi<void>(`/api/settings/purchase-prompts/${mode}/${field}`, {
				method: "DELETE",
			}),
		getMonetizationGuide: () =>
			fetchApi<{ sections: Array<{ id: string; title: string; content: string }> }>(
				"/api/settings/monetization-guide",
			).then((r) => r.sections),
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
		publish: (appId: string) =>
			fetchApi<{ success: boolean }>(
				`/api/apps/${appId}/privacy-declaration/publish`,
				{ method: "POST" },
			),
		templates: (platform?: "ios" | "android") =>
			fetchApi<{ templates: PrivacyTemplate[] }>(
				`/api/privacy-templates${platform ? `?platform=${platform}` : ""}`,
			).then((r) => r.templates),
	},

	ageRating: {
		generate: (appId: string) =>
			fetchApi<{
				appleQuestionnaire: Record<string, string>;
				appleRating: string;
				googleQuestionnaire: Record<string, string | boolean>;
				model: string;
				presetId: string;
				reasoning: string;
			}>(`/api/apps/${appId}/age-rating/generate`, { method: "POST" }),
		get: (appId: string) =>
			fetchApi<{ ageRating: AgeRating | null }>(
				`/api/apps/${appId}/age-rating`,
			).then((r) => r.ageRating),
		publish: (appId: string) =>
			fetchApi<{ success: boolean }>(
				`/api/apps/${appId}/age-rating/publish`,
				{ method: "POST" },
			),
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
			fetchApi<ConnectStoreResponse>("/api/stores/connect", {
				body: JSON.stringify(data),
				method: "POST",
			}),
		disconnect: (id: string) =>
			fetchApi<void>(`/api/stores/${id}`, { method: "DELETE" }),
		list: () =>
			fetchApi<{ stores: Store[] }>("/api/stores").then((r) => r.stores),
		sync: (id: string) =>
			fetchApi<{ synced: number }>(`/api/stores/${id}/sync`, {
				method: "POST",
			}),
	},
	vault: {
		changePassphrase: (body: VaultParams) =>
			fetchApi<{ changed: boolean }>("/api/vault/change-passphrase", {
				body: JSON.stringify(body),
				method: "POST",
			}),
		lock: () =>
			fetchApi<{ locked: boolean }>("/api/vault/lock", { method: "POST" }),
		params: () => fetchApi<VaultParams>("/api/vault/params"),
		reset: () =>
			fetchApi<{ reset: boolean }>("/api/vault/reset", { method: "POST" }),
		setup: (body: VaultSetupPayload) =>
			fetchApi<{ migrated: number }>("/api/vault/setup", {
				body: JSON.stringify(body),
				method: "POST",
			}),
		status: () =>
			fetchApi<{ exists: boolean; unlocked: boolean }>("/api/vault/status"),
		unlock: (dek: string) =>
			fetchApi<{ unlocked: boolean }>("/api/vault/unlock", {
				body: JSON.stringify({ dek }),
				method: "POST",
			}),
	},
};

export { ApiError };
