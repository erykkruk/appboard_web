export type StoreType = "google_play" | "app_store";

export interface Store {
	id: string;
	type: StoreType;
	name: string;
	status: string;
	createdAt: string;
	lastSyncedAt: string | null;
	capabilities: string[];
}

export interface ConnectStoreResponse {
	store: Store;
	syncedApps: number;
	warnings: string[];
	capabilities: string[];
}

// ============ Store Capabilities ============

export type StoreCapabilityId =
	| "listings"
	| "assets"
	| "reviews"
	| "publishing"
	| "purchases"
	| "age_rating"
	| "categories"
	| "privacy";

export interface StoreCapabilityDefinition {
	id: StoreCapabilityId;
	storeType: StoreType;
	name: string;
	description: string;
	core: boolean;
	wired: boolean;
	consoleOnly: boolean;
	gateable: boolean;
	dependsOn: string[];
	consoleRoles: string[];
	gcpApis: string[];
}

export interface StoreSetupInfo {
	storeType: StoreType;
	baseGcpApis: string[];
	baseNote: string;
}

export interface CapabilityCatalog {
	capabilities: StoreCapabilityDefinition[];
	setup: Record<StoreType, StoreSetupInfo>;
}

export interface StoreCapabilities {
	storeType: StoreType;
	capabilities: string[];
}

export type CapabilityAccessStatus =
	| "granted"
	| "missing"
	| "unsupported"
	| "unknown"
	| "error";

export interface CapabilityAccessResult {
	id: string;
	status: CapabilityAccessStatus;
	detail?: string;
}

