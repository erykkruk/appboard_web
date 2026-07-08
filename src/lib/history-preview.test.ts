import { describe, expect, test } from "bun:test";

import { formatPreviewDate, resolvePreviewFormField } from "./history-preview";
import type { HistoryEntry } from "./types";

const IOS_FIELDS = [
	"title",
	"subtitle",
	"description",
	"keywords",
	"promotionalText",
	"whatsNew",
	"marketingUrl",
	"supportUrl",
];

const ANDROID_FIELDS = ["title", "shortDescription", "fullDescription"];

function buildEntry(overrides?: Partial<HistoryEntry>): HistoryEntry {
	return {
		id: "entry-1",
		appId: "app-1",
		language: "en-US",
		field: "title",
		createdAt: "2025-03-12T14:32:00.000Z",
		...overrides,
	};
}

describe("resolvePreviewFormField", () => {
	test("maps direct fields one-to-one", () => {
		expect(resolvePreviewFormField("title", IOS_FIELDS)).toBe("title");
		expect(resolvePreviewFormField("keywords", IOS_FIELDS)).toBe("keywords");
		expect(resolvePreviewFormField("whatsNew", IOS_FIELDS)).toBe("whatsNew");
		expect(resolvePreviewFormField("marketingUrl", IOS_FIELDS)).toBe(
			"marketingUrl",
		);
		expect(resolvePreviewFormField("supportUrl", IOS_FIELDS)).toBe(
			"supportUrl",
		);
	});

	test("maps shortDesc to subtitle on iOS", () => {
		expect(resolvePreviewFormField("shortDesc", IOS_FIELDS)).toBe("subtitle");
	});

	test("maps shortDesc to shortDescription on Android", () => {
		expect(resolvePreviewFormField("shortDesc", ANDROID_FIELDS)).toBe(
			"shortDescription",
		);
	});

	test("maps fullDesc to description on iOS", () => {
		expect(resolvePreviewFormField("fullDesc", IOS_FIELDS)).toBe(
			"description",
		);
	});

	test("maps fullDesc to fullDescription on Android", () => {
		expect(resolvePreviewFormField("fullDesc", ANDROID_FIELDS)).toBe(
			"fullDescription",
		);
	});

	test("maps promoText to promotionalText", () => {
		expect(resolvePreviewFormField("promoText", IOS_FIELDS)).toBe(
			"promotionalText",
		);
	});

	test("returns null for history fields without a form input", () => {
		expect(resolvePreviewFormField("privacyUrl", IOS_FIELDS)).toBeNull();
		expect(resolvePreviewFormField("videoUrl", IOS_FIELDS)).toBeNull();
	});

	test("returns null when the mapped field is not visible", () => {
		expect(resolvePreviewFormField("promoText", ANDROID_FIELDS)).toBeNull();
		expect(resolvePreviewFormField("keywords", ANDROID_FIELDS)).toBeNull();
	});

	test("returns null for unknown history fields", () => {
		expect(resolvePreviewFormField("somethingElse", IOS_FIELDS)).toBeNull();
	});
});

describe("formatPreviewDate", () => {
	test("formats publishedAt as date · time", () => {
		const entry = buildEntry({
			publishedAt: "2025-03-12T14:32:00.000Z",
		});
		const formatted = formatPreviewDate(entry);
		expect(formatted).toContain("2025");
		expect(formatted).toContain("·");
	});

	test("falls back to createdAt when publishedAt is missing", () => {
		const entry = buildEntry({
			createdAt: "2024-01-05T10:00:00.000Z",
			publishedAt: undefined,
		});
		expect(formatPreviewDate(entry)).toContain("2024");
	});

	test("prefers publishedAt over createdAt", () => {
		const entry = buildEntry({
			createdAt: "2024-01-05T10:00:00.000Z",
			publishedAt: "2025-03-12T14:32:00.000Z",
		});
		expect(formatPreviewDate(entry)).toContain("2025");
	});
});
