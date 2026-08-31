/**
 * Heuristic (no-AI) parts of the free ASO check-up: keyword candidate
 * extraction from the listing text, the listing audit and the ASO score.
 * Pure functions - everything runs in the visitor's browser.
 */
import type { KeywordScore } from "@/lib/aso-engine/scoring-types";
import type { CheckedApp } from "./itunes";

export const MAX_CANDIDATES = 8;

const STOPWORDS = new Set(
	(
		"a an the and or of for to in on with your you our my is are be it this that " +
		"app apps free best new get more all now most every from by at as can will " +
		"i o w z na do dla i lub oraz twoja twoje jest sa aplikacja der die das und " +
		"oder fur mit dein deine ist app fuer les des une un et ou pour avec votre"
	).split(/\s+/),
);

function tokenize(text: string): string[] {
	return (
		text
			.toLowerCase()
			.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) ?? []
	).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Candidate keywords from the listing itself: cleaned title phrases first
 * (strongest signal of what the developer targets), then the most frequent
 * meaningful bigrams and unigrams from the description, then the genre.
 */
export function extractKeywordCandidates(app: CheckedApp): string[] {
	const candidates: string[] = [];
	const seen = new Set<string>();
	const push = (phrase: string) => {
		const norm = phrase.trim().toLowerCase();
		if (norm.length < 3 || seen.has(norm)) return;
		seen.add(norm);
		candidates.push(norm);
	};

	// Title after the brand name: "Habitly - Habit Tracker & Streaks" ->
	// "habit tracker", "streaks".
	const titleParts = app.name.split(/[:–—|-]+/).slice(1);
	for (const part of titleParts) {
		for (const chunk of part.split(/[,&+/]+/)) {
			const words = tokenize(chunk);
			if (words.length >= 1 && words.length <= 3) push(words.join(" "));
		}
	}

	// Description: frequency-ranked bigrams, then unigrams.
	const words = tokenize(app.description).slice(0, 600);
	const bigrams = new Map<string, number>();
	const unigrams = new Map<string, number>();
	for (let i = 0; i < words.length; i++) {
		unigrams.set(words[i], (unigrams.get(words[i]) ?? 0) + 1);
		if (i + 1 < words.length) {
			const bg = `${words[i]} ${words[i + 1]}`;
			bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
		}
	}
	const topBigrams = [...bigrams.entries()]
		.filter(([, count]) => count >= 2)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6);
	for (const [phrase] of topBigrams) push(phrase);
	const topUnigrams = [...unigrams.entries()]
		.filter(([, count]) => count >= 3)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4);
	for (const [word] of topUnigrams) push(word);

	// Genre as a fallback seed ("Health & Fitness" -> "health fitness").
	if (app.genre) push(tokenize(app.genre).join(" "));

	return candidates.slice(0, MAX_CANDIDATES);
}

export interface AuditIssue {
	id: string;
	severity: "high" | "medium" | "low";
	title: string;
	detail: string;
	scorePenalty: number;
}

export interface AuditResult {
	asoScore: number;
	issues: AuditIssue[];
	strengths: string[];
	themes: string[];
}

const BASE_SCORE = 100;
const TITLE_LIMIT_HINT = 30;
const GOOD_SCREENSHOT_COUNT = 6;
const OLD_UPDATE_DAYS = 180;

