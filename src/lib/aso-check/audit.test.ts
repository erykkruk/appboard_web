import { describe, expect, test } from "bun:test";

import type { KeywordScore } from "@/lib/aso-engine/scoring-types";
import { buildAudit, extractKeywordCandidates } from "./audit";
import type { CheckedApp } from "./itunes";

function app(overrides: Partial<CheckedApp> = {}): CheckedApp {
	return {
		country: "us",
		description:
			"Build better habits every day. Track your habit streaks, get gentle reminders and stay motivated. Habit tracking works offline. Habit streaks sync across devices. Daily reminders keep your routine alive. Track habits, build routine, repeat.",
		developer: "Acme",
		genre: "Health & Fitness",
		genres: ["Health & Fitness"],
		name: "Habitly - Habit Tracker & Streaks",
		rating: 4.6,
		ratingsCount: 1200,
		released: "2020-01-01T00:00:00Z",
		screenshots: 8,
		trackId: "123",
		updated: new Date().toISOString(),
		...overrides,
	};
}

function score(keyword: string, overrides: Partial<KeywordScore> = {}): KeywordScore {
	return {
		breakdown: {} as KeywordScore["breakdown"],
		classification: "good-target",
		competitors: [],
		country: "us",
		difficulty: 40,
		difficultyLabel: "moderate",
		downloads: {
			dailySearches: 100,
			positions: [{ high: 6, low: 1.5, position: 1, ttr: 30 }],
			tiers: {
				top5: { high: 3, low: 0.7 },
				top6to10: { high: 0.5, low: 0.1 },
				top11to20: { high: 0.1, low: 0 },
			},
		},
		keyword,
		opportunity: 45,
		popularity: 50,
		tiers: {} as KeywordScore["tiers"],
		...overrides,
	};
}

describe("extractKeywordCandidates", () => {
	test("pulls title phrases first, then frequent description phrases", () => {
		const candidates = extractKeywordCandidates(app());
		expect(candidates[0]).toBe("habit tracker");
		expect(candidates).toContain("streaks");
		expect(candidates.length).toBeLessThanOrEqual(8);
		expect(new Set(candidates).size).toBe(candidates.length);
	});

	test("falls back to genre when listing text is thin", () => {
		const candidates = extractKeywordCandidates(
			app({ description: "Short.", name: "Habitly" }),
		);
		expect(candidates).toContain("health fitness");
	});
});

describe("buildAudit", () => {
	test("rewards a keyword-bearing title and counts ranked keywords", () => {
		const audit = buildAudit(app(), [
			score("habit tracker", { appRank: 12 }),
			score("habit streak"),
		]);
		expect(audit.issues.find((i) => i.id === "title-keywords")).toBeUndefined();
		expect(audit.strengths.join(" ")).toContain("Ranks for 1 of 2");
		expect(audit.asoScore).toBeGreaterThan(60);
	});

	test("flags a keyword-less title, few screenshots and no ranks", () => {
		const audit = buildAudit(
			app({ name: "Habitly", screenshots: 3 }),
			[score("habit tracker")],
		);
		const ids = audit.issues.map((i) => i.id);
		expect(ids).toContain("title-keywords");
		expect(ids).toContain("screenshots");
		expect(ids).toContain("no-ranks");
		expect(audit.asoScore).toBeLessThan(70);
	});
});
