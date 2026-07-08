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
	test("joins multiple sizes with 'or'", () => {
		expect(
			formatSupportedDimensions([
				[1290, 2796],
				[2796, 1290],
			]),
		).toBe("1290×2796 or 2796×1290");
	});

	test("renders a single supported size without separator", () => {
		expect(formatSupportedDimensions([[1284, 2778]])).toBe("1284×2778");
	});
});

describe("buildDimensionMessage", () => {
	test("prefers the backend-provided suggestion when present", () => {
		const message = buildDimensionMessage({
			displayTypeName: "Android phone",
			providedDimensions: [200, 400],
			suggestion:
				"Android phone screenshots can be any size between 320px and 3840px per side with an aspect ratio of at most 2:1.",
			supportedDimensions: [[1284, 2778]],
		});
		expect(message).toBe(
			"Android phone screenshots can be any size between 320px and 3840px per side with an aspect ratio of at most 2:1.",
		);
	});

	test("builds an English message naming device, provided and accepted sizes when no suggestion", () => {
		const message = buildDimensionMessage({
			displayTypeName: 'iPhone 6.7"',
			providedDimensions: [1000, 2000],
			supportedDimensions: [
				[1290, 2796],
				[2796, 1290],
			],
		});
		expect(message).toBe(
			'Invalid dimensions for iPhone 6.7": provided 1000×2000px, expected 1290×2796 or 2796×1290px.',
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

	test("returns the backend suggestion when dimensions are invalid", () => {
		const result: ScreenshotValidationResult = {
			displayType: "phone",
			displayTypeName: "Android phone",
			providedDimensions: [800, 1600],
			supportedDimensions: [[1284, 2778]],
			suggestion: "Android phone expects 1284x2778; you provided 800x1600.",
			valid: false,
		};
		expect(buildValidationWarning(result)).toBe(
			"Android phone expects 1284x2778; you provided 800x1600.",
		);
	});

	test("falls back to an English message when the suggestion is empty", () => {
		const result: ScreenshotValidationResult = {
			displayType: "phone",
			displayTypeName: "Android phone",
			providedDimensions: [800, 1600],
			supportedDimensions: [[1284, 2778]],
			suggestion: "",
			valid: false,
		};
		expect(buildValidationWarning(result)).toBe(
			"Invalid dimensions for Android phone: provided 800×1600px, expected 1284×2778px.",
		);
	});
});
