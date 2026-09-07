import { describe, expect, test } from "bun:test";

import { KEYWORD_COUNTRIES } from "@/lib/keyword-research";

import { MAX_CANDIDATES } from "./audit";
import { fakeApp, fakeCompetitors } from "./check.fixtures";
import {
	ALL_MARKETS_CANDIDATES,
	ALL_MARKETS_CANDIDATES_PLAY,
	type CheckDeps,
	candidateLimit,
	marketsFor,
	runCheck,
} from "./run-check";

function deps(listedIn: (country: string) => boolean, log: string[] = []): CheckDeps {
	return {
		keywordData: async (_store, keyword, country, trackId) => {
			log.push(`kw:${country}:${keyword}`);
			return {
				competitors: fakeCompetitors(keyword),
				rank: keyword === "habit tracker" && trackId ? 4 : null,
			};
		},
		lookup: async (_store, _id, country) => {
			log.push(`lookup:${country}`);
			return listedIn(country) ? fakeApp(country) : null;
		},
		sleep: async () => {},
	};
}

describe("marketsFor", () => {
	test("all markets start with the storefront from the link, then the rest", () => {
		const list = marketsFor("all", "pl");
		expect(list[0]).toBe("pl");
		expect(list).toHaveLength(KEYWORD_COUNTRIES.length);
		expect(new Set(list).size).toBe(list.length);
	});

	test("single mode is just that storefront", () => {
		expect(marketsFor("single", "DE")).toEqual(["de"]);
	});

	test("candidate budget depends on mode and store", () => {
		expect(candidateLimit("single", "appstore")).toBe(MAX_CANDIDATES);
		expect(candidateLimit("all", "appstore")).toBe(ALL_MARKETS_CANDIDATES);
		expect(candidateLimit("all", "playstore")).toBe(ALL_MARKETS_CANDIDATES_PLAY);
	});
});

describe("runCheck", () => {
	test("all markets: skips storefronts without the app, caps keywords per market and reports every market", async () => {
		const log: string[] = [];
		const missing: string[] = [];
		const markets: string[] = [];
		const outcome = await runCheck(
			{ country: "de", id: "123456", mode: "all", store: "appstore" },
			{
				onMarket: (m) => markets.push(m.country),
				onMissing: (c) => missing.push(c),
			},
			deps((c) => c !== "jp" && c !== "kr", log),
		);

		expect(outcome.partial).toBe(false);
		expect(outcome.markets.map((m) => m.country)[0]).toBe("de");
		expect(outcome.markets).toHaveLength(KEYWORD_COUNTRIES.length - 2);
		expect(outcome.missing).toEqual(["jp", "kr"]);
		expect(missing).toEqual(["jp", "kr"]);
		expect(markets).toEqual(outcome.markets.map((m) => m.country));
		expect(log[0]).toBe("lookup:de");
		const deKeywords = log.filter((l) => l.startsWith("kw:de:"));
		expect(deKeywords).toHaveLength(ALL_MARKETS_CANDIDATES);
		expect(log.filter((l) => l.startsWith("kw:jp:"))).toHaveLength(0);
		const de = outcome.markets[0];
		expect(de.scores).toHaveLength(ALL_MARKETS_CANDIDATES);
		expect(de.audit.asoScore).toBeGreaterThan(0);
		expect(de.nextSteps.length).toBeGreaterThan(0);
		// Sorted by opportunity, best first.
		for (let i = 1; i < de.scores.length; i++) {
			expect(de.scores[i - 1].opportunity).toBeGreaterThanOrEqual(
				de.scores[i].opportunity,
			);
		}
	});

	test("single market: uses the engine's full candidate list and fails loudly when the app is not there", async () => {
		const log: string[] = [];
		const outcome = await runCheck(
			{ country: "us", id: "123456", mode: "single", store: "appstore" },
			{},
			deps(() => true, log),
		);
		expect(outcome.markets).toHaveLength(1);
		expect(outcome.missing).toEqual([]);
		expect(log.filter((l) => l.startsWith("kw:us:")).length).toBeGreaterThan(
			ALL_MARKETS_CANDIDATES,
		);

		await expect(
			runCheck(
				{ country: "us", id: "123456", mode: "single", store: "appstore" },
				{},
				deps(() => false),
			),
		).rejects.toThrow(/couldn't find this app/);
	});

	test("all markets with the app nowhere fails instead of returning an empty report", async () => {
		await expect(
			runCheck(
				{ country: "us", id: "123456", mode: "all", store: "appstore" },
				{},
				deps(() => false),
			),
		).rejects.toThrow(/any of the/);
	});

	test("stopping mid-run keeps what was scored and marks the report partial", async () => {
		let kwCalls = 0;
		const base = deps(() => true);
		const counting: CheckDeps = {
			...base,
			keywordData: async (...args) => {
				kwCalls++;
				return base.keywordData(...args);
			},
		};
		const outcome = await runCheck(
			{ country: "us", id: "123456", mode: "all", store: "appstore" },
			// Stop after the first market plus three keywords of the second.
			{ isCancelled: () => kwCalls >= ALL_MARKETS_CANDIDATES + 3 },
			counting,
		);
		expect(outcome.partial).toBe(true);
		expect(outcome.markets).toHaveLength(2);
		expect(outcome.markets[1].scores).toHaveLength(3);
	});

	test("Google Play scores fewer keywords per market and every event carries live rows", async () => {
		const live: number[] = [];
		const outcome = await runCheck(
			{ country: "us", id: "com.habitly", mode: "all", store: "playstore" },
			{ onScores: (_c, _app, scores) => live.push(scores.length) },
			deps((c) => c === "us" || c === "gb"),
		);
		expect(outcome.markets).toHaveLength(2);
		expect(outcome.markets[0].scores).toHaveLength(ALL_MARKETS_CANDIDATES_PLAY);
		expect(live.slice(0, ALL_MARKETS_CANDIDATES_PLAY)).toEqual([1, 2, 3, 4, 5]);
	});
});
