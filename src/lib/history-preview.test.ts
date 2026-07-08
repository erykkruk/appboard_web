import { describe, expect, test } from "bun:test";

import {
	computeChangesSinceDate,
	formatPreviewDate,
	listChangeDates,
	resolvePreviewFormField,
} from "./history-preview";
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

// Local-time ISO string so calendar-day grouping is timezone-stable in tests
function localIso(
	year: number,
	month: number,
	day: number,
	hour = 12,
	minute = 0,
): string {
	return new Date(year, month - 1, day, hour, minute).toISOString();
}

describe("listChangeDates", () => {
	test("returns distinct local days, newest first, with counts", () => {
		const entries: HistoryEntry[] = [
			buildEntry({ id: "1", createdAt: localIso(2025, 3, 12, 9) }),
			buildEntry({ id: "2", createdAt: localIso(2025, 3, 12, 17) }),
			buildEntry({ id: "3", createdAt: localIso(2025, 3, 10, 11) }),
		];

		const days = listChangeDates(entries);

		expect(days).toHaveLength(2);
		expect(days[0].date.getDate()).toBe(12);
		expect(days[0].count).toBe(2);
		expect(days[1].date.getDate()).toBe(10);
		expect(days[1].count).toBe(1);
	});

	test("uses publishedAt over createdAt for the day", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				createdAt: localIso(2025, 3, 10, 9),
				publishedAt: localIso(2025, 3, 12, 9),
			}),
		];

		const days = listChangeDates(entries);

		expect(days).toHaveLength(1);
		expect(days[0].date.getDate()).toBe(12);
	});

	test("returns empty array for no entries", () => {
		expect(listChangeDates([])).toEqual([]);
	});
});

describe("computeChangesSinceDate", () => {
	const since = new Date(2025, 2, 10); // local midnight, Mar 10 2025

	test("uses oldValue of the OLDEST entry at/after the date", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				id: "newer",
				field: "title",
				oldValue: "B",
				newValue: "C",
				createdAt: localIso(2025, 3, 14),
			}),
			buildEntry({
				id: "older",
				field: "title",
				oldValue: "A",
				newValue: "B",
				createdAt: localIso(2025, 3, 11),
			}),
		];

		const changes = computeChangesSinceDate(entries, since, () => "C");

		expect(changes).toHaveLength(1);
		expect(changes[0].thenValue).toBe("A");
		expect(changes[0].todayValue).toBe("C");
	});

	test("ignores entries before the date when picking the oldest", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				id: "before",
				field: "title",
				oldValue: "ancient",
				newValue: "A",
				createdAt: localIso(2025, 3, 1),
			}),
			buildEntry({
				id: "after",
				field: "title",
				oldValue: "A",
				newValue: "B",
				createdAt: localIso(2025, 3, 11),
			}),
		];

		const changes = computeChangesSinceDate(entries, since, () => "B");

		expect(changes).toHaveLength(1);
		expect(changes[0].thenValue).toBe("A");
	});

	test("skips pairs with no entries at/after the date", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				field: "title",
				oldValue: "A",
				newValue: "B",
				createdAt: localIso(2025, 3, 1),
			}),
		];

		expect(computeChangesSinceDate(entries, since, () => "B")).toEqual([]);
	});

	test("skips pairs changed back and forth (then equals today)", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				id: "1",
				field: "title",
				oldValue: "A",
				newValue: "B",
				createdAt: localIso(2025, 3, 11),
			}),
			buildEntry({
				id: "2",
				field: "title",
				oldValue: "B",
				newValue: "A",
				createdAt: localIso(2025, 3, 12),
			}),
		];

		expect(computeChangesSinceDate(entries, since, () => "A")).toEqual([]);
	});

	test("handles multiple languages and sorts by language then field", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				id: "1",
				language: "pl",
				field: "title",
				oldValue: "Stary",
				newValue: "Nowy",
				createdAt: localIso(2025, 3, 11),
			}),
			buildEntry({
				id: "2",
				language: "en-US",
				field: "whatsNew",
				oldValue: "old notes",
				newValue: "new notes",
				createdAt: localIso(2025, 3, 11),
			}),
			buildEntry({
				id: "3",
				language: "en-US",
				field: "keywords",
				oldValue: "a,b",
				newValue: "a,b,c",
				createdAt: localIso(2025, 3, 12),
			}),
		];

		const changes = computeChangesSinceDate(entries, since, () => "today");

		expect(changes.map((c) => `${c.language}:${c.field}`)).toEqual([
			"en-US:keywords",
			"en-US:whatsNew",
			"pl:title",
		]);
		expect(changes[2].thenValue).toBe("Stary");
	});

	test("falls back to latest newValue when getTodayValue returns null", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				id: "1",
				field: "privacyUrl",
				oldValue: "https://old.example",
				newValue: "https://mid.example",
				createdAt: localIso(2025, 3, 11),
			}),
			buildEntry({
				id: "2",
				field: "privacyUrl",
				oldValue: "https://mid.example",
				newValue: "https://new.example",
				createdAt: localIso(2025, 3, 13),
			}),
		];

		const changes = computeChangesSinceDate(entries, since, () => null);

		expect(changes).toHaveLength(1);
		expect(changes[0].thenValue).toBe("https://old.example");
		expect(changes[0].todayValue).toBe("https://new.example");
	});

	test("treats missing oldValue as empty string", () => {
		const entries: HistoryEntry[] = [
			buildEntry({
				field: "title",
				oldValue: undefined,
				newValue: "Set",
				createdAt: localIso(2025, 3, 11),
			}),
		];

		const changes = computeChangesSinceDate(entries, since, () => "Set");

		expect(changes).toHaveLength(1);
		expect(changes[0].thenValue).toBe("");
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
