import type { SceneData, SceneTextLayer } from "@/lib/types";

/** Translated text keyed by source text-layer id. */
export type LayerTranslations = Record<string, string>;

/**
 * Build a language variant of `sourceScene` by replacing each text layer's text
 * with its entry from `translations` (keyed by layer id). Layers flagged
 * `doNotTranslate` — and any layer missing a translation — keep their original
 * text verbatim. All other scene properties (background, device, screenshot,
 * positions, styling) are carried over unchanged.
 *
 * Pure and synchronous so it can be unit-tested without touching the network or
 * the AI endpoint. The returned scene is a fresh object; the source is not
 * mutated.
 */
export function buildTranslatedScene(
	sourceScene: SceneData,
	translations: LayerTranslations,
): SceneData {
	return {
		...sourceScene,
		textLayers: sourceScene.textLayers.map((layer) => {
			if (layer.doNotTranslate) return { ...layer };
			const translated = translations[layer.id];
			if (typeof translated !== "string" || translated.trim() === "") {
				return { ...layer };
			}
			return { ...layer, text: translated };
		}),
	};
}

/**
 * The text layers that should be sent to the translator: non-empty text and not
 * flagged Do Not Translate. Layers the user wants preserved verbatim never leave
 * the client.
 */
export function translatableLayers(scene: SceneData): SceneTextLayer[] {
	return scene.textLayers.filter(
		(layer) => !layer.doNotTranslate && layer.text.trim() !== "",
	);
}
