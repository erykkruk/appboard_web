import type {
	SceneData,
	SceneTextAnnotation,
	SceneTextLayer,
} from "@/lib/types";

/** Translated text keyed by source text-layer or annotation id. */
export type LayerTranslations = Record<string, string>;

/**
 * Build a language variant of `sourceScene` by replacing each text layer's and
 * text annotation's text with its entry from `translations` (keyed by id).
 * Items flagged `doNotTranslate` — and any item missing a translation — keep
 * their original text verbatim. Image annotations carry no text and are copied
 * as-is. All other scene properties (background, device, screenshot,
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
	const translate = (id: string, original: string, skip?: boolean): string => {
		if (skip) return original;
		const translated = translations[id];
		if (typeof translated !== "string" || translated.trim() === "") {
			return original;
		}
		return translated;
	};

	return {
		...sourceScene,
		textLayers: sourceScene.textLayers.map((layer) => ({
			...layer,
			text: translate(layer.id, layer.text, layer.doNotTranslate),
		})),
		annotations: sourceScene.annotations?.map((annotation) =>
			annotation.type === "image"
				? { ...annotation }
				: {
						...annotation,
						text: translate(
							annotation.id,
							annotation.text,
							annotation.doNotTranslate,
						),
					},
		),
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

/**
 * The annotations that should be sent to the translator: text-bearing variants
 * (callout/badge/label) with non-empty text and no Do-Not-Translate flag.
 * Image annotations are never translatable.
 */
export function translatableAnnotations(
	scene: SceneData,
): SceneTextAnnotation[] {
	return (scene.annotations ?? []).filter(
		(annotation): annotation is SceneTextAnnotation =>
			annotation.type !== "image" &&
			!annotation.doNotTranslate &&
			annotation.text.trim() !== "",
	);
}
