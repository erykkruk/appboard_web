import { describe, expect, test } from "bun:test";

import {
	buildDimensionMessage,
	buildValidationWarning,
	formatDimensions,
	formatSupportedDimensions,
} from "./screenshot-validation";
import type { ScreenshotValidationResult } from "./types";

describe("formatDimensions", () => {
	test("formats a single pair with the multiplication sign", () => {
		expect(formatDimensions([1000, 2000])).toBe("1000×2000");
	});
});

describe("formatSupportedDimensions", () => {
	test("joins multiple sizes with 'lub'", () => {
		expect(
			formatSupportedDimensions([
				[1290, 2796],
				[2796, 1290],
			]),
		).toBe("1290×2796 lub 2796×1290");
	});

	test("renders a single supported size without separator", () => {
		expect(formatSupportedDimensions([[1284, 2778]])).toBe("1284×2778");
	});
});

describe("buildDimensionMessage", () => {
	test("names the device, provided size and accepted sizes", () => {
		const message = buildDimensionMessage({
			displayTypeName: 'iPhone 6.7"',
			providedDimensions: [1000, 2000],
			supportedDimensions: [
				[1290, 2796],
				[2796, 1290],
			],
		});
		expect(message).toBe(
			'Nieprawidłowy rozmiar dla iPhone 6.7": podano 1000×2000px, oczekiwano 1290×2796 lub 2796×1290px.',
		);
	});
});

describe("buildValidationWarning", () => {
	test("returns null when dimensions are valid", () => {
		const result: ScreenshotValidationResult = {
			displayType: "APP_IPHONE_67",
			displayTypeName: 'iPhone 6.7"',
			providedDimensions: [1290, 2796],
			supportedDimensions: [[1290, 2796]],
			suggestion: 'iPhone 6.7" accepts 1290x2796.',
			valid: true,
		};
		expect(buildValidationWarning(result)).toBeNull();
	});

	test("returns an actionable message when dimensions are invalid", () => {
		const result: ScreenshotValidationResult = {
			displayType: "phone",
			displayTypeName: "Android phone",
			providedDimensions: [800, 1600],
			supportedDimensions: [[1284, 2778]],
			suggestion: "Android phone expects 1284x2778; you provided 800x1600.",
			valid: false,
		};
		expect(buildValidationWarning(result)).toBe(
			"Nieprawidłowy rozmiar dla Android phone: podano 800×1600px, oczekiwano 1284×2778px.",
		);
	});
});
