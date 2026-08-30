import type { KeywordClassification, KeywordScore } from "./types";

/** Backend accepts 10 keywords per call; the UI batches up to this many. */
export const MAX_KEYWORDS_PER_SCORING = 20;
export const KEYWORDS_PER_SCORING_CALL = 10;

export const KEYWORD_HISTORY_STORAGE_KEY = "keyword_research_history";
export const KEYWORD_HISTORY_LIMIT = 20;

/** Countries scannable by the Country Opportunity Finder (label by code). */
export const KEYWORD_COUNTRIES: ReadonlyArray<{
	code: string;
	label: string;
}> = [
	{ code: "us", label: "United States" },
	{ code: "gb", label: "United Kingdom" },
	{ code: "ca", label: "Canada" },
	{ code: "au", label: "Australia" },
	{ code: "de", label: "Germany" },
	{ code: "fr", label: "France" },
	{ code: "it", label: "Italy" },
	{ code: "es", label: "Spain" },
	{ code: "nl", label: "Netherlands" },
	{ code: "se", label: "Sweden" },
	{ code: "ch", label: "Switzerland" },
	{ code: "pl", label: "Poland" },
	{ code: "at", label: "Austria" },
	{ code: "be", label: "Belgium" },
	{ code: "dk", label: "Denmark" },
	{ code: "no", label: "Norway" },
	{ code: "fi", label: "Finland" },
	{ code: "ie", label: "Ireland" },
	{ code: "pt", label: "Portugal" },
	{ code: "jp", label: "Japan" },
	{ code: "kr", label: "South Korea" },
	{ code: "cn", label: "China" },
	{ code: "tw", label: "Taiwan" },
	{ code: "sg", label: "Singapore" },
	{ code: "in", label: "India" },
	{ code: "id", label: "Indonesia" },
	{ code: "th", label: "Thailand" },
	{ code: "br", label: "Brazil" },
	{ code: "mx", label: "Mexico" },
	{ code: "tr", label: "Turkey" },
];

export function countryLabel(code: string): string {
	return (
		KEYWORD_COUNTRIES.find((c) => c.code === code)?.label ?? code.toUpperCase()
	);
}

// ============ Classification / difficulty presentation ============

export interface ClassificationMeta {
	label: string;
	description: string;
	className: string;
}

export const CLASSIFICATION_META: Record<
	KeywordClassification,
	ClassificationMeta
> = {
	avoid: {
		className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
		description: "Low opportunity. Effort is better spent elsewhere.",
		label: "Avoid",
	},
	"good-target": {
		className:
			"border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
		description: "Solid search volume with manageable competition.",
		label: "Good Target",
	},
	"hidden-gem": {
		className:
			"border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
		description:
			"Moderate search volume with minimal competition - a genuine opportunity others have overlooked.",
		label: "Hidden Gem",
	},
	"high-competition": {
		className:
			"border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
		description:
			"Dominated by established apps with thousands of ratings. Focus on long-tail variants instead.",
		label: "High Competition",
	},
	"low-volume": {
		className: "border-border bg-muted text-muted-foreground",
		description:
			"Very few searches. Only worth targeting if highly relevant to your app.",
		label: "Low Volume",
	},
	moderate: {
		className: "border-border bg-muted text-foreground",
		description: "Reasonable opportunity. Can work as a supporting keyword.",
		label: "Moderate",
	},
	"sweet-spot": {
		className:
			"border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
		description:
			"High search volume + low competition - the ideal ASO target.",
		label: "Sweet Spot",
	},
	unknown: {
		className: "border-border bg-muted text-muted-foreground",
		description: "Not enough data to classify this keyword.",
		label: "No Data",
	},
};

export const DIFFICULTY_LABEL_META: Record<
	string,
	{ label: string; className: string }
