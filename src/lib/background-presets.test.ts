import { describe, expect, test } from "bun:test";

import {
	BACKGROUND_PRESETS,
	cssPreviewForBackground,
} from "@/lib/background-presets";

describe("BACKGROUND_PRESETS", () => {
	test("every preset has a unique name and a valid background", () => {
		const names = new Set(BACKGROUND_PRESETS.map((p) => p.name));
		expect(names.size).toBe(BACKGROUND_PRESETS.length);
		for (const preset of BACKGROUND_PRESETS) {
			expect(preset.background.value).toBeTruthy();
			if (preset.background.type === "gradient") {
				expect(preset.background.gradient).toBeTruthy();
			}
			if (preset.background.gradientType === "mesh") {
				expect(preset.background.mesh?.length ?? 0).toBeGreaterThan(0);
			}
			if (preset.background.pattern) {
				expect(preset.background.pattern.opacity).toBeGreaterThan(0);
				expect(preset.background.pattern.opacity).toBeLessThanOrEqual(1);
				expect(preset.background.pattern.scale).toBeGreaterThan(0);
			}
		}
	});
});

describe("cssPreviewForBackground", () => {
	test("solid color returns the color", () => {
		expect(cssPreviewForBackground({ type: "color", value: "#112233" })).toBe(
			"#112233",
		);
	});

	test("linear gradient renders a linear-gradient()", () => {
		const css = cssPreviewForBackground({
			gradient: { angle: 135, from: "#000000", to: "#ffffff" },
			type: "gradient",
			value: "#000000",
		});
		expect(css).toContain("linear-gradient(225deg");
		expect(css).toContain("#000000");
		expect(css).toContain("#ffffff");
	});

	test("mesh renders one radial layer per blob plus the base", () => {
		const css = cssPreviewForBackground({
			gradient: { angle: 0, from: "#111111", to: "#222222" },
			gradientType: "mesh",
			mesh: ["#aa0000", "#00bb00"],
			type: "gradient",
			value: "#111111",
		});
		expect(css.match(/radial-gradient/g)?.length).toBe(2);
		expect(css.endsWith("#111111")).toBe(true);
	});

	test("every preset produces a non-empty preview", () => {
		for (const preset of BACKGROUND_PRESETS) {
			expect(cssPreviewForBackground(preset.background).length).toBeGreaterThan(
				3,
			);
		}
	});
});
