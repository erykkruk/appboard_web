"use client";

import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import {
	buildTranslatedScene,
	type LayerTranslations,
	translatableAnnotations,
	translatableLayers,
} from "@/lib/screenshot-localization";
import type { SceneData } from "@/lib/types";

export type VariantStage = "pending" | "translating" | "done" | "error";

export interface LanguageVariant {
	language: string;
	stage: VariantStage;
	/** The translated variant scene, available once `stage === "done"`. */
	scene: SceneData | null;
	error: string | null;
}

type VariantMap = Record<string, LanguageVariant>;

function initialVariant(language: string): LanguageVariant {
	return { error: null, language, scene: null, stage: "pending" };
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

/**
 * Orchestrates "generate language variants" for an on-image-text scene: for each
 * target language, every translatable text layer is translated and a variant
 * scene is assembled (Do-Not-Translate layers kept verbatim by
 * {@link buildTranslatedScene}). Each language runs independently so a single
 * failure is isolated and the rest continue — mirroring the localization
 * pipeline's per-language state machine. Persistence is left to the caller.
 */
export function useSceneLocalization() {
	const [variants, setVariants] = useState<VariantMap>({});
	const [isRunning, setIsRunning] = useState(false);

	const reset = useCallback(() => {
		setVariants({});
		setIsRunning(false);
	}, []);

	const patchVariant = useCallback(
		(language: string, patch: Partial<LanguageVariant>) => {
			setVariants((prev) => {
				const current = prev[language] ?? initialVariant(language);
				return { ...prev, [language]: { ...current, ...patch } };
			});
		},
		[],
	);

	const runForLanguage = useCallback(
		async (sourceScene: SceneData, targetLanguage: string) => {
			patchVariant(targetLanguage, {
				error: null,
				scene: null,
				stage: "translating",
			});

			try {
				// Text layers and text annotations translate the same way; both
				// are keyed by id in the translations map.
				const items = [
					...translatableLayers(sourceScene),
					...translatableAnnotations(sourceScene),
				];
				const translations: LayerTranslations = {};

				// One translate call per item, scoped to this single target
				// language, so a failure on one language never affects the others.
				for (const item of items) {
					const { translations: byLanguage } = await api.ai.translate({
						targetLanguages: [targetLanguage],
						text: item.text,
					});
					const translated = byLanguage?.[targetLanguage];
					if (typeof translated === "string" && translated.trim()) {
						translations[item.id] = translated.trim();
					}
				}

				const scene = buildTranslatedScene(sourceScene, translations);
				patchVariant(targetLanguage, { scene, stage: "done" });
				return true;
			} catch (error) {
				patchVariant(targetLanguage, {
					error: errorMessage(error, "Translation failed"),
					stage: "error",
				});
				return false;
			}
		},
		[patchVariant],
	);

	const run = useCallback(
		async (sourceScene: SceneData, targetLanguages: string[]) => {
			setIsRunning(true);
			setVariants(() => {
				const next: VariantMap = {};
				for (const language of targetLanguages) {
					next[language] = initialVariant(language);
				}
				return next;
			});

			// Sequential per language keeps AI request volume predictable and
			// surfaces progress one language at a time.
			for (const language of targetLanguages) {
				await runForLanguage(sourceScene, language);
			}

			setIsRunning(false);
		},
		[runForLanguage],
	);

	return { isRunning, reset, run, variants };
}
