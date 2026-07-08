import type {
	ResearchAppMeta,
	ResearchHeuristics,
	ResearchStoreKind,
	ResearchSuggestion,
} from "./types";

export const RESEARCH_COUNTRIES = ["us", "pl", "gb", "de", "fr", "es"] as const;

export const RESEARCH_LIST_STORAGE_KEY = "research_app_list";

export const MAX_KEYWORDS_PER_CHECK = 15;

export const ASO_TITLE_LIMIT = 30;

export const ASO_SUMMARY_LIMIT = 80;

export const RESEARCH_CATEGORY_LABELS: Record<string, string> = {
	"brak-funkcji": "Brakujące funkcje",
	"crash-bugi": "Crashe / Bugi",
	inne: "Inne",
	logowanie: "Logowanie / Konto",
	"obsluga-klienta": "Obsługa klienta",
	platnosci: "Płatności / Subskrypcje",
	pochwaly: "Pochwały (co działa)",
	powiadomienia: "Powiadomienia",
	prywatnosc: "Prywatność / Bezpieczeństwo",
	reklamy: "Reklamy / Monetyzacja",
	"sync-offline": "Synchronizacja / Offline",
	"ux-ui": "UX / UI",
	wydajnosc: "Wydajność",
};

export function researchCategoryLabel(id: string): string {
	return RESEARCH_CATEGORY_LABELS[id] ?? id;
}

export interface ResearchListedApp extends ResearchSuggestion {
	checked: boolean;
}

export function researchAppKey(app: {
	id: string;
	store: ResearchStoreKind;
}): string {
	return `${app.store}:${app.id}`;
}

export const EMPTY_HEURISTICS: ResearchHeuristics = {
	buckets: [],
	byStars: {},
	negative: 0,
	negativeShare: 0,
	total: 0,
};

// ============ Store URL parsing ============

export interface ParsedStoreUrl {
	country: string;
	id: string;
	store: ResearchStoreKind;
}

const APPSTORE_RE =
	/apps\.apple\.com\/(?:([a-z]{2})\/)?[^/]*\/?app\/[^/]*\/?id(\d+)/i;
const APPSTORE_SHORT_RE = /itunes\.apple\.com\/(?:([a-z]{2})\/)?.*id(\d+)/i;
const PLAY_RE = /play\.google\.com\/store\/apps\/details\?[^#]*\bid=([\w.]+)/i;
const PLAY_COUNTRY_RE = /[?&]gl=([a-z]{2})/i;

export function parseStoreUrl(
	raw: string,
	defaultCountry = "us",
): ParsedStoreUrl | null {
	const url = raw.trim();
	if (!url) return null;

	const play = url.match(PLAY_RE);
	if (play) {
		const gl = url.match(PLAY_COUNTRY_RE);
		return {
			country: gl?.[1]?.toLowerCase() ?? defaultCountry,
			id: play[1],
			store: "playstore",
		};
	}

	const apple = url.match(APPSTORE_RE) ?? url.match(APPSTORE_SHORT_RE);
	if (apple) {
		return {
			country: apple[1]?.toLowerCase() ?? defaultCountry,
			id: apple[2],
			store: "appstore",
		};
	}

	return null;
}

export interface ParsedStoreLink extends ParsedStoreUrl {
	url: string;
}

export function parseStoreLinks(
	input: string,
	defaultCountry = "us",
): ParsedStoreLink[] {
	const seen = new Set<string>();
	const links: ParsedStoreLink[] = [];
	for (const chunk of input.split(/\s+/)) {
		if (!chunk) continue;
		const parsed = parseStoreUrl(chunk, defaultCountry);
		if (!parsed) continue;
		const key = `${parsed.store}:${parsed.id}`;
		if (seen.has(key)) continue;
		seen.add(key);
		links.push({ ...parsed, url: chunk });
	}
	return links;
}

// ============ ASO metadata audit ============

export interface MetadataAudit {
	descriptionLength: number;
	summaryLength: number | null;
	summaryTooLong: boolean;
	titleLength: number;
	titleTooLong: boolean;
}

export function auditMetadata(
	meta: Pick<ResearchAppMeta, "description" | "summary" | "title">,
): MetadataAudit {
	const summaryLength = meta.summary != null ? meta.summary.length : null;
	return {
		descriptionLength: (meta.description ?? "").length,
		summaryLength,
		summaryTooLong: summaryLength !== null && summaryLength > ASO_SUMMARY_LIMIT,
		titleLength: meta.title.length,
		titleTooLong: meta.title.length > ASO_TITLE_LIMIT,
	};
}

export type KeywordPlacement = "description" | "missing" | "summary" | "title";

export interface KeywordCoverageEntry {
	keyword: string;
	placement: KeywordPlacement;
}

export function keywordCoverage(
	meta: Pick<ResearchAppMeta, "description" | "summary" | "title">,
	keywords: string[],
): KeywordCoverageEntry[] {
	const title = meta.title.toLowerCase();
	const summary = (meta.summary ?? "").toLowerCase();
	const description = (meta.description ?? "").toLowerCase();
	return keywords.map((keyword) => {
		const kw = keyword.toLowerCase();
		const placement: KeywordPlacement = title.includes(kw)
			? "title"
			: summary.includes(kw)
				? "summary"
				: description.includes(kw)
					? "description"
					: "missing";
		return { keyword, placement };
	});
}

// ============ Keyword positions ============

export type PositionTone = "default" | "medium" | "muted" | "strong";

export interface FormattedPosition {
	label: string;
	tone: PositionTone;
}

export function formatKeywordPosition(
	position: number | null | undefined,
): FormattedPosition {
	if (position === undefined) return { label: "Not checked", tone: "muted" };
	if (position === null) return { label: "Not in top 50", tone: "muted" };
	if (position <= 10) return { label: `#${position}`, tone: "strong" };
	if (position <= 25) return { label: `#${position}`, tone: "medium" };
	return { label: `#${position}`, tone: "default" };
}

export function parseCustomKeywords(input: string): string[] {
	const seen = new Set<string>();
	const keywords: string[] = [];
	for (const chunk of input.split(/[,\n]/)) {
		const keyword = chunk.trim();
		if (!keyword) continue;
		const key = keyword.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		keywords.push(keyword);
	}
	return keywords.slice(0, MAX_KEYWORDS_PER_CHECK);
}
