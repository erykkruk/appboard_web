"use client";

import { useEffect, useState } from "react";

import { getDeviceBezel } from "@/lib/device-bezels";
import type { SceneData } from "@/lib/types";

export interface LoadedImage {
	element: HTMLImageElement;
	width: number;
	height: number;
	/** True when the source is a remote URL loaded without CORS — drawing it
	 * taints the canvas and blocks PNG export via toBlob(). */
	tainted: boolean;
}

interface SceneImages {
	background?: LoadedImage;
	screenshot?: LoadedImage;
	/** Photographic device bezel ("photo" device style, same-origin asset). */
	bezel?: LoadedImage;
	/** Decoded image-annotation sources keyed by annotation id. */
	annotations?: Record<string, LoadedImage>;
	/** True if any drawn image tainted the canvas (remote, no CORS headers). */
	tainted: boolean;
}

function isLocalSource(src: string): boolean {
	return src.startsWith("data:") || src.startsWith("blob:");
}

function loadImage(src: string): Promise<LoadedImage> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const local = isLocalSource(src);
		// Local data/blob URLs never taint. For remote URLs request CORS so the
		// canvas stays exportable when the server sends Access-Control headers.
		if (!local) img.crossOrigin = "anonymous";
		img.onload = () =>
			resolve({
				element: img,
				width: img.naturalWidth,
				height: img.naturalHeight,
				// Remote sources may still taint if the server omits CORS headers;
				// the actual taint is detected at export time via toBlob failure.
				tainted: !local,
			});
		img.onerror = () => {
			// Retry without crossOrigin for remote images that lack CORS headers,
			// so the preview still renders (export will be blocked / tainted).
			if (!local && img.crossOrigin) {
				const retry = new Image();
				retry.onload = () =>
					resolve({
						element: retry,
						width: retry.naturalWidth,
						height: retry.naturalHeight,
						tainted: true,
					});
				retry.onerror = () => reject(new Error(`Failed to load image: ${src}`));
				retry.src = src;
				return;
			}
			reject(new Error(`Failed to load image: ${src}`));
		};
		img.src = src;
	});
}

// Decode-once cache keyed by source. The loading effect re-runs on every scene
// change (image annotations live inside `scene.annotations`, whose identity
// changes on each drag frame), so repeated loads must be free.
const imageCache = new Map<string, Promise<LoadedImage>>();

function loadImageCached(src: string): Promise<LoadedImage> {
	const cached = imageCache.get(src);
	if (cached) return cached;
	const promise = loadImage(src);
	// Drop failures from the cache so a transient network error can be retried.
	promise.catch(() => imageCache.delete(src));
	imageCache.set(src, promise);
	return promise;
}

/**
 * Decode the background-image, screenshot and image-annotation sources
 * referenced by a scene into HTMLImageElements for the canvas renderer.
 * Re-runs when the relevant sources change. Returns a `tainted` flag so the
 * editor can warn before export.
 */
export function useSceneImages(
	scene: SceneData,
	screenshotSrc: string | undefined,
): SceneImages {
	const [images, setImages] = useState<SceneImages>({ tainted: false });

	const backgroundSrc =
		scene.background.type === "image" ? scene.background.value : undefined;
	const bezelSrc =
		scene.device?.style === "photo"
			? getDeviceBezel(scene.device.bezelId).src
			: undefined;
	const annotations = scene.annotations;

	useEffect(() => {
		let cancelled = false;
		const tasks: Promise<void>[] = [];
		const next: SceneImages = { tainted: false };

		if (backgroundSrc) {
			tasks.push(
				loadImageCached(backgroundSrc)
					.then((img) => {
						next.background = img;
						if (img.tainted) next.tainted = true;
					})
					.catch(() => {}),
			);
		}
		if (screenshotSrc) {
			tasks.push(
				loadImageCached(screenshotSrc)
					.then((img) => {
						next.screenshot = img;
						if (img.tainted) next.tainted = true;
					})
					.catch(() => {}),
			);
		}
		if (bezelSrc) {
			// Same-origin /public asset — never taints the canvas.
			tasks.push(
				loadImageCached(bezelSrc)
					.then((img) => {
						next.bezel = img;
					})
					.catch(() => {}),
			);
		}
		for (const annotation of annotations ?? []) {
			if (annotation.type !== "image" || !annotation.url) continue;
			const { id, url } = annotation;
			tasks.push(
				loadImageCached(url)
					.then((img) => {
						next.annotations = { ...next.annotations, [id]: img };
						if (img.tainted) next.tainted = true;
					})
					.catch(() => {}),
			);
		}

		Promise.all(tasks).then(() => {
			if (!cancelled) setImages(next);
		});

		return () => {
			cancelled = true;
		};
	}, [backgroundSrc, bezelSrc, screenshotSrc, annotations]);

	return images;
}
