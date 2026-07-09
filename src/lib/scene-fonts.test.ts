import { describe, expect, test } from "bun:test";

import {
	dedupeFontFamily,
	googleFontCssUrl,
	sanitizeFontFamilyName,
} from "@/lib/scene-fonts";

describe("sanitizeFontFamilyName", () => {
	test("strips the font file extension", () => {
		expect(sanitizeFontFamilyName("Montserrat-Bold.ttf")).toBe(
			"Montserrat-Bold",
		);
		expect(sanitizeFontFamilyName("Inter.woff2")).toBe("Inter");
		expect(sanitizeFontFamilyName("Lato.OTF")).toBe("Lato");
	});

	test("replaces unsafe characters and collapses whitespace", () => {
		expect(sanitizeFontFamilyName("My @Font! (v2).otf")).toBe("My Font v2");
	});

	test("falls back to a default when nothing survives", () => {
		expect(sanitizeFontFamilyName("###.ttf")).toBe("Custom Font");
	});
});

describe("dedupeFontFamily", () => {
	test("returns the base name when unused", () => {
		expect(dedupeFontFamily("Lato", ["Inter"])).toBe("Lato");
	});

	test("appends a numeric suffix on collision (case-insensitive)", () => {
		expect(dedupeFontFamily("Lato", ["lato"])).toBe("Lato 2");
		expect(dedupeFontFamily("Lato", ["Lato", "Lato 2"])).toBe("Lato 3");
	});
});

describe("googleFontCssUrl", () => {
	test("encodes spaces as + and appends display=swap", () => {
		expect(googleFontCssUrl("Luckiest Guy")).toBe(
			"https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap",
		);
	});

	test("pins a single weight via the wght axis", () => {
		expect(googleFontCssUrl("Inter", 700)).toBe(
			"https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap",
		);
	});

	test("trims surrounding whitespace", () => {
		expect(googleFontCssUrl("  Lobster  ")).toBe(
			"https://fonts.googleapis.com/css2?family=Lobster&display=swap",
		);
	});
});
