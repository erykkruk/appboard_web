"use client";

import { useEffect, useState } from "react";

import { computeDeviceRect } from "@/lib/screenshot-editor";
import type { SceneData } from "@/lib/types";

import type { RenderImage } from "@/components/screenshot-editor/render-scene";

/**
 * Produce the pre-rendered true-3D device image for scenes using the "3d"
 * device style. Re-renders when the model, rotations, device size or the
 * screenshot change; returns undefined for every other style (and while the
 * first WebGL render is in flight). The renderer module (and three.js) load
 * lazily on first use.
 */
export function useDeviceModel(
	scene: SceneData,
	screenshot: RenderImage | undefined,
): RenderImage | undefined {
	const [image, setImage] = useState<RenderImage | undefined>(undefined);

	const device = scene.device;
	const is3d = device?.style === "3d" && device.frame !== "none";
	const rect = is3d ? computeDeviceRect(scene) : null;
	const frameWidth = Math.round(rect?.width ?? 0);
	const frameHeight = Math.round(rect?.height ?? 0);
	const modelId = device?.modelId;
	const rotationX = device?.rotationX ?? 0;
	const rotationY = device?.rotationY ?? 0;
	const rotationZ = device?.rotation ?? 0;
	const screenshotSource = screenshot?.source;
	const screenshotWidth = screenshot?.width ?? 0;
	const screenshotHeight = screenshot?.height ?? 0;

	useEffect(() => {
		if (!is3d || frameWidth <= 0 || frameHeight <= 0) {
			setImage(undefined);
			return;
		}
		let cancelled = false;
		import("@/components/screenshot-editor/device-model-renderer").then(
			({ renderDeviceModel }) =>
				renderDeviceModel({
					frameHeight,
					frameWidth,
					modelId: modelId ?? "",
					rotationX,
					rotationY,
					rotationZ,
					screenshot: screenshotSource
						? {
								height: screenshotHeight,
								source: screenshotSource,
								width: screenshotWidth,
							}
						: undefined,
				}).then((canvas) => {
					if (cancelled) return;
					setImage(
						canvas
							? { height: canvas.height, source: canvas, width: canvas.width }
							: undefined,
					);
				}),
		);
		return () => {
			cancelled = true;
		};
	}, [
		is3d,
		frameWidth,
		frameHeight,
		modelId,
		rotationX,
		rotationY,
		rotationZ,
		screenshotSource,
		screenshotWidth,
		screenshotHeight,
	]);

	return is3d ? image : undefined;
}
