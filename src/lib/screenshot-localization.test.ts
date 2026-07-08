import { describe, expect, test } from "bun:test";

import {
	buildTranslatedScene,
	translatableAnnotations,
	translatableLayers,
} from "@/lib/screenshot-localization";
import type { SceneAnnotation, SceneData } from "@/lib/types";

function sceneWithLayers(): SceneData {
	return {
		background: { type: "color", value: "#000" },
		device: { frame: "iphone", offsetX: 0, offsetY: 0.12, scale: 0.72 },
		height: 2796,
		textLayers: [
			{
				align: "center",
				color: "#fff",
				fontFamily: "sans",
				fontSize: 80,
				id: "headline",
				text: "Your headline",
				x: 0.5,
				y: 0.08,
			},
			{
				align: "center",
				color: "#fff",
				doNotTranslate: true,
				fontFamily: "sans",
				fontSize: 60,
				id: "brand",
				text: "AppBoard",
				x: 0.5,
				y: 0.2,
			},
			{
				align: "center",
				color: "#fff",
				fontFamily: "sans",
				fontSize: 40,
				id: "empty",
				text: "   ",
				x: 0.5,
				y: 0.3,
			},
		],
		width: 1290,
	};
}

describe("buildTranslatedScene", () => {
	test("replaces translatable layers and preserves Do-Not-Translate layers", () => {
		const source = sceneWithLayers();
		const result = buildTranslatedScene(source, {
			empty: "powinno zostać pominięte",
			headline: "Twój nagłówek",
		});

		const byId = Object.fromEntries(result.textLayers.map((l) => [l.id, l]));
		expect(byId.headline.text).toBe("Twój nagłówek");
		// DNT layer kept verbatim even though no translation was supplied.
		expect(byId.brand.text).toBe("AppBoard");
		expect(byId.brand.doNotTranslate).toBe(true);
	});

	test("keeps the original text when a translation is missing or blank", () => {
		const source = sceneWithLayers();
		const result = buildTranslatedScene(source, { headline: "   " });
		const headline = result.textLayers.find((l) => l.id === "headline");
		expect(headline?.text).toBe("Your headline");
	});

	test("carries over all non-text scene properties unchanged", () => {
		const source = sceneWithLayers();
		const result = buildTranslatedScene(source, { headline: "X" });
		expect(result.width).toBe(source.width);
		expect(result.height).toBe(source.height);
		expect(result.background).toEqual(source.background);
		expect(result.device).toEqual(source.device);
	});

	test("does not mutate the source scene", () => {
		const source = sceneWithLayers();
		buildTranslatedScene(source, { headline: "Zmienione" });
		expect(source.textLayers[0].text).toBe("Your headline");
	});
});

describe("translatableLayers", () => {
	test("excludes Do-Not-Translate and blank-text layers", () => {
		const ids = translatableLayers(sceneWithLayers()).map((l) => l.id);
		expect(ids).toEqual(["headline"]);
	});
});

function sceneAnnotations(): SceneAnnotation[] {
	return [
		{
			bg: "#f00",
			color: "#fff",
			fontSize: 60,
			id: "badge",
			text: "NEW",
			type: "badge",
			x: 0.5,
			y: 0.3,
		},
		{
			bg: "#000",
			color: "#fff",
			doNotTranslate: true,
			fontSize: 50,
			id: "brand-label",
			text: "AppBoard",
			type: "label",
			x: 0.5,
			y: 0.4,
		},
		{
			aspect: 1,
			id: "logo",
			type: "image",
			url: "data:image/png;base64,xyz",
			width: 0.3,
			x: 0.5,
			y: 0.6,
		},
	];
}

function sceneWithAnnotations(): SceneData {
	return { ...sceneWithLayers(), annotations: sceneAnnotations() };
}

describe("buildTranslatedScene — annotations", () => {
	test("translates text annotations keyed by id", () => {
		const result = buildTranslatedScene(sceneWithAnnotations(), {
			badge: "NOWOŚĆ",
		});
		const badge = result.annotations?.find((a) => a.id === "badge");
		expect(badge?.type).toBe("badge");
		if (badge && badge.type !== "image") {
			expect(badge.text).toBe("NOWOŚĆ");
		}
	});

	test("keeps Do-Not-Translate annotations verbatim", () => {
		const result = buildTranslatedScene(sceneWithAnnotations(), {
			"brand-label": "przetłumaczone",
		});
		const label = result.annotations?.find((a) => a.id === "brand-label");
		if (label && label.type !== "image") {
			expect(label.text).toBe("AppBoard");
		} else {
			throw new Error("expected the label annotation");
		}
	});

	test("copies image annotations unchanged and never crashes on them", () => {
		const result = buildTranslatedScene(sceneWithAnnotations(), {
			logo: "should be ignored",
		});
		const logo = result.annotations?.find((a) => a.id === "logo");
		expect(logo).toEqual(sceneAnnotations()[2]);
	});

	test("keeps a scene without annotations working (backward compat)", () => {
		const result = buildTranslatedScene(sceneWithLayers(), { headline: "X" });
		expect(result.annotations).toBeUndefined();
	});

	test("does not mutate the source annotations", () => {
		const source = sceneWithAnnotations();
		buildTranslatedScene(source, { badge: "Zmienione" });
		const badge = source.annotations?.find((a) => a.id === "badge");
		if (badge && badge.type !== "image") {
			expect(badge.text).toBe("NEW");
		}
	});
});

describe("translatableAnnotations", () => {
	test("excludes Do-Not-Translate and image annotations", () => {
		const ids = translatableAnnotations(sceneWithAnnotations()).map(
			(a) => a.id,
		);
		expect(ids).toEqual(["badge"]);
	});

	test("returns an empty list for scenes without annotations", () => {
		expect(translatableAnnotations(sceneWithLayers())).toEqual([]);
	});
});
