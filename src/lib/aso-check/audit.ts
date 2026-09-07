/**
 * Free ASO check-up glue.
 *
 * The audit RULES and the keyword-candidate extraction live in the backend
 * (src/modules/research/listing-audit.ts) and are copied here verbatim by
 * scripts/sync-aso-engine.sh, so the free browser check-up and the panel's
 * app audit can never drift apart. Only buildNextSteps stays local: it is
 * marketing copy for signed-out visitors, not an audit rule.
 */
import type { KeywordScore } from "@/lib/aso-engine/scoring-types";
import type { CheckedApp } from "./itunes";

export {
  APPBOARD_FIXES,
  type AuditApp,
  type AuditIssue,
  type AuditResult,
  brandToken,
  buildAudit,
  extractKeywordCandidates,
  isBrandKeyword,
  MAX_CANDIDATES,
} from "@/lib/aso-engine/listing-audit";
import type { AuditResult } from "@/lib/aso-engine/listing-audit";

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

	// The best term you are absent from, whatever its label: a sweet spot is
	// as much a gap as a hidden gem, and "gem" alone missed most of them.
	const gap = best.find((s) => !s.appRank);
	if (gap) {
		steps.push({
			cta: { href: SIGNUP_URL, label: "Get AI keyword ideas" },
			detail: `"${gap.keyword}" is searched (popularity ${gap.popularity ?? "n/a"}) at a difficulty you can win (${gap.difficulty}), and you don't rank for it yet. Work it into your subtitle or keyword field.`,
			title: `Claim the open keyword: "${gap.keyword}"`,
		});
	}

	// Things you can act on come before context you cannot (ratings, age):
	// "add a review prompt" is honest advice, but never the first thing to do.
	const covered = new Set(["title-keywords", "no-ranks", "missing-winnable-terms"]);
	const remaining = audit.issues
		.filter((i) => !covered.has(i.id))
		.sort((a, b) => Number(b.actionable) - Number(a.actionable));
	for (const issue of remaining) {
		if (steps.length >= 3) break;
		steps.push({
			cta: { href: SIGNUP_URL, label: "Fix it with AppBoard" },
			detail: issue.detail,
			title: issue.title,
		});
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
