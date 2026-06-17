"use client";

import { useEffect, useState } from "react";

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

/**
 * Decode the background-image and screenshot sources referenced by a scene into
 * HTMLImageElements for the canvas renderer. Re-runs when the relevant sources
 * change. Returns a `tainted` flag so the editor can warn before export.
 */
export function useSceneImages(
	scene: SceneData,
	screenshotSrc: string | undefined,
): SceneImages {
	const [images, setImages] = useState<SceneImages>({ tainted: false });

	const backgroundSrc =
		scene.background.type === "image" ? scene.background.value : undefined;

	useEffect(() => {
		let cancelled = false;
		const tasks: Promise<void>[] = [];
		const next: SceneImages = { tainted: false };

		if (backgroundSrc) {
			tasks.push(
				loadImage(backgroundSrc)
					.then((img) => {
						next.background = img;
						if (img.tainted) next.tainted = true;
					})
					.catch(() => {}),
			);
		}
		if (screenshotSrc) {
			tasks.push(
				loadImage(screenshotSrc)
					.then((img) => {
						next.screenshot = img;
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
	}, [backgroundSrc, screenshotSrc]);

	return images;
}
