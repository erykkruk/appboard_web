/**
 * The free check-up itself: one storefront or every storefront we know, run
 * in the visitor's browser. Apple is asked directly (see itunes.ts), Google
 * Play through our public proxy (play.ts); the scoring engine is shared with
 * the panel. The component only reacts to events - this file owns the order
 * of calls, the pacing and what counts as "not listed".
 */
import {
	calcOpportunity,
	calculateDifficulty,
	classifyKeyword,
	estimateDownloads,
	estimatePopularity,
} from "@/lib/aso-engine/keyword-scoring";
import type {
	KeywordCompetitor,
	KeywordScore,
} from "@/lib/aso-engine/scoring-types";
import { KEYWORD_COUNTRIES } from "@/lib/keyword-research";
import {
	buildAudit,
	buildNextSteps,
	extractKeywordCandidates,
	MAX_CANDIDATES,
} from "./audit";
import { type CheckedApp, lookupApp, searchWithRank } from "./itunes";
import { lookupPlayApp, playKeywordData } from "./play";
import type { CheckMode, MarketReport, StoreKind } from "./share";

/** Value of the market picker that means "every storefront we know". */
export const ALL_MARKETS = "all";
/**
 * Keywords scored per storefront in an all-markets run. Thirty storefronts
 * times this many store searches is the whole budget of one check-up; the
 * single-market run keeps the engine's full MAX_CANDIDATES.
 */
export const ALL_MARKETS_CANDIDATES = 8;
/** Google Play calls are paid by our proxy, not the visitor's browser. */
export const ALL_MARKETS_CANDIDATES_PLAY = 5;
const CALL_DELAY_MS = 300;

export interface CheckTarget {
	/** Storefront the link or the picker named; first in an all-markets run. */
	country: string;
	id: string;
	mode: CheckMode;
	store: StoreKind;
}

export interface CheckProgress {
	country: string;
	label: string;
	marketCount: number;
	/** Zero-based index of the storefront being worked on. */
	marketIndex: number;
	percent: number;
}

export interface CheckEvents {
	/** Polled before every store call; true ends the run with what is done. */
	isCancelled?: () => boolean;
	/** The listing was found in a storefront (fires per storefront). */
	onApp?: (app: CheckedApp) => void;
	onMarket?: (report: MarketReport) => void;
	onMissing?: (country: string) => void;
	onProgress?: (progress: CheckProgress) => void;
	/** Live keyword rows of the storefront being scored. */
	onScores?: (country: string, app: CheckedApp, scores: KeywordScore[]) => void;
}

export interface CheckDeps {
	keywordData: (
		store: StoreKind,
		keyword: string,
		country: string,
		trackId: string,
	) => Promise<{ competitors: KeywordCompetitor[]; rank: number | null }>;
	lookup: (
		store: StoreKind,
		id: string,
		country: string,
	) => Promise<CheckedApp | null>;
	sleep: (ms: number) => Promise<void>;
}

export interface CheckOutcome {
	markets: MarketReport[];
	/** Storefronts that do not list the app or gave nothing to score. */
	missing: string[];
	/** True when the visitor stopped before the last storefront. */
	partial: boolean;
}