> = {
	easy: { className: "text-green-600 dark:text-green-400", label: "Easy" },
	extreme: { className: "text-red-600 dark:text-red-400", label: "Extreme" },
	hard: {
		className: "text-orange-600 dark:text-orange-400",
		label: "Hard",
	},
	moderate: {
		className: "text-yellow-700 dark:text-yellow-400",
		label: "Moderate",
	},
	"no-data": { className: "text-muted-foreground", label: "No data" },
	"very-easy": {
		className: "text-green-600 dark:text-green-400",
		label: "Very Easy",
	},
	"very-hard": {
		className: "text-red-600 dark:text-red-400",
		label: "Very Hard",
	},
};

export function difficultyMeta(label: string): {
	label: string;
	className: string;
} {
	return (
		DIFFICULTY_LABEL_META[label] ?? {
			className: "text-muted-foreground",
			label,
		}
	);
}

/** Sub-score rows of the difficulty breakdown, in display order. */
export const BREAKDOWN_ROWS: ReadonlyArray<{
	key:
		| "ratingVolume"
		| "reviewVelocity"
		| "dominantPlayers"
		| "ratingQuality"
		| "marketAge"
		| "publisherDiversity"
		| "titleRelevance";
	label: string;
	weight: string;
}> = [
	{ key: "ratingVolume", label: "Review volume (median)", weight: "30%" },
	{ key: "reviewVelocity", label: "Review velocity", weight: "10%" },
	{ key: "dominantPlayers", label: "Dominant players", weight: "20%" },
	{ key: "ratingQuality", label: "Rating quality", weight: "10%" },
	{ key: "marketAge", label: "Market age", weight: "10%" },
	{ key: "publisherDiversity", label: "Publisher diversity", weight: "10%" },
	{ key: "titleRelevance", label: "Title relevance", weight: "10%" },
];

export const OVERRIDE_REASON_LABELS: Record<string, string> = {
	backfill:
		"Score reduced: most results are generic backfill from broader search terms, not real competition for this keyword.",
	smallResultSet:
		"Score capped: very few apps rank for this keyword - there is objectively little competition.",
	weakLeader:
		"Score reduced: the #1 app has very few reviews, so the keyword is easier than the raw competitor stats suggest.",
};

// ============ Formatting ============

export function formatCount(value: number | undefined | null): string {
	if (value === undefined || value === null) return "-";
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
	}
	return String(value);
}

export function formatDownloadRange(low: number, high: number): string {
	const fmt = (v: number) =>
		v >= 100 ? formatCount(Math.round(v)) : v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
	return `${fmt(low)} - ${fmt(high)}`;
}

// ============ CSV export ============

function csvCell(value: string | number | null | undefined): string {
	const text = value === null || value === undefined ? "" : String(value);
	return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Build a CSV of scored keywords, mirroring the visible result columns. */
export function keywordScoresToCsv(scores: KeywordScore[]): string {
	const header = [
		"keyword",
		"country",
		"popularity",
		"difficulty",
		"difficulty_label",
		"opportunity",
		"classification",
		"daily_searches",
		"downloads_at_1_low",
		"downloads_at_1_high",
		"app_rank",
		"error",
	];
	const rows = scores.map((s) => {
		const top1 = s.downloads.positions[0];
		return [
			s.keyword,
			s.country,
			s.popularity ?? "",
			s.difficulty,
			s.difficultyLabel,
			s.opportunity,
			s.classification,
			s.downloads.dailySearches,
			top1?.low ?? "",
			top1?.high ?? "",
			s.appRank ?? "",
			s.error ?? "",
		];
	});
	return [header, ...rows]
		.map((row) => row.map(csvCell).join(","))
		.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

// ============ Search history (localStorage) ============

export interface KeywordHistoryEntry {
	id: string;
	date: string;
	country: string;
	keywords: string[];
	scores: KeywordScore[];
}

/** Parse a raw comma/newline separated keyword input into a clean list. */
export function parseKeywordInput(raw: string): string[] {
	return [
		...new Set(
			raw
				.split(/[,\n]/)
				.map((k) => k.trim().toLowerCase())
				.filter(Boolean),
		),
	].slice(0, MAX_KEYWORDS_PER_SCORING);
}
