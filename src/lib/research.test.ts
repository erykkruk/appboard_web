import { describe, expect, test } from "bun:test";

import {
	ASO_SUMMARY_LIMIT,
	ASO_TITLE_LIMIT,
	auditMetadata,
	formatKeywordPosition,
	keywordCoverage,
	MAX_KEYWORDS_PER_CHECK,
	parseCustomKeywords,
	parseStoreLinks,
	parseStoreUrl,
	researchAppKey,
	researchCategoryLabel,
} from "./research";

describe("parseStoreUrl", () => {
	test("parses App Store URL with country", () => {
		expect(
			parseStoreUrl("https://apps.apple.com/pl/app/librus/id1069740093"),
		).toEqual({ country: "pl", id: "1069740093", store: "appstore" });
	});

	test("parses App Store URL without country using default", () => {
		expect(
			parseStoreUrl("https://apps.apple.com/app/some-app/id123456", "de"),
		).toEqual({ country: "de", id: "123456", store: "appstore" });
	});

	test("parses legacy itunes.apple.com URL", () => {
		expect(
			parseStoreUrl("https://itunes.apple.com/us/app/thing/id987654"),
		).toEqual({ country: "us", id: "987654", store: "appstore" });
	});

	test("parses Google Play URL", () => {
		expect(
			parseStoreUrl(
				"https://play.google.com/store/apps/details?id=com.example.app",
			),
		).toEqual({ country: "us", id: "com.example.app", store: "playstore" });
	});

	test("parses Google Play URL with gl country param", () => {
		expect(
			parseStoreUrl(
				"https://play.google.com/store/apps/details?id=com.example.app&gl=PL",
			),
		).toEqual({ country: "pl", id: "com.example.app", store: "playstore" });
	});

	test("returns null for non-store URL", () => {
		expect(parseStoreUrl("https://example.com/foo")).toBeNull();
	});

	test("returns null for empty input", () => {
		expect(parseStoreUrl("   ")).toBeNull();
	});
});

describe("parseStoreLinks", () => {
	test("splits input on any whitespace", () => {
		const input =
			"https://apps.apple.com/pl/app/a/id111\nhttps://play.google.com/store/apps/details?id=com.b  https://apps.apple.com/us/app/c/id222";
		const links = parseStoreLinks(input);
		expect(links).toHaveLength(3);
		expect(links[0]).toMatchObject({ id: "111", store: "appstore" });
		expect(links[1]).toMatchObject({ id: "com.b", store: "playstore" });
		expect(links[2]).toMatchObject({ id: "222", store: "appstore" });
	});

	test("skips invalid chunks", () => {
		const links = parseStoreLinks(
			"not-a-link https://apps.apple.com/app/x/id333",
		);
		expect(links).toHaveLength(1);
		expect(links[0].id).toBe("333");
	});

	test("deduplicates the same app pasted twice", () => {
		const url = "https://play.google.com/store/apps/details?id=com.dup";
		expect(parseStoreLinks(`${url}\n${url}`)).toHaveLength(1);
	});

	test("keeps the original url on the parsed link", () => {
		const url = "https://apps.apple.com/pl/app/a/id444";
		expect(parseStoreLinks(url)[0].url).toBe(url);
	});

	test("returns empty array for empty input", () => {
		expect(parseStoreLinks("")).toEqual([]);
	});
});

describe("auditMetadata", () => {
	test("accepts a title at exactly the limit", () => {
		const audit = auditMetadata({ title: "x".repeat(ASO_TITLE_LIMIT) });
		expect(audit.titleLength).toBe(30);
		expect(audit.titleTooLong).toBe(false);
	});

	test("flags a title over 30 characters", () => {
		const audit = auditMetadata({ title: "x".repeat(ASO_TITLE_LIMIT + 1) });
		expect(audit.titleTooLong).toBe(true);
	});

	test("accepts a summary at exactly the limit", () => {
		const audit = auditMetadata({
			summary: "y".repeat(ASO_SUMMARY_LIMIT),
			title: "App",
		});
		expect(audit.summaryLength).toBe(80);
		expect(audit.summaryTooLong).toBe(false);
	});

	test("flags a summary over 80 characters", () => {
		const audit = auditMetadata({
			summary: "y".repeat(ASO_SUMMARY_LIMIT + 1),
			title: "App",
		});
		expect(audit.summaryTooLong).toBe(true);
	});

	test("reports null summary length when missing", () => {
		const audit = auditMetadata({ title: "App" });
		expect(audit.summaryLength).toBeNull();
		expect(audit.summaryTooLong).toBe(false);
	});

	test("counts description length with 0 fallback", () => {
		expect(auditMetadata({ title: "App" }).descriptionLength).toBe(0);
		expect(
			auditMetadata({ description: "abc", title: "App" }).descriptionLength,
		).toBe(3);
	});
});

