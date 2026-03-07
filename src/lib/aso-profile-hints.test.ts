import { describe, expect, test } from "bun:test";

import { FIELD_HINTS } from "./aso-profile-hints";
import type { FieldHint } from "./aso-profile-hints";

describe("FIELD_HINTS", () => {
	const EXPECTED_KEYS = [
		"category",
		"oneLiner",
		"problem",
		"mainBenefit",
		"keyFeatures",
		"differentiator",
		"tone",
		"brandVoiceExample",
		"wordsToInclude",
		"wordsToAvoid",
		"targetAudience",
		"painPoints",
		"userLanguage",
		"competitors",
		"competitiveAdvantage",
		"positioning",
		"downloadCount",
		"awards",
		"pressQuotes",
		"testimonials",
		"pricingModel",
		"price",
		"freeFeatures",
		"premiumFeatures",
		"mustIncludeKeywords",
		"longTailKeywords",
		"excludeKeywords",
	];

	test("contains all expected profile fields", () => {
		for (const key of EXPECTED_KEYS) {
			expect(FIELD_HINTS[key]).toBeDefined();
		}
	});

	test("has no extra unexpected keys", () => {
		const keys = Object.keys(FIELD_HINTS);
		expect(keys.sort()).toEqual([...EXPECTED_KEYS].sort());
	});

	test("every hint has non-empty description and example", () => {
		for (const [key, hint] of Object.entries(FIELD_HINTS)) {
			const h = hint as FieldHint;
			expect(h.description.length).toBeGreaterThan(0);
			expect(h.example.length).toBeGreaterThan(0);
		}
	});

	test("contains 27 field hints", () => {
		expect(Object.keys(FIELD_HINTS)).toHaveLength(27);
	});
});
