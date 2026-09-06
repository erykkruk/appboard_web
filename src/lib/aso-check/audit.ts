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
