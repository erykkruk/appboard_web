import { describe, expect, test } from "bun:test";

import { getTargetDimensions } from "@/lib/screenshot-editor";
import { SCENE_SET_TEMPLATES } from "@/lib/scene-set-templates";

const DISPLAY_TYPES = ["APP_IPHONE_67", "APP_IPAD_PRO_129", "phone"];

describe("SCENE_SET_TEMPLATES", () => {
	test("every set has 7 uniquely named screens", () => {
		for (const set of SCENE_SET_TEMPLATES) {
			expect(set.screens.length).toBe(7);
			const names = new Set(set.screens.map((s) => s.name));
			expect(names.size).toBe(7);
		}
	});

	test("set ids are unique", () => {
		const ids = new Set(SCENE_SET_TEMPLATES.map((s) => s.id));
		expect(ids.size).toBe(SCENE_SET_TEMPLATES.length);
	});

	test("every screen builds a valid scene for iOS and Android targets", () => {
		for (const displayType of DISPLAY_TYPES) {
			const [w, h] = getTargetDimensions(displayType);
			for (const set of SCENE_SET_TEMPLATES) {
				for (const screen of set.screens) {
					const scene = screen.build(displayType);
					expect(scene.width).toBe(w);
					expect(scene.height).toBe(h);
					expect(scene.textLayers.length).toBeGreaterThan(0);
					expect(scene.device?.groundShadow).toBe(true);
				}
			}
		}
	});

	test("screens within a set share the theme's headline color", () => {
		for (const set of SCENE_SET_TEMPLATES) {
			const colors = new Set(
				set.screens.map(
					(screen) =>
						screen.build("APP_IPHONE_67").textLayers[0]?.color ?? "missing",
				),
			);
			expect(colors.size).toBe(1);
		}
	});
});
