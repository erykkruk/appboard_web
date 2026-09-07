/**
 * Shareable free check-up reports.
 *
 * A finished report (one market or all of them) is posted to the backend as
 * ONE JSON snapshot and gets a link, /aso-check/r/<id>. The backend keeps
 * that snapshot as-is: it comes from an anonymous browser, so everything
 * read back goes through sanitizeSharedReport before it touches the DOM -
 * strings are capped, numbers must be finite, image and link URLs must point
 * at the stores' own hosts, and every call-to-action is rewritten to our
 * sign-up page. Never render a share without it.
 */
import type {
	AuditIssue,
	AuditResult,
} from "@/lib/aso-engine/listing-audit";
import type {
	DownloadEstimates,
	KeywordClassification,
	KeywordCompetitor,
	KeywordDifficultyBreakdown,
	KeywordRankingTier,
	KeywordRankingTiers,
	KeywordScore,
} from "@/lib/aso-engine/scoring-types";
import type { NextStep } from "./audit";
import type { CheckedApp } from "./itunes";

export const SHARE_VERSION = 1;
export const SHARE_SIGNUP_URL = "/register?from=aso-check";
const SHARE_API = "/api/public/aso-reports/share";

export type StoreKind = "appstore" | "playstore";
export type CheckMode = "all" | "single";

/** One storefront's complete result. */
export interface MarketReport {
	app: CheckedApp;
	audit: AuditResult;
	country: string;
	nextSteps: NextStep[];
	scores: KeywordScore[];
}

export interface SharedAsoReport {
	markets: MarketReport[];
	/** Storefronts that were asked and do not list the app (or gave no data). */
	missing: string[];
	mode: CheckMode;
	/** True when the visitor stopped before every storefront was checked. */
	partial: boolean;
	store: StoreKind;
	version: typeof SHARE_VERSION;
}

export interface ShareRecord {
	createdAt: string;
	id: string;
	report: SharedAsoReport;
}

export type FetchShareResult =
	| { status: "ok"; record: ShareRecord }
	| { status: "not-found" }
	| { status: "error" };

export function sharePath(id: string): string {
	return `/aso-check/r/${encodeURIComponent(id)}`;
}

