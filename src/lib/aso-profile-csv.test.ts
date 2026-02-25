import { describe, expect, it } from "bun:test";

import type { AsoProfileInput } from "@/lib/types";

import {
	exportProfileCsv,
	exportProfileJson,
	generateProfileTemplate,
	parseProfileFile,
} from "./aso-profile-csv";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EMPTY_PROFILE: AsoProfileInput = {
	awards: null,
	brandVoiceExample: null,
	category: null,
	competitiveAdvantage: null,
	competitors: null,
	differentiator: null,
	downloadCount: null,
	excludeKeywords: null,
	freeFeatures: null,
	keyFeatures: null,
	longTailKeywords: null,
	mainBenefit: null,
	mustIncludeKeywords: null,
	oneLiner: null,
	painPoints: null,
	positioning: null,
	premiumFeatures: null,
	pressQuotes: null,
	price: null,
	pricingModel: null,
	problem: null,
	targetAudience: null,
	testimonials: null,
	tone: null,
	userLanguage: null,
	wordsToAvoid: null,
	wordsToInclude: null,
};

const FULL_PROFILE: AsoProfileInput = {
	awards: ["Editor's Choice", "Best App 2025"],
	brandVoiceExample: "Capture every moment, effortlessly.",
	category: "Photography",
	competitiveAdvantage: "AI auto-enhance in real time",
	competitors: ["VSCO", "Snapseed", "Lightroom"],
	differentiator: "One-tap AI editing",
	downloadCount: "2M+",
	excludeKeywords: ["filter", "selfie"],
	freeFeatures: ["Basic editing", "Sharing"],
	keyFeatures: ["AI enhance", "RAW support", "Cloud backup"],
	longTailKeywords: ["photo editor with AI", "best RAW editor mobile"],
	mainBenefit: "Professional photos in seconds",
	mustIncludeKeywords: ["photo editor", "AI", "RAW"],
	oneLiner: "AI-powered photo editing on the go",
	painPoints: ["Complex tools", "Storage limits"],
	positioning: "Premium but accessible",
	premiumFeatures: ["RAW editing", "Cloud storage"],
	pressQuotes: ["'Best mobile editor' - TheVerge"],
	price: "$4.99/month",
	pricingModel: "Freemium",
	problem: "Mobile photos look amateur",
	targetAudience: "Amateur photographers aged 20-35",
	testimonials: ["Replaced Lightroom for me!"],
	tone: "Inspiring",
	userLanguage: "Casual tech-savvy",
	wordsToAvoid: ["cheap", "basic"],
	wordsToInclude: ["pro", "stunning"],
};

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

describe("exportProfileCsv", () => {
	it("exports a header row and a data row", () => {
		const csv = exportProfileCsv(EMPTY_PROFILE);
		const lines = csv.split("\n");

		expect(lines).toHaveLength(2);
		expect(lines[0]).toContain("category");
		expect(lines[0]).toContain("wordsToInclude");
	});

	it("exports string fields as plain values", () => {
		const csv = exportProfileCsv({
			...EMPTY_PROFILE,
			category: "Games",
			tone: "Friendly",
		});
		const lines = csv.split("\n");
		const headers = lines[0].split(",");
		const values = lines[1].split(",");

		const catIdx = headers.indexOf("category");
		const toneIdx = headers.indexOf("tone");

		expect(values[catIdx]).toBe("Games");
		expect(values[toneIdx]).toBe("Friendly");
	});

	it("exports array fields joined with pipe separator", () => {
		const csv = exportProfileCsv({
			...EMPTY_PROFILE,
			keyFeatures: ["A", "B", "C"],
		});
		const lines = csv.split("\n");
		const headers = lines[0].split(",");
		const values = lines[1].split(",");

		const idx = headers.indexOf("keyFeatures");
		expect(values[idx]).toBe("A | B | C");
	});

	it("exports null fields as empty strings", () => {
		const csv = exportProfileCsv(EMPTY_PROFILE);
		const lines = csv.split("\n");
		const values = lines[1].split(",");

		for (const val of values) {
			expect(val).toBe("");
		}
	});

	it("escapes commas in values with quotes", () => {
		const csv = exportProfileCsv({
			...EMPTY_PROFILE,
			oneLiner: "Edit, enhance, share",
		});

		expect(csv).toContain('"Edit, enhance, share"');
	});

	it("escapes double quotes in values", () => {
		const csv = exportProfileCsv({
			...EMPTY_PROFILE,
			pressQuotes: ['"Amazing" - TechCrunch'],
		});

		expect(csv).toContain('""Amazing"" - TechCrunch');
	});
});

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