export interface CapabilityAccessReport {
	storeType: StoreType;
	results: CapabilityAccessResult[];
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
	videoUrl: string;
	source: string;
	isDirty: boolean;
	doNotTranslateFields: string[] | null;
	translationInstructions: string | null;
	[key: string]: string | string[] | boolean | null;
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

export type FeatureKey =
	| "LISTINGS"
	| "SCREENSHOTS"
	| "PUBLISHING"
	| "REVIEWS"
	| "AI"
	| "PURCHASES"
	| "ASO_PROFILE"
	| "AGE_RATING"
	| "PRIVACY"
	| "HISTORY"
	| "GROUPS"
	| "MONETIZATION_CHAT"
	| "RESEARCH";

export interface FeatureDefinition {
	key: FeatureKey;
	name: string;
	description: string;
	defaultEnabled: boolean;
	dependsOn?: FeatureKey[];
}

export interface FeaturesResponse {
	definitions: FeatureDefinition[];
	features: Record<FeatureKey, boolean>;
}

export interface ListingDiffField {
	field: string;
	oldValue: string | null;
	newValue: string | null;
}

export interface ListingDiff {
	language: string;
	fields: ListingDiffField[];
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
	primary_territory?: string;
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
	capabilities?: string[];
}

export interface SettingRow {
	id: string;
	key: string;
	value: string | null;
	isEncrypted: boolean;
}

export interface TranslateRequest {
	text: string;
	targetLanguages: string[];
}

export interface TranslateLocalizationRequest {
	appId: string;
	appName: string;
	platform: string;
	fields: Record<string, string>;
	sourceLanguage: string;
	targetLanguage: string;
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
	platform?: "ios" | "android";
}

export type ListingFieldName =
	| "title"
	| "subtitle"
	| "shortDescription"
	| "description"
	| "fullDescription"
	| "keywords"
	| "promotionalText"
	| "whatsNew";

export type PurchaseFieldName =
	| "purchaseName"
	| "purchaseDescription"
	| "reviewNotes"
	| "productId"
	| "groupName"
	| "groupDescription";

export interface GeneratePurchaseFieldRequest {
	appId: string;
	field: PurchaseFieldName;
	context: {
		appName: string;
		productType?: string;
		productName?: string;
		groupName?: string;
		duration?: string;
		bundleId?: string;
	};
	currentValue?: string;
	language?: string;
}

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

export interface PushPreview {
	ageRating: {
		appleRating?: string | null;
		configured: boolean;
		googleRating?: string | null;
		presetId?: string;
	};
	assets: {
		added: number;
		count: number;
		removed: number;
	};
	categories: {
		primaryCategory: string | null;
		secondaryCategory: string | null;
	} | null;
	isIos: boolean;
	listings: {
		changes: { language: string; fields: string[] }[];
		count: number;
	};
	privacy: {
		configured: boolean;
		dataCollectionCount?: number;
		templateId?: string;
		trackingEnabled?: boolean;
	};
	purchases: {
		groupCount: number;
		localizationCount: number;
		priceCount: number;
		purchaseCount: number;
	};
	version: {
		isEditable: boolean;
		state: string;
		suggestedVersion: string | null;
		versionString: string;
	} | null;
}

export interface PublishReportItem {
	kind: "asset" | "listing" | "localization";
	ref: string;
	status: "published" | "failed";
	error?: string;
}

export interface PublishResult {
	listings: { published: number };
	assets: { published: number };
	versionLocalizations?: { published: number; errors?: string[] };
	report?: PublishReportItem[];
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
	shortDescription?: string;
	fullDescription?: string;
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

// Screenshot dimension validation (pre-upload /validate endpoint response)
export interface ScreenshotValidationResult {
	displayType: string;
	displayTypeName: string;
	providedDimensions: [number, number];
	supportedDimensions: [number, number][];
	suggestion: string;
	valid: boolean;
}

// Shape of `ApiError.data` when an upload fails with code
// "INVALID_SCREENSHOT_DIMENSIONS" (HTTP 422). Mirrors the backend error payload.
export interface ScreenshotDimensionErrorData {
	displayType: string;
	displayTypeName: string;
	info: string;
	providedDimensions: [number, number];
	suggestion: string;
	supportedDimensions: [number, number][];
}

// Screenshot editor scene (browser-based canvas editor).
// `SceneData` mirrors the backend `jsonb` shape stored per scene — the frontend
// owns rendering/export, the backend persists this object intact.
export type SceneBackgroundType = "color" | "gradient" | "image";
export type SceneTextAlign = "left" | "center" | "right";
export type SceneScreenshotFit = "cover" | "contain";
/** How a background image fills the canvas. Superset of {@link SceneScreenshotFit}. */
export type SceneBackgroundFit = "cover" | "contain" | "stretch";
export type SceneDeviceFrame =
	| "iphone"
	| "android"
	| "ipad"
	| "android-tablet"
	| "apple-watch"
	| "laptop"
	| "none";
/** Device frame body color. Defaults per platform (iPhone→silver, Android→black). */
export type SceneDeviceColor = "black" | "silver";
/**
 * Device rendering style: "realistic" draws metallic rails and platform
 * details; "clay" draws a flat matte body in an arbitrary color (clayColor);
 * "photo" composites the screenshot into a photographic Apple product bezel
 * (see `bezelId`); "3d" renders a true GLB model with WebGL (see `modelId`).
 */
export type SceneDeviceStyle = "realistic" | "clay" | "photo" | "3d";

/** Gradient shape: linear (legacy default), radial or a soft multi-blob mesh. */
export type SceneGradientType = "linear" | "radial" | "mesh";

export type SceneBackgroundPatternType =
	| "dots"
	| "grid"
	| "diagonal"
	| "waves"
	| "rings"
	| "noise";

/** Decorative procedural pattern drawn over the base background fill. */
export interface SceneBackgroundPattern {
	type: SceneBackgroundPatternType;
	color: string;
	/** 0..1 overlay opacity. */
	opacity: number;
	/** Pattern density multiplier (~0.5 fine .. 3 chunky). */
	scale: number;
}

export interface SceneBackground {
	type: SceneBackgroundType;
	value: string;
	gradient?: { from: string; to: string; angle: number };
	/** Gradient shape (gradient type only). Defaults to "linear". */
	gradientType?: SceneGradientType;
	/** Optional middle gradient stop (linear/radial only). */
	via?: string;
	/** Blob colors for the "mesh" gradient (2–5 colors over `gradient.from`). */
	mesh?: string[];
	/** Optional procedural pattern overlay drawn over any background type. */
	pattern?: SceneBackgroundPattern;
	/** Image fill mode (image type only). Defaults to "cover". */
	fit?: SceneBackgroundFit;
	/**
	 * Focal offsets (-1..1, default 0) used in "cover" mode to pick which part
	 * of the image survives the crop (poor-man's crop panning).
	 */
	offsetX?: number;
	offsetY?: number;
}

export interface SceneDevice {
	frame: SceneDeviceFrame;
	scale: number;
	offsetX: number;
	offsetY: number;
	rotation?: number;
	/** Frame body color. Defaults to silver for iPhone, black for Android. */
	color?: SceneDeviceColor;
	/**
	 * 3D tilt in degrees around the horizontal (X) and vertical (Y) axes.
	 * Rendered as a perspective warp of the flat device render; 0/undefined
	 * keeps the legacy flat look, so old scenes render unchanged.
	 */
	rotationX?: number;
	rotationY?: number;
	/** Rendering style. Defaults to "realistic" (legacy scenes). */
	style?: SceneDeviceStyle;
	/** Flat body color used when style is "clay". */
	clayColor?: string;
	/** Photographic bezel id from the DEVICE_BEZELS catalog ("photo" style). */
	bezelId?: string;
	/** 3D model id from the DEVICE_MODELS catalog ("3d" style). */
	modelId?: string;
	/** Soft elliptical shadow on the "floor" under the device. */
	groundShadow?: boolean;
	/** Diagonal glass reflection over the screen. */
	glare?: boolean;
}

export interface SceneScreenshot {
	assetId?: string;
	url?: string;
	fit?: SceneScreenshotFit;
}

export interface SceneTextLayer {
	id: string;
	text: string;
	x: number;
	y: number;
	fontFamily: string;
	fontSize: number;
	color: string;
	align: SceneTextAlign;
	weight?: number;
	/** Optional background color drawn as a rounded panel behind the text. */
	bg?: string;
	/** Optional text outline (both must be set for the stroke to draw). */
	strokeColor?: string;
	strokeWidth?: number;
	/**
	 * Optional drop shadow. Offsets are scene-space pixels (positive Y = shadow
	 * below the text). The shadow draws when a color is set.
	 */
	shadowColor?: string;
	shadowOffsetX?: number;
	shadowOffsetY?: number;
	shadowBlur?: number;
	/**
	 * When true, this layer's text is kept verbatim across language variants
	 * (e.g. brand names, prices). Persisted inside the opaque `jsonb` scene, so
	 * no backend migration is needed.
	 */
	doNotTranslate?: boolean;
	/** Gradient text fill (overrides `color` when set). Drawn top→bottom. */
	gradient?: { from: string; to: string };
	/** Marker-style highlight bar drawn behind each text line. */
	highlight?: string;
	/** Extra spacing between glyphs in px (canvas letterSpacing). */
	letterSpacing?: number;
	/** Line height as a multiple of fontSize. Defaults to 1.2. */
	lineHeight?: number;
	/**
	 * Arc curvature in degrees (-180..180). The text bends along a circle
	 * spanning this many degrees: positive arches upward, negative downward,
	 * 0/undefined renders straight (legacy).
	 */
	curve?: number;
}

export type SceneAnnotationType = "callout" | "badge" | "label";

/**
 * Properties shared by every annotation variant. Positions (`x`/`y`) are
 * normalized (0..1) fractions of the scene, mirroring {@link SceneTextLayer},
 * so annotations survive a change of target dimensions. Color/font props are
 * named consistently with text layers (`color` = text color, `fontSize`,
 * `weight`) for a uniform properties panel.
 */
interface SceneAnnotationBase {
	id: string;
	text: string;
	/** Normalized (0..1) anchor position of the annotation box. */
	x: number;
	y: number;
	fontSize: number;
	/** Text color. */
	color: string;
	/** Background fill color of the pill/bubble/label. */
	bg: string;
	weight?: number;
	fontFamily?: string;
	/**
	 * When true, the text is kept verbatim across language variants (e.g. a "NEW"
	 * badge or a brand name). Persisted in the opaque `jsonb` scene — no backend
	 * migration needed. Mirrors {@link SceneTextLayer.doNotTranslate}.
	 */
	doNotTranslate?: boolean;
}

/** A text bubble with a pointer/tail aimed at a target point on the scene. */
export interface SceneCalloutAnnotation extends SceneAnnotationBase {
	type: "callout";
	/** Normalized (0..1) point the tail points toward. */
	targetX: number;
	targetY: number;
}

/** A pill-shaped badge with text. */
export interface SceneBadgeAnnotation extends SceneAnnotationBase {
	type: "badge";
}

/** A simple text label with an optional background. */
export interface SceneLabelAnnotation extends SceneAnnotationBase {
	type: "label";
	/** When false, the label is drawn without a background fill. */
	showBackground?: boolean;
}

/**
 * A user-uploaded image layer (logo, sticker, arrow…). Unlike text annotations
 * it has no text/font props; `width` is a normalized (0..1) fraction of the
 * scene width and the height follows the image's natural aspect ratio.
 */
export interface SceneImageAnnotation {
	type: "image";
	id: string;
	/** Normalized (0..1) center position of the image box. */
	x: number;
	y: number;
	/** Normalized (0..1) width as a fraction of scene width. */
	width: number;
	/** Image source: dataURL (uploaded) or remote URL. */
	url: string;
	/** 0..1 opacity, default 1. */
	opacity?: number;
	/** Rotation in degrees, default 0. */
	rotation?: number;
	/**
	 * Natural aspect ratio (height / width), captured at upload time so the
	 * hit-test box matches the rendered box before the image is decoded.
	 */
	aspect?: number;
}

/** Hand-drawn decorative shape variants. */
export type SceneShapeKind =
	| "arrow"
	| "underline"
	| "squiggle"
	| "circle"
	| "sparkle"
	| "star"
	| "rating"
	| "heart"
	| "check"
	| "blob";

/**
 * A decorative vector shape (hand-drawn arrow, marker underline, squiggle,
 * circled emphasis, sparkles…) rendered procedurally — no image asset needed.
 * Positions/width are normalized (0..1) like other annotations.
 */
export interface SceneShapeAnnotation {
	type: "shape";
	id: string;
	shape: SceneShapeKind;
	/** Normalized (0..1) center position. */
	x: number;
	y: number;
	/** Normalized (0..1) width as a fraction of scene width. */
	width: number;
	color: string;
	/** Stroke thickness in scene px (stroked shapes only). */
	strokeWidth?: number;
	/** Rotation in degrees, default 0. */
	rotation?: number;
	/** 0..1 opacity, default 1. */
	opacity?: number;
	/** Mirror horizontally (e.g. flip an arrow's direction). */
	flip?: boolean;
}

/** Text-bearing annotation variants (everything except image layers). */
export type SceneTextAnnotation =
	| SceneCalloutAnnotation
	| SceneBadgeAnnotation
	| SceneLabelAnnotation;

export type SceneAnnotation =
	| SceneTextAnnotation
	| SceneImageAnnotation
	| SceneShapeAnnotation;

/** A custom font uploaded by the user, embedded in the scene as a dataURL. */
export interface SceneCustomFont {
	family: string;
	dataUrl: string;
}

export interface SceneData {
	width: number;
	height: number;
	background: SceneBackground;
	device?: SceneDevice;
	screenshot?: SceneScreenshot;
	textLayers: SceneTextLayer[];
	annotations?: SceneAnnotation[];
	/** User-uploaded fonts referenced by text layers/annotations. */
	customFonts?: SceneCustomFont[];
	/**
	 * Google Fonts families referenced by text layers/annotations, loaded
	 * dynamically from fonts.googleapis.com. Persisted in the opaque `jsonb`
	 * scene — no backend migration needed.
	 */
	googleFonts?: string[];
	/**
	 * Panorama panel count (default 1). When > 1 the scene is one wide canvas
	 * spanning N store screenshots (`width` = target width × panels); export
	 * splits it back into N images. Persisted in the opaque `jsonb` scene.
	 */
	panels?: number;
}

export interface ScreenshotScene {
	id: string;
	appId: string;
	assetId: string | null;
	displayType: string;
	language: string;
	name: string;
	scene: SceneData;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

// Privacy Declaration
export interface DataCollectionItem {
	category: string;
	collected?: boolean;
	dataType: string;
	ephemeral?: boolean;
	linked: boolean;
	purposes: string[];
	required?: boolean;
	shared?: boolean;
	tracking: boolean;
}

export interface PrivacyDeclaration {
	id: string;
	appId: string;
	templateId: string;
	dataCollections: DataCollectionItem[] | null;
	gpDeletionMechanism: boolean;
	gpEncryptedInTransit: boolean;
	privacyPolicyUrl: string | null;
	trackingEnabled: boolean;
	trackingDomains: string[] | null;
	createdAt: string;
	updatedAt: string;
}

export interface PrivacyDeclarationInput {
	templateId: string;
	dataCollections?: DataCollectionItem[];
	gpDeletionMechanism?: boolean;
	gpEncryptedInTransit?: boolean;
	privacyPolicyUrl?: string | null;
	trackingEnabled?: boolean;
	trackingDomains?: string[] | null;
}

export interface PrivacyTemplate {
	id: string;
	name: string;
	description: string;
	platform: "ios" | "android";
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

// App Groups
export interface AppGroupMember {
	id: string;
	appId: string;
	sortOrder: number;
	app: {
		id: string;
		name: string;
		platform: Platform;
		iconUrl: string | null;
		bundleId: string;
	};
}

export interface AppGroup {
	id: string;
	name: string;
	iconUrl: string | null;
	sortOrder: number;
	useSharedProfile: boolean;
	workspaceId: string;
	createdAt: string;
	updatedAt: string;
	members: AppGroupMember[];
}

export interface GroupAsoProfile {
	id: string;
	groupId: string;
	createdAt: string;
	updatedAt: string;
	category: string | null;
	differentiator: string | null;
	keyFeatures: string[] | null;
	mainBenefit: string | null;
	oneLiner: string | null;
	problem: string | null;
	painPoints: string[] | null;
	targetAudience: string | null;
	userLanguage: string | null;
	competitiveAdvantage: string | null;
	competitors: string[] | null;
	positioning: string | null;
	brandVoiceExample: string | null;
	tone: string | null;
	wordsToAvoid: string[] | null;
	wordsToInclude: string[] | null;
	awards: string[] | null;
	downloadCount: string | null;
	pressQuotes: string[] | null;
	testimonials: string[] | null;
	freeFeatures: string[] | null;
	premiumFeatures: string[] | null;
	price: string | null;
	pricingModel: string | null;
	excludeKeywords: string[] | null;
	longTailKeywords: string[] | null;
	mustIncludeKeywords: string[] | null;
}

export type GroupAsoProfileInput = Omit<
	GroupAsoProfile,
	"id" | "groupId" | "createdAt" | "updatedAt"
>;

export interface SplitPreviewResult {
	availableSizes: { height: number; width: number }[];
	originalWidth: number;
	originalHeight: number;
	parts: number;
	partWidth: number;
	partHeight: number;
	targetWidth: number;
	targetHeight: number;
	suggestedParts: number;
	previewUrl: string;
}

export interface SplitUploadResult {
	screenshots: VersionScreenshot[];
	count: number;
}

export interface PlatformCapabilities {
	listings: {
		fields: string[];
		maxLengths: Record<string, number>;
	};
	publishing: {
		hasVersions: boolean;
		hasTracks: boolean;
		hasReviewSubmission: boolean;
	};
	ageRating: { supported: boolean };
	categories: { supported: boolean };
	privacy: { supported: boolean };
	reviews: { supported: boolean; canReply: boolean };
	assets: {
		types: string[];
		screenshotDevices: string[];
	};
}

// Group Localizations & Review Info
export interface GroupLocalization {
	id: string;
	groupId: string;
	language: string;
	name: string | null;
	description: string | null;
}

export interface ReviewInfo {
	id: string;
	reviewNotes: string | null;
	screenshotUrl: string | null;
	useGroupDefault?: boolean;
}

// In-App Purchases & Subscriptions
export interface PurchaseLocalization {
	id: string;
	purchaseId: string;
	language: string;
	name: string | null;
	description: string | null;
	externalId: string | null;
	syncedAt: string | null;
}

export interface PurchasePrice {
	id: string;
	purchaseId: string;
	territory: string;
	currency: string;
	price: string;
	externalId: string | null;
	syncedAt: string | null;
}

export interface InAppPurchase {
	id: string;
	appId: string;
	externalId: string;
	productId: string;
	name: string;
	productType: string;
	status: string;
	duration: string | null;
	groupId: string | null;
	familySharable: boolean;
	availableTerritories: string[] | null;
	reviewInfo: ReviewInfo | null;
	syncedAt: string | null;
	localizations: PurchaseLocalization[];
	prices: PurchasePrice[];
}

export interface SubscriptionGroup {
	id: string;
	appId: string;
	externalId: string;
	name: string;
	localizations: GroupLocalization[];
	availableTerritories: string[] | null;
	reviewInfo: ReviewInfo | null;
	syncedAt: string | null;
	subscriptions: InAppPurchase[];
}

export interface PurchaseSyncResult {
	syncedGroups: number;
	syncedSubscriptions: number;
	syncedIaps: number;
}

export interface CreatePurchaseInput {
	name: string;
	productId: string;
	productType: string;
	localizations?: { language: string; name?: string; description?: string }[];
	prices?: { territory: string; currency: string; price: string }[];
}

export interface UpdatePurchaseInput {
	name?: string;
	localizations?: { language: string; name?: string; description?: string }[];
	prices?: { territory: string; currency: string; price: string }[];
}

export interface CreateGroupInput {
	name: string;
}

export interface CreateSubscriptionInput {
	name: string;
	productId: string;
	duration: string;
	localizations?: { language: string; name?: string; description?: string }[];
	prices?: { territory: string; currency: string; price: string }[];
}

export interface AiChatMessage {
	appId: string;
	chatType: string;
	content: string;
	createdAt: string;
	id: string;
	role: "assistant" | "user";
	sortOrder: number;
	updatedAt: string;
	workspaceId: string;
}

// AI Quick Action
export interface MonetizationPlan {
	deletes?: string[];
	groupDeletes?: string[];
	edits?: Array<{
		localizations?: Array<{
			description?: string;
			language: string;
			name?: string;
		}>;
		name?: string;
		prices?: Array<{ currency: string; price: string; territory: string }>;
		purchaseId: string;
	}>;
	groupEdits?: Array<{
		availability?: string[];
		groupId: string;
		localizations?: Array<{
			description?: string;
			language: string;
			name?: string;
		}>;
		name?: string;
		reviewNotes?: string;
	}>;
	groups?: Array<{
		availability?: string[];
		id?: string;
		localizations?: Array<{
			description?: string;
			language: string;
			name?: string;
		}>;
		name: string;
		reviewNotes?: string;
		subscriptions: Array<{
			duration: string;
			localizations?: Array<{
				description?: string;
				language: string;
				name?: string;
			}>;
			name: string;
			prices?: Array<{ currency: string; price: string; territory: string }>;
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
		prices?: Array<{ currency: string; price: string; territory: string }>;
		productId: string;
		productType: string;
	}>;
}

export interface QuickActionFocusContext {
	duration?: string;
	groupName?: string;
	id: string;
	localizations?: Array<{
		description?: string;
		language: string;
		name?: string;
	}>;
	name: string;
	prices?: Array<{ currency: string; price: string; territory: string }>;
	productId?: string;
	productType?: string;
	type: "group" | "purchase";
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

// ============ Research (ASO Review Analyzer) ============

export type ResearchStoreKind = "appstore" | "playstore";

export type ResearchSearchScope = "appstore" | "both" | "playstore";

export interface ResearchSuggestion {
	developer: string;
	icon?: string;
	id: string;
	rating?: number;
	store: ResearchStoreKind;
	title: string;
	url: string;
}

export interface ResearchAppMeta {
	adSupported?: boolean;
	contentRating?: string;
	country: string;
	description?: string;
	developer: string;
	downloads?: string;
	free?: boolean;
	genre?: string;
	iapRange?: string;
	icon?: string;
	id: string;
	lastUpdate?: string;
	minInstalls?: number;
	offersIAP?: boolean;
	price?: string;
	rating?: number;
	ratingsCount?: number;
	released?: string;
	reviewsCount?: number;
	screenshots?: string[];
	store: ResearchStoreKind;
	summary?: string;
	title: string;
	url: string;
	version?: string;
}

export interface ResearchReview {
	date?: string;
	stars: number;
	store: ResearchStoreKind;
	text: string;
	title?: string;
	version?: string;
}

export interface ResearchHeuristicBucket {
	count: number;
	id: string;
	label: string;
	quotes: string[];
}

export interface ResearchHeuristics {
	buckets: ResearchHeuristicBucket[];
	byStars: Record<string, number>;
	negative: number;
	negativeShare: number;
	total: number;
}

export interface ResearchScrapeResult {
	heuristics: ResearchHeuristics;
	meta: ResearchAppMeta;
	reviews: ResearchReview[];
}

export type ResearchSeverity = "high" | "low" | "medium";

export interface ResearchAnalysisCategory {
	count: number;
	id: string;
	insight: string;
	quotes: string[];
	severity: ResearchSeverity;
}

export interface ResearchAnalysisFeature {
	insight: string;
	mentions: number;
	name: string;
}

export interface ResearchAsoKeyword {
	keyword: string;
	reason: string;
}

export interface ResearchAnalysis {
	asoKeywords: ResearchAsoKeyword[];
	categories: ResearchAnalysisCategory[];
	featuresHated: ResearchAnalysisFeature[];
	featuresLoved: ResearchAnalysisFeature[];
	metadataTips: string[];
	quickWins: string[];
	sentiment: { negative: number; neutral: number; positive: number };
	summary: string;
	topIrritations: string[];
}

export interface ResearchKeywordPosition {
	appstore?: number | null;
	keyword: string;
	playstore?: number | null;
}

export interface ResearchMarketSnapshot {
	country: string;
	devReplyRate?: number;
	error?: string;
	negativeShare?: number;
	rating?: number;
	ratingsCount?: number;
}

export interface ResearchVisualAnalysis {
	conversionTips: string[];
	iconVerdict: string;
	screenshotFindings: string[];
}

export interface ResearchComparison {
	featureGaps: string[];
	theyDoBetter: string[];
	verdict: string;
	weDoBetter: string[];
}

export interface ResearchCompareResult {
	comparison?: ResearchComparison;
	compHeuristics: ResearchHeuristics;
	compMeta: ResearchAppMeta;
	compReviews: ResearchReview[];
	model?: string;
}

// ============ Research history & Rank tracking ============

export type ResearchRunKind = "manual" | "scheduled";

export type AutoResearchFrequency = "daily" | "monthly" | "weekly";

export const MAX_TRACKED_KEYWORDS_PER_LANGUAGE = 20;

export interface ResearchRunReport {
	analysis?: ResearchAnalysis;
	deep?: boolean;
	heuristics: ResearchHeuristics;
	keywords?: ResearchKeywordPosition[];
	meta: ResearchAppMeta;
	reviewsCount: number;
}

// Row shape returned by list endpoints (no `report` payload).
export interface ResearchRunSummary {
	appId: string | null;
	country: string | null;
	createdAt: string;
	externalId: string | null;
	id: string;
	kind: ResearchRunKind;
	store: ResearchStoreKind | null;
	summary: string | null;
	title: string | null;
}

export interface ResearchRun extends ResearchRunSummary {
	report: ResearchRunReport;
}

export interface AppTrackingConfig {
	appId: string;
	autoResearchEnabled: boolean;
	autoResearchFrequency: AutoResearchFrequency;
	emailRankDigest: boolean;
	lastAutoResearchAt: string | null;
	lastRankCheckAt: string | null;
	notifyEmail: string | null;
	rankTrackingEnabled: boolean;
	workspaceId: string;
}

export interface TrackedKeyword {
	appId: string;
	country: string;
	createdAt: string;
	id: string;
	keyword: string;
}

export interface LatestRankPosition {
	capturedAt: string;
	country: string;
	delta: number | null;
	keyword: string;
	platform: ResearchStoreKind;
	position: number | null;
	previousPosition: number | null;
}

export interface RankSnapshot {
	country: string;
	createdAt: string;
	id: string;
	keyword: string;
	platform: ResearchStoreKind;
	position: number | null;
}

export interface RankAnnotation {
	date: string | null;
	field: string;
	language: string;
	newValue: string | null;
	oldValue: string | null;
}

export interface RankHistory {
	annotations: RankAnnotation[];
	snapshots: RankSnapshot[];
}

export interface TrackingOverview {
	config: AppTrackingConfig;
	keywords: TrackedKeyword[];
	positions: LatestRankPosition[];
}

export interface TrackingSummaryStats {
	avgPosition: number | null;
	bestPosition: number | null;
	declinedCount: number;
	improvedCount: number;
	lastCheckedAt: string | null;
	rankedKeywords: number;
	top10Count: number;
	trackedKeywords: number;
}

export interface TrackingSummary {
	config: AppTrackingConfig;
	positions: LatestRankPosition[];
	stats: TrackingSummaryStats;
}