const defaultDeps: CheckDeps = {
	keywordData: (store, keyword, country, trackId) =>
		store === "playstore"
			? playKeywordData(keyword, country, trackId)
			: searchWithRank(keyword, country, trackId),
	lookup: (store, id, country) =>
		store === "playstore" ? lookupPlayApp(id, country) : lookupApp(id, country),
	sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Storefronts of a run: the named one first, then the rest of the list. */
export function marketsFor(mode: CheckMode, country: string): string[] {
	const first = country.toLowerCase();
	if (mode === "single") return [first];
	return [
		first,
		...KEYWORD_COUNTRIES.map((c) => c.code).filter((code) => code !== first),
	];
}

export function candidateLimit(mode: CheckMode, store: StoreKind): number {
	if (mode === "single") return MAX_CANDIDATES;
	return store === "playstore"
		? ALL_MARKETS_CANDIDATES_PLAY
		: ALL_MARKETS_CANDIDATES;
}

/** One keyword through the shared engine - identical maths to the panel. */
export function scoreKeyword(
	keyword: string,
	country: string,
	competitors: KeywordCompetitor[],
	rank: number | null,
): KeywordScore {
	const popularity = estimatePopularity(competitors, keyword);
	const difficulty = calculateDifficulty(competitors, keyword);
	return {
		appRank: rank,
		breakdown: difficulty.breakdown,
		classification: classifyKeyword(popularity, difficulty.score),
		competitors: competitors.slice(0, 10),
		country,
		difficulty: difficulty.score,
		difficultyLabel: difficulty.label,
		downloads: estimateDownloads(popularity, country),
		keyword,
		opportunity: calcOpportunity(popularity, difficulty.score),
		popularity,
		tiers: difficulty.tiers,
	};
}

function finishMarket(app: CheckedApp, scores: KeywordScore[]): MarketReport {
	const audit = buildAudit(app, scores);
	const nextSteps = buildNextSteps(app, scores, audit);
	const sorted = [...scores].sort((a, b) => b.opportunity - a.opportunity);
	return { app, audit, country: app.country, nextSteps, scores: sorted };
}

export async function runCheck(
	target: CheckTarget,
	events: CheckEvents = {},
	deps: CheckDeps = defaultDeps,
): Promise<CheckOutcome> {
	const countries = marketsFor(target.mode, target.country);
	const limit = candidateLimit(target.mode, target.store);
	const single = target.mode === "single";
	const cancelled = () => events.isCancelled?.() === true;
	const markets: MarketReport[] = [];
	const missing: string[] = [];
	let calls = 0;
	// Every store call after the first waits, whatever it is for.
	const pace = async () => {
		if (calls++ > 0) await deps.sleep(CALL_DELAY_MS);
	};
	const progress = (
		marketIndex: number,
		country: string,
		fraction: number,
		label: string,
	) =>
		events.onProgress?.({
			country,
			label,
			marketCount: countries.length,
			marketIndex,
			percent: Math.min(100, ((marketIndex + fraction) / countries.length) * 100),
		});

	for (const [marketIndex, country] of countries.entries()) {
		if (cancelled()) {
			return { markets, missing, partial: true };
		}
		progress(marketIndex, country, 0, "Reading your listing");
		await pace();
		const app = await deps.lookup(target.store, target.id, country);
		if (!app) {
			if (single) {
				throw new Error(
					"We couldn't find this app in that storefront. Check the link and the selected market.",
				);
			}
			missing.push(country);
			events.onMissing?.(country);
			continue;
		}
		events.onApp?.(app);
		progress(marketIndex, country, 0.05, "Reading your listing");

		const candidates = extractKeywordCandidates(app).slice(0, limit);
		if (!candidates.length) {
			if (single) {
				throw new Error(
					"This listing has too little text to extract keywords from.",
				);
			}
			missing.push(country);
			events.onMissing?.(country);
			continue;
		}

		const collected: KeywordScore[] = [];
		let stopped = false;
		for (const [i, keyword] of candidates.entries()) {
			if (cancelled()) {
				stopped = true;
				break;
			}
			progress(marketIndex, country, (i + 0.5) / candidates.length, `Scoring "${keyword}"`);
			await pace();
			try {
				const { competitors, rank } = await deps.keywordData(
					target.store,
					keyword,
					country,
					app.trackId,
				);
				collected.push(scoreKeyword(keyword, country, competitors, rank));
				events.onScores?.(country, app, [...collected]);
			} catch {
				// A keyword the store refused is skipped; the market survives.
			}
			progress(marketIndex, country, (i + 1) / candidates.length, `Scoring "${keyword}"`);
		}

		if (!collected.length) {
			if (stopped) return { markets, missing, partial: true };
			if (single) {
				throw new Error(
					"The store wouldn't answer our searches. Try again in a minute.",
				);
			}
			missing.push(country);
			events.onMissing?.(country);
			continue;
		}
		progress(marketIndex, country, 0.98, "Building your report");
		const report = finishMarket(app, collected);
		markets.push(report);
		events.onMarket?.(report);
		if (stopped) return { markets, missing, partial: true };
	}

	if (!markets.length) {
		throw new Error(
			`We couldn't find this app in any of the ${countries.length} storefronts we check. Check the link.`,
		);
	}
	return { markets, missing, partial: false };
}