describe("exportProfileJson", () => {
	it("exports valid JSON with all profile fields", () => {
		const json = exportProfileJson(FULL_PROFILE);
		const parsed = JSON.parse(json);

		expect(parsed.category).toBe("Photography");
		expect(parsed.keyFeatures).toEqual(["AI enhance", "RAW support", "Cloud backup"]);
		expect(parsed.wordsToInclude).toEqual(["pro", "stunning"]);
	});

	it("exports null fields as null", () => {
		const json = exportProfileJson(EMPTY_PROFILE);
		const parsed = JSON.parse(json);

		expect(parsed.category).toBeNull();
		expect(parsed.keyFeatures).toBeNull();
		expect(parsed.wordsToInclude).toBeNull();
	});

	it("includes all expected fields", () => {
		const json = exportProfileJson(EMPTY_PROFILE);
		const parsed = JSON.parse(json);

		const keys = Object.keys(parsed);
		expect(keys).toContain("category");
		expect(keys).toContain("keyFeatures");
		expect(keys).toContain("wordsToInclude");
		expect(keys).toContain("wordsToAvoid");
		expect(keys).toContain("tone");
		expect(keys).toContain("pricingModel");
	});
});

// ---------------------------------------------------------------------------
// Template Generation
// ---------------------------------------------------------------------------

