import { getDeviceBezel } from "@/lib/device-bezels";
import { ensureSceneFontsLoaded } from "@/lib/scene-fonts";
import {
	computeDeviceRect,
	computeDeviceRectFor,
	computePanelSliceRects,
} from "@/lib/screenshot-editor";
import type { SceneData, SceneExtraDevice } from "@/lib/types";

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

/** WebGL-render one "3d"-style device (primary or extra) to a RenderImage. */
async function renderModelImage(
	device: NonNullable<SceneData["device"]> | SceneExtraDevice,
	rect: { width: number; height: number },
	screenshot: RenderImage | undefined,
): Promise<RenderImage | undefined> {
	const { renderDeviceModel } = await import("./device-model-renderer");
	const canvas = await renderDeviceModel({
		frameHeight: Math.round(rect.height),
		frameWidth: Math.round(rect.width),
		modelId: device.modelId ?? "",
		rotationX: device.rotationX ?? 0,
		rotationY: device.rotationY ?? 0,
		rotationZ: device.rotation ?? 0,
		screenshot: screenshot
			? {
					height: screenshot.height,
					source: screenshot.source,
					width: screenshot.width,
				}
			: undefined,
	});
	return canvas
		? { height: canvas.height, source: canvas, width: canvas.width }
		: undefined;
}

/** Encode a canvas as PNG, or null when tainted (toBlob throws). */
function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
	return new Promise<Blob | null>((resolve) => {
		try {
			canvas.toBlob((blob) => resolve(blob), "image/png");
		} catch {
			resolve(null);
		}
	});
}

/**
 * Render a scene to an off-screen canvas at true pixels, decoding its
 * background/screenshot images and pre-rendering any 3D device models first.
 * Standalone (no React) so it can export generated variant scenes that are
 * never mounted in the live editor canvas.
 */
async function renderSceneToCanvas(
	scene: SceneData,
): Promise<HTMLCanvasElement | null> {
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
			images.deviceModel = await renderModelImage(
				scene.device,
				rect,
				images.screenshot,
			);
		}
	}
	for (const annotation of scene.annotations ?? []) {
		if (annotation.type !== "image" || !annotation.url) continue;
		const image = await loadRenderImage(annotation.url);
		if (image) {
			images.annotations = { ...images.annotations, [annotation.id]: image };
		}
	}
	for (const extra of scene.extraDevices ?? []) {
		if (extra.frame === "none") continue;
		let screenshot: RenderImage | undefined;
		if (extra.screenshotUrl) {
			screenshot = (await loadRenderImage(extra.screenshotUrl)) ?? undefined;
			if (screenshot) {
				images.extraScreenshots = {
					...images.extraScreenshots,
					[extra.id]: screenshot,
				};
			}
		}
		if (extra.style === "3d") {
			const model = await renderModelImage(
				extra,
				computeDeviceRectFor(extra, scene),
				screenshot,
			);
			if (model) {
				images.extraDeviceModels = {
					...images.extraDeviceModels,
					[extra.id]: model,
				};
			}
		}
	}

	const canvas = document.createElement("canvas");
	canvas.width = scene.width;
	canvas.height = scene.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;
	renderScene(ctx, scene, images);
	return canvas;
}

/**
 * Render a scene to a PNG blob off-screen. Returns null when the canvas is
 * tainted by a remote image without CORS headers (toBlob throws).
 */
export async function exportSceneToPng(scene: SceneData): Promise<Blob | null> {
	const canvas = await renderSceneToCanvas(scene);
	if (!canvas) return null;
	return canvasToPng(canvas);
}

/**
 * Render a panorama scene once, then slice it into one PNG per panel at the
 * exact store screenshot size — the client-side twin of the backend's
 * split-upload. A single-panel scene yields one blob. Returns null when the
 * render fails or the canvas is tainted.
 */
export async function exportScenePanelPngs(
	scene: SceneData,
): Promise<Blob[] | null> {
	const canvas = await renderSceneToCanvas(scene);
	if (!canvas) return null;
	const blobs: Blob[] = [];
	for (const rect of computePanelSliceRects(scene)) {
		const slice = document.createElement("canvas");
		slice.width = Math.round(rect.width);
		slice.height = Math.round(rect.height);
		const ctx = slice.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(
			canvas,
			rect.x,
			rect.y,
			rect.width,
			rect.height,
			0,
			0,
			slice.width,
			slice.height,
		);
		const blob = await canvasToPng(slice);
		if (!blob) return null;
		blobs.push(blob);
	}
	return blobs;
}
