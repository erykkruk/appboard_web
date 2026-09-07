import { describe, expect, test } from "bun:test";

import { buildAudit, buildNextSteps } from "./audit";
import { fakeApp, fakeCompetitors } from "./check.fixtures";
import { scoreKeyword } from "./run-check";
import {
	type MarketReport,
	SHARE_SIGNUP_URL,
	SHARE_VERSION,
	type SharedAsoReport,
	safeUrl,
	sanitizeSharedReport,
	sharePath,
} from "./share";

function market(country: string): MarketReport {
	const app = fakeApp(country);
	const scores = ["habit tracker", "daily routine"].map((k) =>
		scoreKeyword(k, country, fakeCompetitors(k), k === "habit tracker" ? 4 : null),
	);
	const audit = buildAudit(app, scores);
	return {
		app,
		audit,
		country,
		nextSteps: buildNextSteps(app, scores, audit),
		scores,
	};
}

function report(): SharedAsoReport {
	return {
		markets: [market("us"), market("de")],
		missing: ["jp"],
		mode: "all",
		partial: false,
		store: "appstore",
		version: SHARE_VERSION,
	};
}

describe("sanitizeSharedReport", () => {
	test("our own snapshot survives a JSON round trip unchanged", () => {
		const original = report();
		const restored = sanitizeSharedReport(JSON.parse(JSON.stringify(original)));
		expect(restored).toEqual(original);
	});

	test("rejects snapshots that are not ours", () => {
		expect(sanitizeSharedReport(null)).toBeNull();
		expect(sanitizeSharedReport("x")).toBeNull();
		expect(sanitizeSharedReport({ ...report(), version: 2 })).toBeNull();
		expect(sanitizeSharedReport({ ...report(), markets: [] })).toBeNull();
		expect(
			sanitizeSharedReport({ ...report(), markets: [{ country: "zz1" }] }),
		).toBeNull();
	});

	test("strips hostile URLs, rewrites every button to sign-up and coerces bad enums", () => {
		const raw = JSON.parse(JSON.stringify(report())) as {
			markets: Array<Record<string, unknown>>;
			missing: unknown[];
		};
		const m = raw.markets[0];
		const app = m.app as Record<string, unknown>;
		app.icon = "javascript:alert(1)";
		app.url = "https://evil.example/app";
		app.screenshotUrls = [
			"http://is1-ssl.mzstatic.com/plain.png",
			"https://is1-ssl.mzstatic.com/ok.png",
			"https://play-lh.googleusercontent.com/ok2.png",
			"https://evil.example/x.png",
		];
		app.name = "x".repeat(600);
		const step = (m.nextSteps as Array<Record<string, unknown>>)[0];
		step.cta = { href: "https://evil.example/login", label: "Steal" };
		const issue = ((m.audit as Record<string, unknown>).issues as Array<
			Record<string, unknown>
		>)[0];
		if (issue) issue.severity = "critical";
		const score = (m.scores as Array<Record<string, unknown>>)[0];
		score.classification = "moon-shot";
		score.popularity = "very";
		(score.competitors as Array<Record<string, unknown>>)[0].url =
			"data:text/html,hi";
		raw.missing = ["jp", "JAPAN", 7, "de"];

		const clean = sanitizeSharedReport(raw);
		expect(clean).not.toBeNull();
		const us = clean?.markets[0];
		expect(us?.app.icon).toBeUndefined();
		expect(us?.app.url).toBeUndefined();
		expect(us?.app.screenshotUrls).toEqual([
			"https://is1-ssl.mzstatic.com/ok.png",
			"https://play-lh.googleusercontent.com/ok2.png",
		]);
		expect(us?.app.name).toHaveLength(255);
		expect(us?.nextSteps[0].cta.href).toBe(SHARE_SIGNUP_URL);
		expect(us?.nextSteps[0].cta.label).toBe("Steal");
		if (issue) expect(us?.audit.issues[0].severity).toBe("low");
		expect(us?.scores[0].classification).toBe("unknown");
		expect(us?.scores[0].popularity).toBeNull();
		expect(us?.scores[0].competitors[0].url).toBeUndefined();
		expect(us?.scores[0].competitors[1].url).toContain("apps.apple.com");
		expect(clean?.missing).toEqual(["jp", "de"]);
	});

	test("a market without a usable app or audit is dropped, the rest stays", () => {
		const raw = JSON.parse(JSON.stringify(report())) as {
			markets: Array<Record<string, unknown>>;
		};
		raw.markets[1].audit = { asoScore: "high" };
		const clean = sanitizeSharedReport(raw);
		expect(clean?.markets.map((m) => m.country)).toEqual(["us"]);
	});
});

describe("share helpers", () => {
	test("sharePath encodes the id", () => {
		expect(sharePath("abc")).toBe("/aso-check/r/abc");
		expect(sharePath("a b")).toBe("/aso-check/r/a%20b");
	});

	test("safeUrl accepts https on allowed hosts only", () => {
		const apple = (h: string) => h === "apps.apple.com";
		expect(safeUrl("https://apps.apple.com/us/app/id1", apple)).toBe(
			"https://apps.apple.com/us/app/id1",
		);
		expect(safeUrl("http://apps.apple.com/us/app/id1", apple)).toBeUndefined();
		expect(safeUrl("https://apps.apple.com.evil.example/", apple)).toBeUndefined();
		expect(safeUrl("not a url", apple)).toBeUndefined();
		expect(safeUrl(42, apple)).toBeUndefined();
	});
});
