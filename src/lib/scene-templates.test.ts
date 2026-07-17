import { describe, expect, test } from "bun:test";

import { applyPanelCount, getTargetDimensions } from "@/lib/screenshot-editor";
import { applyTemplate, SCENE_TEMPLATES } from "@/lib/scene-templates";

const DISPLAY_TYPES = ["APP_IPHONE_67", "APP_IPAD_PRO_129", "phone", "tenInch"];

describe("SCENE_TEMPLATES", () => {
	test("ids and names are unique", () => {
		expect(new Set(SCENE_TEMPLATES.map((t) => t.id)).size).toBe(
			SCENE_TEMPLATES.length,
		);
		expect(new Set(SCENE_TEMPLATES.map((t) => t.name)).size).toBe(
			SCENE_TEMPLATES.length,
		);
	});

	test("every template builds a valid scene for iOS and Android targets", () => {
		for (const displayType of DISPLAY_TYPES) {
			const [w, h] = getTargetDimensions(displayType);
			for (const template of SCENE_TEMPLATES) {
				const scene = template.build(displayType);
				expect(scene.height).toBe(h);
				// Width is the target width times the panel count.
				expect(scene.width % w).toBe(0);
				expect(scene.width / w).toBe(scene.panels ?? 1);
				expect(scene.textLayers.length).toBeGreaterThan(0);
				expect(scene.background.value).toBeTruthy();
			}
		}
	});

	test("panorama template spans two panels", () => {
		const panorama = SCENE_TEMPLATES.find((t) => t.id === "panorama-duo");
		const scene = panorama?.build("APP_IPHONE_67");
		expect(scene?.panels).toBe(2);
		expect(scene?.width).toBe(1290 * 2);
	});
});

describe("applyTemplate", () => {
	test("keeps the current screenshot and fonts", () => {
		const template = SCENE_TEMPLATES[0];
		const current = template.build("APP_IPHONE_67");
		current.screenshot = { url: "data:image/png;base64,abc" };
		current.customFonts = [{ dataUrl: "data:font/ttf;base64,x", family: "My" }];
		current.googleFonts = ["Luckiest Guy"];
		const next = applyTemplate(SCENE_TEMPLATES[1], current, "APP_IPHONE_67");
		expect(next.screenshot?.url).toBe("data:image/png;base64,abc");
		expect(next.customFonts?.[0].family).toBe("My");
		expect(next.googleFonts).toEqual(["Luckiest Guy"]);
		// Layout comes from the new template, not the old scene.
		expect(next.background).toEqual(
			SCENE_TEMPLATES[1].build("APP_IPHONE_67").background,
		);
	});
});

describe("applyTemplate (panorama-aware)", () => {
	function panoramaCurrent(panels: number) {
		const base = SCENE_TEMPLATES[0].build("APP_IPHONE_67");
		return applyPanelCount(base, "APP_IPHONE_67", panels);
	}

	test("keeps the current panel count and canvas width", () => {
		const next = applyTemplate(
			SCENE_TEMPLATES.find((t) => t.id === "ascent-topo")!,
			panoramaCurrent(5),
			"APP_IPHONE_67",
		);
		expect(next.panels).toBe(5);
		expect(next.width).toBe(1290 * 5);
		expect(next.height).toBe(2796);
	});

	test("replicates text layers onto every panel with unique ids", () => {
		const template = SCENE_TEMPLATES.find((t) => t.id === "ascent-topo")!;
		const perPanel = template.build("APP_IPHONE_67").textLayers.length;
		const next = applyTemplate(template, panoramaCurrent(5), "APP_IPHONE_67");
		expect(next.textLayers.length).toBe(perPanel * 5);
		expect(new Set(next.textLayers.map((l) => l.id)).size).toBe(
			next.textLayers.length,
		);
		// Panel centers: x of the first layer's copies land at (p + x0) / 5.
		const x0 = template.build("APP_IPHONE_67").textLayers[0].x;
		const xs = next.textLayers.map((l) => l.x);
		expect(xs).toContain((0 + x0) / 5);
		expect(xs).toContain((4 + x0) / 5);
	});

	test("centers the device on the middle panel (odd panel count)", () => {
		const next = applyTemplate(
			SCENE_TEMPLATES.find((t) => t.id === "minimal-dark")!,
			panoramaCurrent(5),
			"APP_IPHONE_67",
		);
		// Template offsetX 0 → center panel of 5 is index 2 → full-canvas center.
		expect(next.device?.offsetX ?? 0).toBeCloseTo(0);
		const four = applyTemplate(
			SCENE_TEMPLATES.find((t) => t.id === "minimal-dark")!,
			panoramaCurrent(4),
			"APP_IPHONE_67",
		);
		// Center panel of 4 is index 1 → its middle sits at -0.125 of the canvas.
		expect(four.device?.offsetX ?? 0).toBeCloseTo(-0.125);
	});

	test("panorama-native templates are not re-adapted", () => {
		const duo = SCENE_TEMPLATES.find((t) => t.id === "panorama-duo")!;
		const next = applyTemplate(duo, panoramaCurrent(5), "APP_IPHONE_67");
		expect(next.panels).toBe(2);
		expect(next.width).toBe(1290 * 2);
	});

	test("single-panel current scenes keep the plain template", () => {
		const template = SCENE_TEMPLATES.find((t) => t.id === "ascent-topo")!;
		const single = template.build("APP_IPHONE_67");
		const next = applyTemplate(template, single, "APP_IPHONE_67");
		expect(next.panels ?? 1).toBe(1);
		expect(next.textLayers.length).toBe(single.textLayers.length);
	});
});
