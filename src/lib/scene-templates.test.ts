import { describe, expect, test } from "bun:test";

import { getTargetDimensions } from "@/lib/screenshot-editor";
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