/** Post the finished report; null when the backend would not keep it. */
export async function createShare(
	report: SharedAsoReport,
): Promise<string | null> {
	const first = report.markets[0];
	if (!first) return null;
	try {
		const res = await fetch(SHARE_API, {
			body: JSON.stringify({
				appName: first.app.name.slice(0, 255),
				country: report.mode === "all" ? "all" : first.country,
				payload: report,
				store: report.store,
				tool: "aso-check",
				trackId: first.app.trackId.slice(0, 255),
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		});
		if (!res.ok) return null;
		const body = (await res.json()) as { id?: unknown };
		return typeof body.id === "string" ? body.id : null;
	} catch {
		return null;
	}
}

export async function fetchShare(id: string): Promise<FetchShareResult> {
	try {
		const res = await fetch(`${SHARE_API}/${encodeURIComponent(id)}`);
		if (res.status === 404 || res.status === 422) return { status: "not-found" };
		if (!res.ok) return { status: "error" };
		const body = (await res.json()) as {
			createdAt?: unknown;
			id?: unknown;
			payload?: unknown;
		};
		const report = sanitizeSharedReport(body.payload);
		if (!report || typeof body.id !== "string") return { status: "not-found" };
		return {
			record: {
				createdAt:
					typeof body.createdAt === "string"
						? body.createdAt
						: new Date().toISOString(),
				id: body.id,
				report,
			},
			status: "ok",
		};
	} catch {
		return { status: "error" };
	}
}

// ---------------------------------------------------------------- sanitizer

const MAX_TEXT = 4_000;
const MAX_DESCRIPTION = 10_000;
const MAX_NAME = 255;
const MAX_URL = 2_048;
const MAX_MARKETS = 40;
const MAX_SCORES = 40;
const MAX_LIST = 60;
const MAX_SCREENSHOTS = 10;
const MAX_COMPETITORS = 25;

const CLASSIFICATIONS: ReadonlySet<string> = new Set<KeywordClassification>([
	"sweet-spot",
	"good-target",
	"hidden-gem",
	"moderate",
	"high-competition",
	"low-volume",
	"avoid",
	"unknown",
]);
const SEVERITIES = new Set<AuditIssue["severity"]>(["high", "medium", "low"]);
const OVERRIDE_REASONS = new Set(["smallResultSet", "weakLeader", "backfill"]);
const COUNTRY_RE = /^[a-zA-Z]{2}$/;

function isImageHost(host: string): boolean {
	return (
		host.endsWith(".mzstatic.com") || host.endsWith(".googleusercontent.com")
	);
}

function isStoreHost(host: string): boolean {
	return (
		host === "apps.apple.com" ||
		host === "itunes.apple.com" ||
		host === "play.google.com"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, max = MAX_TEXT): string | undefined {
	return typeof value === "string" ? value.slice(0, max) : undefined;
}

function num(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function numOr(value: unknown, fallback: number): number {
	return num(value) ?? fallback;
}

function strList(value: unknown, max = MAX_LIST, each = MAX_NAME): string[] {
	if (!Array.isArray(value)) return [];
	const out: string[] = [];
	for (const item of value) {
		const s = str(item, each);
		if (s) out.push(s);
		if (out.length >= max) break;
	}
	return out;
}

/** https only, on one of the hosts the predicate accepts. */
export function safeUrl(
	value: unknown,
	allowed: (host: string) => boolean,
): string | undefined {
	const s = str(value, MAX_URL);
	if (!s) return undefined;
	try {
		const url = new URL(s);
		if (url.protocol !== "https:" || !allowed(url.hostname)) return undefined;
		return url.toString();
	} catch {
		return undefined;
	}
}

function urlList(
	value: unknown,
	max: number,
	allowed: (host: string) => boolean,
): string[] {
	if (!Array.isArray(value)) return [];
	const out: string[] = [];
	for (const item of value) {
		const u = safeUrl(item, allowed);
		if (u) out.push(u);
		if (out.length >= max) break;
	}
	return out;
}

function country(value: unknown): string | undefined {
	if (typeof value !== "string" || !COUNTRY_RE.test(value)) return undefined;
	return value.toLowerCase();
}

function sanitizeApp(raw: unknown, marketCountry: string): CheckedApp | null {
	if (!isRecord(raw)) return null;
	const name = str(raw.name, MAX_NAME);
	const trackId = str(raw.trackId, MAX_NAME);
	if (!name || !trackId) return null;
	return {
		country: marketCountry,
		description: str(raw.description, MAX_DESCRIPTION) ?? "",
		developer: str(raw.developer, MAX_NAME) ?? "",
		genre: str(raw.genre, 100) ?? "",
		genres: strList(raw.genres, 20, 100),
		icon: safeUrl(raw.icon, isImageHost),
		name,
		price: str(raw.price, 40),
		rating: num(raw.rating),
		ratingsCount: num(raw.ratingsCount),
		released: str(raw.released, 40),
		screenshots: numOr(raw.screenshots, 0),
		screenshotUrls: urlList(raw.screenshotUrls, MAX_SCREENSHOTS, isImageHost),
		trackId,
		updated: str(raw.updated, 40),
		url: safeUrl(raw.url, isStoreHost),
	};
}

function sanitizeIssue(raw: unknown): AuditIssue | null {
	if (!isRecord(raw)) return null;
	const id = str(raw.id, 64);
	const title = str(raw.title, MAX_NAME);
	if (!id || !title) return null;
	const severity = str(raw.severity, 10) as AuditIssue["severity"] | undefined;
	return {
		actionable: raw.actionable === true,
		appboard: str(raw.appboard, MAX_TEXT),
		detail: str(raw.detail, MAX_TEXT) ?? "",
		id,
		scorePenalty: numOr(raw.scorePenalty, 0),
		severity: severity && SEVERITIES.has(severity) ? severity : "low",
		title,
	};
}

function sanitizeAudit(raw: unknown): AuditResult | null {
	if (!isRecord(raw)) return null;
	const score = num(raw.asoScore);
	if (score === undefined) return null;
	const issues: AuditIssue[] = [];
	if (Array.isArray(raw.issues)) {
		for (const item of raw.issues.slice(0, MAX_LIST)) {
			const issue = sanitizeIssue(item);
			if (issue) issues.push(issue);
		}
	}
	return {
		asoScore: Math.max(0, Math.min(100, Math.round(score))),
		issues,
		strengths: strList(raw.strengths, MAX_LIST, MAX_TEXT),
		themes: strList(raw.themes, MAX_LIST),
	};
}

function sanitizeStep(raw: unknown): NextStep | null {
	if (!isRecord(raw)) return null;
	const title = str(raw.title, MAX_NAME);
	if (!title) return null;
	const cta = isRecord(raw.cta) ? raw.cta : {};
	return {
		// Whatever the snapshot says, a step's button leads to our sign-up.
		cta: {
			href: SHARE_SIGNUP_URL,
			label: str(cta.label, 80) ?? "Do it in AppBoard",
		},
		detail: str(raw.detail, MAX_TEXT) ?? "",
		suggestion: str(raw.suggestion, MAX_NAME),
		title,
	};
}

function sanitizeCompetitor(raw: unknown): KeywordCompetitor | null {
	if (!isRecord(raw)) return null;
	const trackId = str(raw.trackId, MAX_NAME);
	const title = str(raw.title, MAX_NAME);
	if (!trackId || !title) return null;
	return {
		developer: str(raw.developer, MAX_NAME) ?? "",
		genre: str(raw.genre, 100),
		icon: safeUrl(raw.icon, isImageHost),
		price: str(raw.price, 40),
		rating: num(raw.rating),
		ratingsCount: num(raw.ratingsCount),
		released: str(raw.released, 40),
		title,
		trackId,
		url: safeUrl(raw.url, isStoreHost),
	};
}

function sanitizeBreakdown(raw: unknown): KeywordDifficultyBreakdown {
	const r = isRecord(raw) ? raw : {};
	const reason = str(r.overrideReason, 20);
	return {
		avgReviews: numOr(r.avgReviews, 0),
		brandName: str(r.brandName, MAX_NAME) ?? null,
		dominantPlayers: numOr(r.dominantPlayers, 0),
		isBrandKeyword: r.isBrandKeyword === true,
		marketAge: numOr(r.marketAge, 0),
		medianReviews: numOr(r.medianReviews, 0),
		overrideReason:
			reason && OVERRIDE_REASONS.has(reason)
				? (reason as KeywordDifficultyBreakdown["overrideReason"])
				: null,
		publisherDiversity: numOr(r.publisherDiversity, 0),
		ratingQuality: numOr(r.ratingQuality, 0),
		ratingVolume: numOr(r.ratingVolume, 0),
		rawTotal: numOr(r.rawTotal, 0),
		reviewVelocity: numOr(r.reviewVelocity, 0),
		titleMatchCount: numOr(r.titleMatchCount, 0),
		titleRelevance: numOr(r.titleRelevance, 0),
	};
}

function sanitizeTier(raw: unknown): KeywordRankingTier {
	const r = isRecord(raw) ? raw : {};
	return {
		freshCount: numOr(r.freshCount, 0),
		label: str(r.label, 40) ?? "",
		medianReviews: numOr(r.medianReviews, 0),
		minReviews: numOr(r.minReviews, 0),
		tierScore: numOr(r.tierScore, 0),
		titleKeywordCount: numOr(r.titleKeywordCount, 0),
		totalApps: numOr(r.totalApps, 0),
		weakCount: numOr(r.weakCount, 0),
		weakestApp: str(r.weakestApp, MAX_NAME) ?? null,
	};
}

function sanitizeTiers(raw: unknown): KeywordRankingTiers {
	const r = isRecord(raw) ? raw : {};
	return {
		top5: sanitizeTier(r.top5),
		top10: sanitizeTier(r.top10),
		top20: sanitizeTier(r.top20),
	};
}

function sanitizeRange(raw: unknown): { low: number; high: number } {
	const r = isRecord(raw) ? raw : {};
	return { high: numOr(r.high, 0), low: numOr(r.low, 0) };
}

function sanitizeDownloads(raw: unknown): DownloadEstimates {
	const r = isRecord(raw) ? raw : {};
	const tiers = isRecord(r.tiers) ? r.tiers : {};
	const positions: DownloadEstimates["positions"] = [];
	if (Array.isArray(r.positions)) {
		for (const item of r.positions.slice(0, MAX_LIST)) {
			if (!isRecord(item)) continue;
			positions.push({
				high: numOr(item.high, 0),
				low: numOr(item.low, 0),
				position: numOr(item.position, 0),
				ttr: numOr(item.ttr, 0),
			});
		}
	}
	return {
		dailySearches: numOr(r.dailySearches, 0),
		positions,
		tiers: {
			top5: sanitizeRange(tiers.top5),
			top6to10: sanitizeRange(tiers.top6to10),
			top11to20: sanitizeRange(tiers.top11to20),
		},
	};
}

function sanitizeScore(raw: unknown, marketCountry: string): KeywordScore | null {
	if (!isRecord(raw)) return null;
	const keyword = str(raw.keyword, MAX_NAME);
	const difficulty = num(raw.difficulty);
	const opportunity = num(raw.opportunity);
	if (!keyword || difficulty === undefined || opportunity === undefined) {
		return null;
	}
	const classification = str(raw.classification, 32);
	const competitors: KeywordCompetitor[] = [];
	if (Array.isArray(raw.competitors)) {
		for (const item of raw.competitors.slice(0, MAX_COMPETITORS)) {
			const c = sanitizeCompetitor(item);
			if (c) competitors.push(c);
		}
	}
	return {
		appRank: num(raw.appRank) ?? null,
		breakdown: sanitizeBreakdown(raw.breakdown),
		classification:
			classification && CLASSIFICATIONS.has(classification)
				? (classification as KeywordClassification)
				: "unknown",
		competitors,
		country: marketCountry,
		difficulty,
		difficultyLabel: str(raw.difficultyLabel, 40) ?? "",
		downloads: sanitizeDownloads(raw.downloads),
		keyword,
		opportunity,
		popularity: num(raw.popularity) ?? null,
		tiers: sanitizeTiers(raw.tiers),
	};
}

function sanitizeMarket(raw: unknown): MarketReport | null {
	if (!isRecord(raw)) return null;
	const cc = country(raw.country);
	if (!cc) return null;
	const app = sanitizeApp(raw.app, cc);
	const audit = sanitizeAudit(raw.audit);
	if (!app || !audit) return null;
	const nextSteps: NextStep[] = [];
	if (Array.isArray(raw.nextSteps)) {
		for (const item of raw.nextSteps.slice(0, 5)) {
			const step = sanitizeStep(item);
			if (step) nextSteps.push(step);
		}
	}
	const scores: KeywordScore[] = [];
	if (Array.isArray(raw.scores)) {
		for (const item of raw.scores.slice(0, MAX_SCORES)) {
			const score = sanitizeScore(item, cc);
			if (score) scores.push(score);
		}
	}
	return { app, audit, country: cc, nextSteps, scores };
}

/**
 * Turn an untrusted snapshot into a report the page can render, or null when
 * it is not one of ours (wrong version, no usable market).
 */
export function sanitizeSharedReport(raw: unknown): SharedAsoReport | null {
	if (!isRecord(raw) || raw.version !== SHARE_VERSION) return null;
	if (!Array.isArray(raw.markets)) return null;
	const markets: MarketReport[] = [];
	for (const item of raw.markets.slice(0, MAX_MARKETS)) {
		const market = sanitizeMarket(item);
		if (market) markets.push(market);
	}
	if (!markets.length) return null;
	const missing: string[] = [];
	if (Array.isArray(raw.missing)) {
		for (const item of raw.missing.slice(0, MAX_LIST)) {
			const cc = country(item);
			if (cc) missing.push(cc);
		}
	}
	return {
		markets,
		missing,
		mode: raw.mode === "single" ? "single" : "all",
		partial: raw.partial === true,
		store: raw.store === "playstore" ? "playstore" : "appstore",
		version: SHARE_VERSION,
	};
}