describe("keywordCoverage", () => {
	const meta = {
		description: "Track your workouts and running sessions offline.",
		summary: "Best habit tracker for daily routines",
		title: "FitLog — Workout Tracker",
	};

	test("keyword in title wins over other placements", () => {
		expect(keywordCoverage(meta, ["workout"])).toEqual([
			{ keyword: "workout", placement: "title" },
		]);
	});

	test("keyword only in summary is reported as summary", () => {
		expect(keywordCoverage(meta, ["habit"])).toEqual([
			{ keyword: "habit", placement: "summary" },
		]);
	});

	test("keyword only in description is reported as description", () => {
		expect(keywordCoverage(meta, ["running"])).toEqual([
			{ keyword: "running", placement: "description" },
		]);
	});

	test("keyword nowhere is reported as missing", () => {
		expect(keywordCoverage(meta, ["meditation"])).toEqual([
			{ keyword: "meditation", placement: "missing" },
		]);
	});

	test("matching is case-insensitive", () => {
		expect(keywordCoverage(meta, ["WORKOUT"])[0].placement).toBe("title");
	});

	test("handles missing summary and description", () => {
		expect(keywordCoverage({ title: "Solo" }, ["solo", "other"])).toEqual([
			{ keyword: "solo", placement: "title" },
			{ keyword: "other", placement: "missing" },
		]);
	});
});

describe("formatKeywordPosition", () => {
	test("undefined means the store was not checked", () => {
		expect(formatKeywordPosition(undefined)).toEqual({
			label: "Not checked",
			tone: "muted",
		});
	});

	test("null means outside the top 50", () => {
		expect(formatKeywordPosition(null)).toEqual({
			label: "Not in top 50",
			tone: "muted",
		});
	});

	test("top 10 position is strong", () => {
		expect(formatKeywordPosition(1)).toEqual({ label: "#1", tone: "strong" });
		expect(formatKeywordPosition(10)).toEqual({ label: "#10", tone: "strong" });
	});

	test("top 25 position is medium", () => {
		expect(formatKeywordPosition(11)).toEqual({ label: "#11", tone: "medium" });
		expect(formatKeywordPosition(25)).toEqual({ label: "#25", tone: "medium" });
	});

	test("positions beyond 25 use the default tone", () => {
		expect(formatKeywordPosition(26)).toEqual({
			label: "#26",
			tone: "default",
		});
	});
});

describe("parseCustomKeywords", () => {
	test("splits by commas and new lines and trims", () => {
		expect(parseCustomKeywords("habit tracker, workout\n meditation ")).toEqual(
			["habit tracker", "workout", "meditation"],
		);
	});

	test("deduplicates case-insensitively keeping first spelling", () => {
		expect(parseCustomKeywords("Yoga, yoga, YOGA")).toEqual(["Yoga"]);
	});

	test("caps the list at the backend limit", () => {
		const input = Array.from({ length: 20 }, (_, i) => `kw${i}`).join(",");
		expect(parseCustomKeywords(input)).toHaveLength(MAX_KEYWORDS_PER_CHECK);
	});

	test("returns empty array for blank input", () => {
		expect(parseCustomKeywords(" ,\n, ")).toEqual([]);
	});
});

describe("researchAppKey", () => {
	test("combines store and id", () => {
		expect(researchAppKey({ id: "com.x", store: "playstore" })).toBe(
			"playstore:com.x",
		);
	});
});

describe("researchCategoryLabel", () => {
	test("maps known backend category ids", () => {
		expect(researchCategoryLabel("crash-bugi")).toBe("Crashes / Bugs");
	});

	test("falls back to the raw id for unknown categories", () => {
		expect(researchCategoryLabel("custom-id")).toBe("custom-id");
	});
});
