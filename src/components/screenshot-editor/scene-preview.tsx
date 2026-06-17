"use client";

import { useEffect, useMemo, useRef } from "react";

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
		}),
		[loaded.background, loaded.screenshot],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		renderScene(ctx, scene, renderImages);
	}, [scene, renderImages]);

	return (
		<canvas
			ref={canvasRef}
			width={scene.width}
			height={scene.height}
			className={cn("h-auto w-full rounded-md border border-border", className)}
		/>
	);
}
