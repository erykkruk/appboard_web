import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";

import type { SceneData } from "@/lib/types";

// --- Mock the API client used by the scene localizer ---

const translate = mock(
	async ({
		text,
		targetLanguages,
	}: {
		text: string;
		targetLanguages: string[];
	}) => ({
		model: "test",
		translations: Object.fromEntries(
			targetLanguages.map((lang) => [lang, `${text} [${lang}]`]),
		),
	}),
);

mock.module("@/lib/api", () => ({
	api: { ai: { translate } },
}));

const { useSceneLocalization } = await import("@/hooks/use-scene-localization");

function buildScene(): SceneData {
	return {
		background: { type: "color", value: "#000" },
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
		],
		width: 1290,
	};
}

beforeEach(() => {
	translate.mockClear();
});

afterEach(() => {
	translate.mockReset();
	translate.mockImplementation(
		async ({
			text,
			targetLanguages,
		}: {
			text: string;
			targetLanguages: string[];
		}) => ({
			model: "test",
			translations: Object.fromEntries(
				targetLanguages.map((lang) => [lang, `${text} [${lang}]`]),
			),
		}),
	);
});

describe("useSceneLocalization", () => {
	test("builds a done variant per language with translated headline", async () => {
		const { result } = renderHook(() => useSceneLocalization());

		await act(async () => {
			await result.current.run(buildScene(), ["pl", "de-DE"]);
		});

		await waitFor(() => expect(result.current.isRunning).toBe(false));

		expect(result.current.variants.pl?.stage).toBe("done");
		expect(result.current.variants["de-DE"]?.stage).toBe("done");

		const plHeadline = result.current.variants.pl?.scene?.textLayers.find(
			(l) => l.id === "headline",
		);
		expect(plHeadline?.text).toBe("Your headline [pl]");
	});

	test("never sends Do-Not-Translate layers and keeps them verbatim", async () => {
		const { result } = renderHook(() => useSceneLocalization());

		await act(async () => {
			await result.current.run(buildScene(), ["pl"]);
		});
		await waitFor(() => expect(result.current.variants.pl?.stage).toBe("done"));

		// Only the headline layer is translatable, so exactly one call per language.
		expect(translate).toHaveBeenCalledTimes(1);
		const sentTexts = translate.mock.calls.map((c) => c[0].text);
		expect(sentTexts).not.toContain("AppBoard");

		const brand = result.current.variants.pl?.scene?.textLayers.find(
			(l) => l.id === "brand",
		);
		expect(brand?.text).toBe("AppBoard");
	});

	test("isolates a failing language while the others succeed", async () => {
		translate.mockImplementation(
			async ({ targetLanguages }: { targetLanguages: string[] }) => {
				if (targetLanguages.includes("pl")) {
					throw new Error("AI unavailable");
				}
				return {
					model: "test",
					translations: Object.fromEntries(
						targetLanguages.map((lang) => [lang, `ok [${lang}]`]),
					),
				};
			},
		);

		const { result } = renderHook(() => useSceneLocalization());

		await act(async () => {
			await result.current.run(buildScene(), ["pl", "de-DE"]);
		});
		await waitFor(() => expect(result.current.isRunning).toBe(false));

		expect(result.current.variants.pl?.stage).toBe("error");
		expect(result.current.variants.pl?.error).toBe("AI unavailable");
		expect(result.current.variants.pl?.scene).toBeNull();
		expect(result.current.variants["de-DE"]?.stage).toBe("done");
	});

	test("reset clears all variants", async () => {
		const { result } = renderHook(() => useSceneLocalization());

		await act(async () => {
			await result.current.run(buildScene(), ["pl"]);
		});
		act(() => result.current.reset());

		expect(Object.keys(result.current.variants)).toHaveLength(0);
	});
});