describe("generateProfileTemplate", () => {
	it("generates a CSV with header and empty data row", () => {
		const template = generateProfileTemplate();
		const lines = template.split("\n");

		expect(lines).toHaveLength(2);
		expect(lines[0]).toContain("category");
		expect(lines[1].split(",").every((v) => v === "")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

describe("parseProfileFile — CSV", () => {
	it("parses a basic CSV with string and array fields", () => {
		const csv = "category,tone,keyFeatures\nGames,Friendly,Feature A | Feature B";
		const { profile, errors } = parseProfileFile(csv, "test.csv");

		expect(errors).toHaveLength(0);
		expect(profile).not.toBeNull();
		expect(profile!.category).toBe("Games");
		expect(profile!.tone).toBe("Friendly");
		expect(profile!.keyFeatures).toEqual(["Feature A", "Feature B"]);
	});

	it("returns null for unrecognized columns", () => {
		const csv = "foo,bar\nval1,val2";
		const { profile, errors } = parseProfileFile(csv, "test.csv");

		expect(profile).toBeNull();
		expect(errors.length).toBeGreaterThan(0);
	});

	it("returns null for empty file", () => {
		const { profile, errors } = parseProfileFile("", "test.csv");

		expect(profile).toBeNull();
		expect(errors).toContain("File is empty");
	});

	it("returns null for header-only CSV", () => {
		const { profile, errors } = parseProfileFile("category,tone", "test.csv");

		expect(profile).toBeNull();
		expect(errors).toContain("No data rows found");
	});

	it("handles empty values as null", () => {
		const csv = "category,tone,keyFeatures\n,,";
		const { profile } = parseProfileFile(csv, "test.csv");

		expect(profile!.category).toBeNull();
		expect(profile!.tone).toBeNull();
		expect(profile!.keyFeatures).toBeNull();
	});

	it("handles quoted fields with commas", () => {
		const csv = 'category,oneLiner\nGames,"Edit, enhance, share"';
		const { profile } = parseProfileFile(csv, "test.csv");

		expect(profile!.oneLiner).toBe("Edit, enhance, share");
	});

	it("handles quoted fields with escaped double quotes", () => {
		const csv = 'category,pressQuotes\nGames,"""Amazing"" - TechCrunch"';
		const { profile } = parseProfileFile(csv, "test.csv");

		expect(profile!.pressQuotes).toEqual(['"Amazing" - TechCrunch']);
	});

	it("ignores unrecognized columns but parses recognized ones", () => {
		const csv = "category,unknownCol,tone\nGames,foo,Casual";
		const { profile, errors } = parseProfileFile(csv, "test.csv");

		expect(errors).toHaveLength(0);
		expect(profile!.category).toBe("Games");
		expect(profile!.tone).toBe("Casual");
	});

	it("handles CRLF line endings", () => {
		const csv = "category,tone\r\nGames,Friendly\r\n";
		const { profile } = parseProfileFile(csv, "test.csv");

		expect(profile!.category).toBe("Games");
		expect(profile!.tone).toBe("Friendly");
	});
});

// ---------------------------------------------------------------------------
// JSON Parsing
// ---------------------------------------------------------------------------

describe("parseProfileFile — JSON", () => {
	it("parses a valid JSON object", () => {
		const json = JSON.stringify({
			category: "Games",
			keyFeatures: ["A", "B"],
			tone: "Friendly",
		});
		const { profile, errors } = parseProfileFile(json, "test.json");

		expect(errors).toHaveLength(0);
		expect(profile!.category).toBe("Games");
		expect(profile!.keyFeatures).toEqual(["A", "B"]);
		expect(profile!.tone).toBe("Friendly");
	});

	it("returns error for invalid JSON", () => {
		const { profile, errors } = parseProfileFile("not json", "test.json");

		expect(profile).toBeNull();
		expect(errors).toContain("Invalid JSON");
	});

	it("returns error for JSON array", () => {
		const { profile, errors } = parseProfileFile("[1,2,3]", "test.json");

		expect(profile).toBeNull();
		expect(errors).toContain("JSON must be an object");
	});

	it("handles null values", () => {
		const json = JSON.stringify({ category: null, keyFeatures: null });
		const { profile } = parseProfileFile(json, "test.json");

		expect(profile!.category).toBeNull();
		expect(profile!.keyFeatures).toBeNull();
	});

	it("handles missing fields as null", () => {
		const json = JSON.stringify({ category: "Games" });
		const { profile } = parseProfileFile(json, "test.json");

		expect(profile!.category).toBe("Games");
		expect(profile!.tone).toBeNull();
		expect(profile!.keyFeatures).toBeNull();
	});

	it("converts pipe-separated string to array for array fields", () => {
		const json = JSON.stringify({
			keyFeatures: "Feature A | Feature B",
		});
		const { profile } = parseProfileFile(json, "test.json");

		expect(profile!.keyFeatures).toEqual(["Feature A", "Feature B"]);
	});

	it("converts non-string values to strings for string fields", () => {
		const json = JSON.stringify({ category: 42 });
		const { profile } = parseProfileFile(json, "test.json");

		expect(profile!.category).toBe("42");
	});
});

// ---------------------------------------------------------------------------
// Roundtrip Tests
// ---------------------------------------------------------------------------

describe("roundtrip CSV: export → parse", () => {
	it("full profile survives CSV roundtrip", () => {
		const csv = exportProfileCsv(FULL_PROFILE);
		const { profile, errors } = parseProfileFile(csv, "roundtrip.csv");

		expect(errors).toHaveLength(0);
		expect(profile).not.toBeNull();

		// String fields
		expect(profile!.category).toBe(FULL_PROFILE.category);
		expect(profile!.oneLiner).toBe(FULL_PROFILE.oneLiner);
		expect(profile!.tone).toBe(FULL_PROFILE.tone);
		expect(profile!.problem).toBe(FULL_PROFILE.problem);
		expect(profile!.mainBenefit).toBe(FULL_PROFILE.mainBenefit);
		expect(profile!.targetAudience).toBe(FULL_PROFILE.targetAudience);
		expect(profile!.pricingModel).toBe(FULL_PROFILE.pricingModel);
		expect(profile!.price).toBe(FULL_PROFILE.price);
		expect(profile!.downloadCount).toBe(FULL_PROFILE.downloadCount);

		// Array fields
		expect(profile!.keyFeatures).toEqual(FULL_PROFILE.keyFeatures);
		expect(profile!.competitors).toEqual(FULL_PROFILE.competitors);
		expect(profile!.wordsToInclude).toEqual(FULL_PROFILE.wordsToInclude);
		expect(profile!.wordsToAvoid).toEqual(FULL_PROFILE.wordsToAvoid);
		expect(profile!.painPoints).toEqual(FULL_PROFILE.painPoints);
		expect(profile!.awards).toEqual(FULL_PROFILE.awards);
		expect(profile!.excludeKeywords).toEqual(FULL_PROFILE.excludeKeywords);
		expect(profile!.mustIncludeKeywords).toEqual(FULL_PROFILE.mustIncludeKeywords);
	});

	it("empty profile survives CSV roundtrip", () => {
		const csv = exportProfileCsv(EMPTY_PROFILE);
		const { profile, errors } = parseProfileFile(csv, "empty.csv");

		expect(errors).toHaveLength(0);

		for (const value of Object.values(profile!)) {
			expect(value).toBeNull();
		}
	});
});

describe("roundtrip JSON: export → parse", () => {
	it("full profile survives JSON roundtrip", () => {
		const json = exportProfileJson(FULL_PROFILE);
		const { profile, errors } = parseProfileFile(json, "roundtrip.json");

		expect(errors).toHaveLength(0);
		expect(profile).not.toBeNull();

		for (const [key, value] of Object.entries(FULL_PROFILE)) {
			expect(profile![key as keyof AsoProfileInput]).toEqual(value);
		}
	});

	it("empty profile survives JSON roundtrip", () => {
		const json = exportProfileJson(EMPTY_PROFILE);
		const { profile, errors } = parseProfileFile(json, "empty.json");

		expect(errors).toHaveLength(0);

		for (const value of Object.values(profile!)) {
			expect(value).toBeNull();
		}
	});
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
	it("CSV: pipe in quoted string field is preserved", () => {
		const csv = 'category,oneLiner\nGames,"Edit | Enhance | Share"';
		const { profile } = parseProfileFile(csv, "test.csv");

		// oneLiner is a string field, so pipe is kept as-is
		expect(profile!.oneLiner).toBe("Edit | Enhance | Share");
	});

	it("CSV: pipe in array field splits into items", () => {
		const csv = "category,keyFeatures\nGames,A | B | C";
		const { profile } = parseProfileFile(csv, "test.csv");

		expect(profile!.keyFeatures).toEqual(["A", "B", "C"]);
	});

	it("CSV: trailing whitespace in array items is trimmed", () => {
		const csv = "keyFeatures\n  A  |  B  |  C  ";
		const { profile } = parseProfileFile(csv, "test.csv");

		expect(profile!.keyFeatures).toEqual(["A", "B", "C"]);
	});

	it("JSON: special characters in strings are preserved", () => {
		const json = JSON.stringify({
			brandVoiceExample: "Résumé: naïve über-cool 日本語",
			pressQuotes: ['"Amazing" — TechCrunch'],
		});
		const { profile } = parseProfileFile(json, "test.json");

		expect(profile!.brandVoiceExample).toBe("Résumé: naïve über-cool 日本語");
		expect(profile!.pressQuotes).toEqual(['"Amazing" — TechCrunch']);
	});

	it("file extension detection: .csv uses CSV parser", () => {
		const csv = "category\nGames";
		const { profile } = parseProfileFile(csv, "data.csv");
		expect(profile!.category).toBe("Games");
	});

	it("file extension detection: .json uses JSON parser", () => {
		const json = JSON.stringify({ category: "Games" });
		const { profile } = parseProfileFile(json, "data.json");
		expect(profile!.category).toBe("Games");
	});

	it("file extension detection: unknown extension uses CSV parser", () => {
		const csv = "category\nGames";
		const { profile } = parseProfileFile(csv, "data.txt");
		expect(profile!.category).toBe("Games");
	});

	it("partial profile import preserves only provided fields", () => {
		const json = JSON.stringify({
			category: "Games",
			tone: "Casual",
		});
		const { profile } = parseProfileFile(json, "partial.json");

		expect(profile!.category).toBe("Games");
		expect(profile!.tone).toBe("Casual");
		// Other fields are null (not undefined) — important for merge behavior
		expect(profile!.keyFeatures).toBeNull();
		expect(profile!.wordsToInclude).toBeNull();
	});
});
