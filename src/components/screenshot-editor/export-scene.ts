import { getDeviceBezel } from "@/lib/device-bezels";
import { ensureSceneFontsLoaded } from "@/lib/scene-fonts";
import { computeDeviceRect } from "@/lib/screenshot-editor";
import type { SceneData } from "@/lib/types";

import { type RenderImage, type RenderImages, renderScene } from "./render-scene";

function isLocalSource(src: string): boolean {
	return src.startsWith("data:") || src.startsWith("blob:");
}

/**
 * Decode a single image source into a {@link RenderImage}. Mirrors the
 * taint-aware loading in `use-scene-images.ts` (local data/blob URLs request no
 * CORS; remote URLs request it so the canvas stays exportable). Resolves to null
 * on failure so a missing image never blocks the rest of the export.
 */
function loadRenderImage(src: string): Promise<RenderImage | null> {
	return new Promise((resolve) => {
		const local = isLocalSource(src);
		const img = new Image();
		if (!local) img.crossOrigin = "anonymous";
		img.onload = () =>
			resolve({
				height: img.naturalHeight,
				source: img,
				width: img.naturalWidth,
			});
		img.onerror = () => {
			// Retry without CORS for remote images lacking the headers — the draw
			// still works but taints the canvas, which toBlob() then surfaces.
			if (!local && img.crossOrigin) {
				const retry = new Image();
				retry.onload = () =>
					resolve({
						height: retry.naturalHeight,
						source: retry,
						width: retry.naturalWidth,
					});
				retry.onerror = () => resolve(null);
				retry.src = src;
				return;
			}
			resolve(null);
		};
		img.src = src;
	});
}

/**
 * Render a scene to a PNG blob off-screen, decoding its background/screenshot
 * images first. Standalone (no React) so it can export generated variant scenes
 * that are never mounted in the live editor canvas. Returns null when the canvas
 * is tainted by a remote image without CORS headers (toBlob throws).
 */
export async function exportSceneToPng(scene: SceneData): Promise<Blob | null> {
	// Custom and Google fonts must be registered before drawing, or the
	// exported PNG silently falls back to a default family.
	await ensureSceneFontsLoaded(scene);

	const images: RenderImages = {};
	if (scene.background.type === "image" && scene.background.value) {
		images.background =
			(await loadRenderImage(scene.background.value)) ?? undefined;
	}
	if (scene.screenshot?.url) {
		images.screenshot = (await loadRenderImage(scene.screenshot.url)) ?? undefined;
	}
	if (scene.device?.style === "photo") {
		images.bezel =
			(await loadRenderImage(getDeviceBezel(scene.device.bezelId).src)) ??
			undefined;
	}
	if (scene.device?.style === "3d" && scene.device.frame !== "none") {
		const rect = computeDeviceRect(scene);
		if (rect) {
			const { renderDeviceModel } = await import("./device-model-renderer");
			const canvas = await renderDeviceModel({
				frameHeight: Math.round(rect.height),
				frameWidth: Math.round(rect.width),
				modelId: scene.device.modelId ?? "",
				rotationX: scene.device.rotationX ?? 0,
				rotationY: scene.device.rotationY ?? 0,
				rotationZ: scene.device.rotation ?? 0,
				screenshot: images.screenshot
					? {
							height: images.screenshot.height,
							source: images.screenshot.source,
							width: images.screenshot.width,
						}
					: undefined,
			});
			if (canvas) {
				images.deviceModel = {
					height: canvas.height,
					source: canvas,
					width: canvas.width,
				};
			}
		}
	}
	for (const annotation of scene.annotations ?? []) {
		if (annotation.type !== "image" || !annotation.url) continue;
		const image = await loadRenderImage(annotation.url);
		if (image) {
			images.annotations = { ...images.annotations, [annotation.id]: image };
		}
	}

	const canvas = document.createElement("canvas");
	canvas.width = scene.width;
	canvas.height = scene.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	renderScene(ctx, scene, images);

	return new Promise<Blob | null>((resolve) => {
		try {
			canvas.toBlob((blob) => resolve(blob), "image/png");
		} catch {
			resolve(null);
		}
	});
}
