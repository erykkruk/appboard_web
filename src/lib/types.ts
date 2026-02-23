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
	status?: string;
	createdAt?: string;
	updatedAt?: string;
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

export interface AsoProfile {
	id: string;
	appId: string;
	createdAt: string;
	updatedAt: string;

	// Required: Core Information
	category: string | null;
	differentiator: string | null;
	keyFeatures: string[] | null;
	mainBenefit: string | null;
	oneLiner: string | null;
	problem: string | null;

	// Optional A: Audience
	painPoints: string[] | null;
	targetAudience: string | null;
	userLanguage: string | null;

	// Optional B: Competitors
	competitiveAdvantage: string | null;
	competitors: string[] | null;
	positioning: string | null;

	// Optional C: Tone & Branding
	brandVoiceExample: string | null;
	tone: string | null;
	wordsToAvoid: string[] | null;
	wordsToInclude: string[] | null;

	// Optional D: Social Proof
	awards: string[] | null;
	downloadCount: string | null;
	pressQuotes: string[] | null;
	testimonials: string[] | null;

	// Optional E: Product Details
	freeFeatures: string[] | null;
	premiumFeatures: string[] | null;
	price: string | null;
	pricingModel: string | null;

	// Optional F: Keywords
	excludeKeywords: string[] | null;
	longTailKeywords: string[] | null;
	mustIncludeKeywords: string[] | null;
}

export type AsoProfileInput = Omit<
	AsoProfile,
	"id" | "appId" | "createdAt" | "updatedAt"
>;

export interface Settings {
	openrouter_api_key?: string;
	ai_model_generate?: string;
	ai_model_rephrase?: string;
	ai_model_research?: string;
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

export interface GeneratePrivacyRequest {
	appName: string;
	description: string;
}

export type ListingFieldName =
	| "title"
	| "subtitle"
	| "shortDescription"
	| "description"
	| "keywords"
	| "promotionalText"
	| "whatsNew";

export interface GenerateListingFieldRequest {
	appId: string;
	appName: string;
	currentValue?: string;
	field: ListingFieldName;
	language: string;
	platform: string;
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
	isDirty?: boolean;
}

export interface VersionDetail {
	versionId: string;
	versionString: string;
	state: string;
	copyright: string;
	localizations: VersionLocalization[];
	source?: "live" | "cache";
}

export interface UpdateLocalizationResult {
	updated: boolean;
	savedLocally?: boolean;
}

export interface UpdateCopyrightResult {
	updated: boolean;
	savedLocally?: boolean;
}

export interface SyncVersionsResult {
	source: "live" | "cache";
	synced: number;
}

export interface PublishLocalizationsResult {
	published: number;
	errors?: string[];
	error?: string;
	savedLocally?: boolean;
}

export interface ReviewAttachment {
	id: string;
	fileName: string;
	fileSize: number;
	url: string;
}

export interface AppReviewDetail {
	reviewDetailId: string;
	contactFirstName: string;
	contactLastName: string;
	contactPhone: string;
	contactEmail: string;
	demoAccountName: string;
	demoAccountPassword: string;
	demoAccountRequired: boolean;
	notes: string;
	attachments: ReviewAttachment[];
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

// Privacy Declaration
export interface DataCollectionItem {
	category: string;
	dataType: string;
	linked: boolean;
	purposes: string[];
	tracking: boolean;
}

export interface PrivacyDeclaration {
	id: string;
	appId: string;
	templateId: string;
	dataCollections: DataCollectionItem[] | null;
	privacyPolicyUrl: string | null;
	trackingEnabled: boolean;
	trackingDomains: string[] | null;
	createdAt: string;
	updatedAt: string;
}

export interface PrivacyDeclarationInput {
	templateId: string;
	dataCollections?: DataCollectionItem[];
	privacyPolicyUrl?: string | null;
	trackingEnabled?: boolean;
	trackingDomains?: string[] | null;
}

export interface PrivacyTemplate {
	id: string;
	name: string;
	description: string;
	dataCollections: DataCollectionItem[];
}

// Age Rating
export interface AgeRating {
	id: string;
	appId: string;
	presetId: string;
	appleQuestionnaire: Record<string, string> | null;
	googleQuestionnaire: Record<string, string | boolean> | null;
	appleRating: string | null;
	googleRating: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AgeRatingInput {
	presetId: string;
	appleQuestionnaire?: Record<string, string>;
	googleQuestionnaire?: Record<string, string | boolean>;
}

export interface AgeRatingPreset {
	id: string;
	name: string;
	description: string;
	appleRating: string;
	googleRating: string;
	appleQuestionnaire: Record<string, string>;
	googleQuestionnaire: Record<string, string | boolean>;
}

export interface GlobalPromptEntry {
	customPrompt: string | null;
	defaultPrompt: string;
	isDefault: boolean;
}

export interface AppAiPrompt {
	id: string;
	appId: string;
	field: string;
	mode: string;
	prompt: string;
	createdAt: string;
	updatedAt: string;
}

// Categories
export interface AppStoreCategory {
	id: string;
	name: string;
}

export interface CategoriesData {
	primaryCategory: string | null;
	secondaryCategory: string | null;
	availableCategories: AppStoreCategory[];
}

export interface UpdateCategoriesInput {
	primaryCategory: string;
	secondaryCategory?: string;
}

export interface SuggestCategoryRequest {
	appId: string;
	appName: string;
	platform: string;
	description?: string;
}

export interface SuggestCategoryResponse {
	primary: string;
	secondary: string | null;
	reasoning: string;
	model: string;
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
