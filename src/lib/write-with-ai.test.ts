import { describe, expect, test } from "bun:test";

import { ApiError } from "./api";
import type { Listing } from "./types";
import {
	extractGeneratedText,
	isAiUnavailableError,
	MAX_TARGET_KEYWORDS,
	parseSuggestedKeywords,
	pickMarketListing,
	splitCurrentKeywords,
} from "./write-with-ai";

function listing(overrides: Partial<Listing>): Listing {
	return {
		appId: "app-1",
		doNotTranslateFields: null,
		fullDesc: "",
		id: "l-1",
		isDirty: false,
		keywords: "",
		language: "en-US",
		promoText: "",
		shortDesc: "",
		source: "remote",
		title: "",
		translationInstructions: null,
		videoUrl: "",
		whatsNew: "",
		...overrides,
	};
}

describe("parseSuggestedKeywords", () => {
	test("reads the backend shape and ignores the model field", () => {
		expect(
			parseSuggestedKeywords({
				clusters: { feature: ["Focus Timer"], problem: ["procrastination"] },
				keywords: ["Focus Timer", "procrastination"],
				model: "google/gemini-3-flash-preview",
			}),
		).toEqual(["focus timer", "procrastination"]);
	});

	test("never turns rival names into chips, whatever shape they arrive in", () => {
		expect(
			parseSuggestedKeywords({
				clusters: {
					competitors: ["Todoist", "Things 3"],
					feature: ["focus timer"],
				},
				model: "m",
				trackingOnly: ["Todoist", "Things 3"],
			}),
		).toEqual(["focus timer"]);
		expect(
			parseSuggestedKeywords({
				result:
					'{"feature": ["focus timer"], "competitors": ["Todoist"], "alternative": ["forest alternative"]}',
			}),
		).toEqual(["focus timer"]);
	});

	test("reads a JSON array inside result", () => {
		expect(
			parseSuggestedKeywords({ result: '["focus timer", "pomodoro"]' }),
		).toEqual(["focus timer", "pomodoro"]);
	});

	test("reads a fenced JSON cluster object inside result", () => {
		expect(
			parseSuggestedKeywords({
				result: '```json\n{"feature": ["focus timer"], "longTail": ["block distracting apps"]}\n```',
			}),
		).toEqual(["focus timer", "block distracting apps"]);
	});

	test("reads a comma list", () => {
		expect(
			parseSuggestedKeywords({ result: "focus timer, pomodoro, study timer" }),
		).toEqual(["focus timer", "pomodoro", "study timer"]);
	});

	test("reads one keyword per line with bullets, numbers and quotes", () => {
		expect(
			parseSuggestedKeywords({
				result: '- focus timer\n2. "pomodoro"\n* study timer\n',
			}),
		).toEqual(["focus timer", "pomodoro", "study timer"]);
	});

	test("drops sentences, dedupes case-insensitively and caps the list", () => {
		const many = Array.from({ length: 30 }, (_, i) => `keyword ${i}`);
		const raw = [
			"Focus Timer",
			"focus timer",
			"This is a whole sentence that the model slipped into the answer instead of a term",
			...many,
		].join("\n");
		const parsed = parseSuggestedKeywords({ result: raw });
		expect(parsed[0]).toBe("focus timer");
		expect(parsed).not.toContain("Focus Timer");
		expect(parsed.some((k) => k.startsWith("this is a whole"))).toBe(false);
		expect(parsed).toHaveLength(MAX_TARGET_KEYWORDS);
	});

	test("returns nothing for an empty or unknown answer", () => {
		expect(parseSuggestedKeywords({ result: "" })).toEqual([]);
		expect(parseSuggestedKeywords(null)).toEqual([]);
		expect(parseSuggestedKeywords(42)).toEqual([]);
	});
});

describe("extractGeneratedText", () => {
	test("prefers result and falls back to description", () => {
		expect(extractGeneratedText({ result: " New text " })).toBe("New text");
		expect(extractGeneratedText({ description: "Older shape" })).toBe(
			"Older shape",
		);
		expect(extractGeneratedText({ model: "x" })).toBe("");
		expect(extractGeneratedText(undefined)).toBe("");
	});
});

describe("pickMarketListing", () => {
	const rows = [
		listing({ id: "en-remote", language: "en-US" }),
		listing({ id: "pl-remote", language: "pl-PL" }),
		listing({ id: "pl-draft", language: "pl-PL", source: "draft" }),
	];

	test("matches the import country by language base and prefers the draft", () => {
		expect(pickMarketListing(rows, "pl")?.id).toBe("pl-draft");
	});

	test("matches the import country by region", () => {
		expect(pickMarketListing(rows, "US")?.id).toBe("en-remote");
	});

	test("falls back to the first row's language", () => {
		expect(pickMarketListing(rows, "de")?.id).toBe("en-remote");
		expect(pickMarketListing(rows, undefined)?.id).toBe("en-remote");
	});

	test("returns null without listings", () => {
		expect(pickMarketListing([], "pl")).toBeNull();
	});
});

describe("splitCurrentKeywords", () => {
	test("splits the iOS keyword field", () => {
		expect(splitCurrentKeywords("Focus, timer ,pomodoro,,")).toEqual([
			"focus",
			"timer",
			"pomodoro",
		]);
		expect(splitCurrentKeywords(null)).toEqual([]);
	});
});

describe("isAiUnavailableError", () => {
	test("recognises a missing OpenRouter key and a disabled feature", () => {
		expect(
			isAiUnavailableError(
				new ApiError(400, "BAD_REQUEST", {
					info: "OpenRouter API key not configured. Go to Settings to add it.",
				}),
			),
		).toBe(true);
		expect(isAiUnavailableError(new ApiError(403, "FEATURE_DISABLED"))).toBe(
			true,
		);
	});

	test("leaves other failures alone", () => {
		expect(
			isAiUnavailableError(new ApiError(500, "SOMETHING_WENT_WRONG")),
		).toBe(false);
		expect(
			isAiUnavailableError(new ApiError(422, "VALIDATION", { info: "bad body" })),
		).toBe(false);
		expect(isAiUnavailableError(new Error("network"))).toBe(false);
	});
});
