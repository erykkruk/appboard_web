import { describe, expect, test } from "bun:test";

import { dedupeFontFamily, sanitizeFontFamilyName } from "@/lib/scene-fonts";

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
