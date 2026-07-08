"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ensureCustomFontsLoaded } from "@/lib/scene-fonts";
import type { SceneData } from "@/lib/types";
import { cn } from "@/lib/utils";

import { type RenderImages, renderScene } from "./render-scene";
import { useSceneImages } from "./use-scene-images";

interface ScenePreviewProps {
	scene: SceneData;
	className?: string;
}

/**
 * Read-only thumbnail of a scene. Reuses the shared canvas renderer (and the
 * same image-decoding hook as the live editor) so a generated language variant
 * looks exactly like it will on export. No interaction — purely for review.
 */
export function ScenePreview({ scene, className }: ScenePreviewProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const loaded = useSceneImages(scene, scene.screenshot?.url);

	const renderImages = useMemo<RenderImages>(
		() => ({
			background: loaded.background
				? {
						source: loaded.background.element,
						width: loaded.background.width,
						height: loaded.background.height,
					}
				: undefined,
			screenshot: loaded.screenshot
				? {
						source: loaded.screenshot.element,
						width: loaded.screenshot.width,
						height: loaded.screenshot.height,
					}
				: undefined,
			annotations: loaded.annotations
				? Object.fromEntries(
						Object.entries(loaded.annotations).map(([id, img]) => [
							id,
							{
								source: img.element,
								width: img.width,
								height: img.height,
							},
						]),
					)
				: undefined,
		}),
		[loaded.background, loaded.screenshot, loaded.annotations],
	);

	// Re-render once the scene's custom fonts finish loading so the thumbnail
	// shows the real glyphs, not a fallback family.
	const [fontsVersion, setFontsVersion] = useState(0);
	useEffect(() => {
		let cancelled = false;
		ensureCustomFontsLoaded(scene).then(() => {
			if (!cancelled) setFontsVersion((v) => v + 1);
		});
		return () => {
			cancelled = true;
		};
	}, [scene]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		renderScene(ctx, scene, renderImages);
	}, [scene, renderImages, fontsVersion]);

	return (
		<canvas
			ref={canvasRef}
			width={scene.width}
			height={scene.height}
			className={cn("h-auto w-full rounded-md border border-border", className)}
		/>
	);
}