/** Rules-based listing audit; the ASO score is BASE minus penalties. */
export function buildAudit(
	app: CheckedApp,
	scores: KeywordScore[],
): AuditResult {
	const issues: AuditIssue[] = [];
	const strengths: string[] = [];
	const titleLower = app.name.toLowerCase();

	const scored = scores.filter((s) => !s.error);
	const bestTargets = scored
		.filter((s) =>
			["sweet-spot", "good-target", "hidden-gem"].includes(s.classification),
		)
		.sort((a, b) => b.opportunity - a.opportunity);

	// Title keyword usage - the strongest ranking field.
	const titleUsesKeyword = scored.some((s) =>
		titleLower.includes(s.keyword.toLowerCase()),
	);
	if (!titleUsesKeyword && bestTargets.length) {
		issues.push({
			detail: `Your title is the strongest ranking field, and it does not contain any of your target keywords. Best candidate: "${bestTargets[0].keyword}" (keep it under ${TITLE_LIMIT_HINT} characters).`,
			id: "title-keywords",
			scorePenalty: 18,
			severity: "high",
			title: "Title doesn't use your keywords",
		});
	} else if (titleUsesKeyword) {
		strengths.push("Title targets a real keyword");
	}

	// Screenshot count.
	if (app.screenshots > 0 && app.screenshots < GOOD_SCREENSHOT_COUNT) {
		issues.push({
			detail: `You have ${app.screenshots} screenshot${app.screenshots === 1 ? "" : "s"}; top apps in your category typically show ${GOOD_SCREENSHOT_COUNT}-10. More screens = more search-page real estate.`,
			id: "screenshots",
			scorePenalty: 10,
			severity: "medium",
			title: `Only ${app.screenshots} screenshots`,
		});
	} else if (app.screenshots >= GOOD_SCREENSHOT_COUNT) {
		strengths.push(`${app.screenshots} screenshots - good coverage`);
	}

	// Description quality.
	if (app.description.length < 400) {
		issues.push({
			detail: `Your description is ${app.description.length} characters. Short descriptions give the store (and users) little to index - aim for 1,500+ with your keywords woven in naturally.`,
			id: "description-short",
			scorePenalty: 12,
			severity: "medium",
			title: "Description is very short",
		});
	}
	const firstLine = app.description.split("\n")[0] ?? "";
	if (
		firstLine &&
		firstLine.toLowerCase().includes(app.name.split(/[:\s]/)[0].toLowerCase())
	) {
		issues.push({
			detail: "The first line of your description shows in previews. Lead with the user's benefit, not your app's name - they can already see the name.",
			id: "description-opening",
			scorePenalty: 5,
			severity: "low",
			title: "Description opens with your name, not a benefit",
		});
	}

	// Ratings.
	if ((app.ratingsCount ?? 0) < 50) {
		issues.push({
			detail: `${app.ratingsCount ?? 0} ratings is below the credibility threshold. Add a well-timed in-app review prompt (after a success moment, never at launch).`,
			id: "few-ratings",
			scorePenalty: 10,
			severity: "medium",
			title: "Very few ratings",
		});
	} else if ((app.rating ?? 0) >= 4.5) {
		strengths.push(`${app.rating?.toFixed(1)}★ from ${app.ratingsCount} ratings`);
	} else if ((app.rating ?? 0) > 0 && (app.rating ?? 0) < 4.0) {
		issues.push({
			detail: `A ${app.rating?.toFixed(1)}★ average suppresses both ranking and conversion. Read the recent negative reviews and fix the #1 complaint first.`,
			id: "low-rating",
			scorePenalty: 12,
			severity: "high",
			title: "Rating below 4.0",
		});
	}

	// Freshness.
	if (app.updated) {
		const days = (Date.now() - new Date(app.updated).getTime()) / 86_400_000;
		if (days > OLD_UPDATE_DAYS) {
			issues.push({
				detail: `Last update was ${Math.round(days)} days ago. Stores favor actively maintained apps; even a small release helps.`,
				id: "stale-update",
				scorePenalty: 8,
				severity: "medium",
				title: "No update in 6+ months",
			});
		} else {
			strengths.push("Recently updated");
		}
	}

	// Ranking presence.
	const ranked = scored.filter((s) => s.appRank);
	if (ranked.length) {
		strengths.push(
			`Ranks for ${ranked.length} of ${scored.length} checked keywords`,
		);
	} else if (scored.length) {
		issues.push({
			detail: "You are not in the top 200 for any of the keywords your own listing suggests. The 'Do next' steps below are the fastest way to change that.",
			id: "no-ranks",
			scorePenalty: 10,
			severity: "high",
			title: "Not ranking for your own keywords",
		});
	}

	const penalty = issues.reduce((sum, issue) => sum + issue.scorePenalty, 0);
	const asoScore = Math.max(5, Math.min(100, BASE_SCORE - penalty));

	// Listing themes (what the listing talks about) - honest, no-AI version
	// of "what your app is about".
	const themes = extractKeywordCandidates(app).slice(0, 4);

	return { asoScore, issues, strengths, themes };
}

export interface NextStep {
	title: string;
	detail: string;
	suggestion?: string;
	cta: { label: string; href: string };
}

const SIGNUP_URL = "/register?from=aso-check";

/** Three concrete next steps, biggest expected impact first. */
export function buildNextSteps(
	app: CheckedApp,
	scores: KeywordScore[],
	audit: AuditResult,
): NextStep[] {
	const steps: NextStep[] = [];
	const scored = scores.filter((s) => !s.error);
	const best = scored
		.filter((s) =>
			["sweet-spot", "good-target", "hidden-gem"].includes(s.classification),
		)
		.sort((a, b) => b.opportunity - a.opportunity);

	if (audit.issues.some((i) => i.id === "title-keywords") && best[0]) {
		const brand = app.name.split(/[:–—|-]/)[0].trim();
		steps.push({
			cta: { href: SIGNUP_URL, label: "Edit listing in AppBoard" },
			detail:
				"The title is the strongest ranking field. Put your best keyword right after your brand name.",
			suggestion: `${brand}: ${best[0].keyword
				.split(" ")
				.map((w) => w[0]?.toUpperCase() + w.slice(1))
				.join(" ")}`,
			title: "Put your best keyword in the title",
		});
	}

	const nearMiss = scored
		.filter((s) => s.appRank && s.appRank > 10 && s.appRank <= 50)
		.sort((a, b) => (a.appRank ?? 99) - (b.appRank ?? 99))[0];
	if (nearMiss) {
		steps.push({
			cta: { href: SIGNUP_URL, label: "Track this keyword daily" },
			detail: `You already rank #${nearMiss.appRank} for "${nearMiss.keyword}". Strengthening it in your subtitle and description can push you onto the first screen.`,
			title: `Push "${nearMiss.keyword}" onto page one`,
		});
	}

	const gem = best.find((s) => s.classification === "hidden-gem" && !s.appRank);
	if (gem) {
		steps.push({
			cta: { href: SIGNUP_URL, label: "Get AI keyword ideas" },
			detail: `"${gem.keyword}" has real searches and weak competition, and you don't rank for it yet. Work it into your subtitle or keyword field.`,
			title: `Claim the hidden gem: "${gem.keyword}"`,
		});
	}

	if (steps.length < 3) {
		const issue = audit.issues.find(
			(i) => !["title-keywords", "no-ranks"].includes(i.id),
		);
		if (issue) {
			steps.push({
				cta: { href: SIGNUP_URL, label: "Fix it with AppBoard" },
				detail: issue.detail,
				title: issue.title,
			});
		}
	}
	if (steps.length < 3) {
		steps.push({
			cta: { href: SIGNUP_URL, label: "Set up daily tracking" },
			detail:
				"Scores and ranks move every week. AppBoard re-checks your keywords nightly and charts the trend - free.",
			title: "Track your keywords daily",
		});
	}

	return steps.slice(0, 3);
}
