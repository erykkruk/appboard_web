import { ApiError } from "@/lib/api";
import type { App, KeywordClassification, Listing } from "@/lib/types";

/**
 * The apps row carries primaryCategory but the shared App type does not list
 * it yet; read it in one place so the page stays typed.
 */
export function appPrimaryCategory(app: App | undefined): string | undefined {
	const category = (app as { primaryCategory?: string | null } | undefined)
		?.primaryCategory;
	return category || undefined;
}

/** Enough chips to choose from without turning the step into a research tool. */
export const MAX_TARGET_KEYWORDS = 10;

/** Anything longer than this is a sentence the model slipped in, not a keyword. */
const MAX_KEYWORD_CHARS = 50;
const MAX_KEYWORD_WORDS = 5;

/** Classifications worth pre-selecting for the description. */
export const RECOMMENDED_CLASSIFICATIONS: ReadonlySet<KeywordClassification> =
	new Set<KeywordClassification>(["sweet-spot", "good-target", "hidden-gem"]);

/** One plain sentence per classification, for people who do not read scores. */
export const CLASSIFICATION_SENTENCE: Record<KeywordClassification, string> = {
	avoid: "Rarely searched and hard to win - skip it.",
	"good-target": "Searched often, competition you can beat - a solid pick.",
	"hidden-gem": "Fewer searches, almost no competition - easy to own.",
	"high-competition": "Searched a lot, but big apps own it - hard to rank.",
	"low-volume": "Almost nobody searches this - only if it fits perfectly.",
	moderate: "Some searches, some competition - fine as a supporting term.",
	"sweet-spot": "Searched often, weak competition - worth it.",
	unknown: "Not enough data to judge this one.",
};

function stripCodeFence(text: string): string {
	return text.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "");
}

/** Bullets, numbering and quotes are formatting noise, not part of the term. */
function cleanKeyword(raw: string): string {
	return raw
		.replace(/^[\s\-*\u2022\d.)]+/, "")
		.replace(/["'\u201c\u201d\u2018\u2019]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function looksLikeKeyword(keyword: string): boolean {
	return (
		keyword.length > 0 &&
		keyword.length <= MAX_KEYWORD_CHARS &&
		keyword.split(" ").length <= MAX_KEYWORD_WORDS
	);
}

function splitKeywordText(text: string): string[] {
	const trimmed = stripCodeFence(text.trim());
	if (!trimmed) return [];
	if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
		try {
			return collectKeywordStrings(JSON.parse(trimmed));
		} catch {
			// Not JSON after all: read it as plain text below.
		}
	}
	return trimmed.split(/\r?\n|,|;/).map(cleanKeyword).filter(looksLikeKeyword);
}

/**
 * Clusters the backend returns for rank tracking only: rival app names are
 * never allowed in a listing field, so they must never become chips.
 */
const TRACKING_ONLY_KEYS = new Set(["alternative", "competitors", "trackingOnly"]);

function listingValues(record: Record<string, unknown>): unknown[] {
	return Object.entries(record)
		.filter(([key]) => !TRACKING_ONLY_KEYS.has(key))
		.map(([, value]) => value);
}

function collectKeywordStrings(raw: unknown): string[] {
	if (raw === null || raw === undefined) return [];
	if (typeof raw === "string") return splitKeywordText(raw);
	if (Array.isArray(raw)) return raw.flatMap(collectKeywordStrings);
	if (typeof raw !== "object") return [];

	const record = raw as Record<string, unknown>;
	// The backend answers { keywords, clusters, model }; the typed client
	// promises { result }. Scalars such as `model` must never become chips.
	if (Array.isArray(record.keywords)) {
		return collectKeywordStrings(record.keywords);
	}
	if (record.clusters && typeof record.clusters === "object") {
		return collectKeywordStrings(
			listingValues(record.clusters as Record<string, unknown>),
		);
	}
	if (typeof record.result === "string") {
		return collectKeywordStrings(record.result);
	}
	return listingValues(record)
		.filter((value) => Array.isArray(value))
		.flatMap(collectKeywordStrings);
}

function dedupeKeywords(keywords: string[]): string[] {
	const seen = new Set<string>();
	const unique: string[] = [];
	for (const keyword of keywords) {
		if (seen.has(keyword)) continue;
		seen.add(keyword);
		unique.push(keyword);
	}
	return unique;
}

/**
 * Keyword chips out of whatever the suggest endpoint returned: the backend's
 * keyword array, a JSON array or cluster object, a comma list or one term per
 * line. Lowercased, deduped, capped.
 */
export function parseSuggestedKeywords(raw: unknown): string[] {
	return dedupeKeywords(collectKeywordStrings(raw)).slice(
		0,
		MAX_TARGET_KEYWORDS,
	);
}

/** The generated text, whether it arrived as `result` or as `description`. */
export function extractGeneratedText(raw: unknown): string {
	if (typeof raw === "string") return raw.trim();
	if (raw && typeof raw === "object") {
		const record = raw as Record<string, unknown>;
		const text = record.result ?? record.description;
		if (typeof text === "string") return text.trim();
	}
	return "";
}

function languageParts(language: string): { base: string; region: string } {
	const [base = "", region = ""] = language.toLowerCase().split(/[-_]/);
	return { base, region };
}

/**
 * The description you would actually edit: the market the app was imported
 * from (a Polish import must not open on the English row), the draft before
 * the remote row for that language, else the first row.
 */
export function pickMarketListing(
	listings: Listing[],
	publicCountry?: string | null,
): Listing | null {
	if (listings.length === 0) return null;
	const country = publicCountry?.toLowerCase();
	const forMarket = country
		? listings.find((listing) => {
				const { base, region } = languageParts(listing.language);
				return base === country || region === country;
			})
		: undefined;
	const language = (forMarket ?? listings[0]).language;
	const rows = listings.filter((listing) => listing.language === language);
	return rows.find((listing) => listing.source === "draft") ?? rows[0];
}

/** The iOS keyword field, as a list the suggest endpoint can build on. */
export function splitCurrentKeywords(keywords: string | null | undefined): string[] {
	if (!keywords) return [];
	return dedupeKeywords(
		keywords.split(",").map(cleanKeyword).filter(looksLikeKeyword),
	);
}

/**
 * A missing, invalid or exhausted OpenRouter key comes back as a 4xx whose
 * message names OpenRouter; a switched-off AI flag is a plain 403. Both mean
 * "go to Settings", not "try again".
 */
export function isAiUnavailableError(err: unknown): err is ApiError {
	if (!(err instanceof ApiError)) return false;
	if (err.status < 400 || err.status >= 500) return false;
	return err.status === 403 || /openrouter|api key/i.test(err.message);
}

export function errorMessage(err: unknown, fallback: string): string {
	return err instanceof Error && err.message ? err.message : fallback;
}
