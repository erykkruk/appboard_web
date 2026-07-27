"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { computeDeviceRect, computeDeviceRectFor } from "@/lib/screenshot-editor";
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

/**
 * Cheap identity for a screenshot source string (data URLs run to megabytes,
 * so hashing the whole value on every render is off the table).
 */
function fingerprintSource(src: string | undefined): string {
	if (!src) return "none";
	return `${src.length}:${src.slice(0, 24)}:${src.slice(-24)}`;
}

/**
 * Pre-rendered true-3D images for every EXTRA device using the "3d" style,
 * keyed by device id. Mirrors {@link useDeviceModel} for the primary device.
 * The render signature excludes offsets, so canvas drags reposition the cached
 * render instead of re-running WebGL on every pointer frame.
 */
export function useExtraDeviceModels(
	scene: SceneData,
	screenshots: Record<string, RenderImage | undefined> | undefined,
): Record<string, RenderImage> | undefined {
	const [images, setImages] = useState<
		Record<string, RenderImage> | undefined
	>(undefined);

	const sceneRef = useRef(scene);
	sceneRef.current = scene;
	const screenshotsRef = useRef(screenshots);
	screenshotsRef.current = screenshots;

	const signature = useMemo(
		() =>
			(scene.extraDevices ?? [])
				.filter((d) => d.style === "3d" && d.frame !== "none")
				.map((d) => {
					const rect = computeDeviceRectFor(d, scene);
					const shot = screenshots?.[d.id];
					return [
						d.id,
						d.modelId ?? "",
						d.rotationX ?? 0,
						d.rotationY ?? 0,
						d.rotation ?? 0,
						Math.round(rect.width),
						Math.round(rect.height),
						shot ? `${shot.width}x${shot.height}` : "pending",
						fingerprintSource(d.screenshotUrl),
					].join(":");
				})
				.join("|"),
		[scene, screenshots],
	);

	useEffect(() => {
		const list = (sceneRef.current.extraDevices ?? []).filter(
			(d) => d.style === "3d" && d.frame !== "none",
		);
		if (list.length === 0) {
			setImages(undefined);
			return;
		}
		let cancelled = false;
		import("@/components/screenshot-editor/device-model-renderer").then(
			async ({ renderDeviceModel }) => {
				const next: Record<string, RenderImage> = {};
				// Sequential on purpose: the module shares ONE WebGL renderer, so
				// parallel renders would clobber each other's mounted model.
				for (const device of list) {
					const rect = computeDeviceRectFor(device, sceneRef.current);
					const shot = screenshotsRef.current?.[device.id];
					const canvas = await renderDeviceModel({
						frameHeight: Math.round(rect.height),
						frameWidth: Math.round(rect.width),
						modelId: device.modelId ?? "",
						rotationX: device.rotationX ?? 0,
						rotationY: device.rotationY ?? 0,
						rotationZ: device.rotation ?? 0,
						screenshot: shot
							? {
									height: shot.height,
									source: shot.source,
									width: shot.width,
								}
							: undefined,
					});
					if (cancelled) return;
					if (canvas) {
						next[device.id] = {
							height: canvas.height,
							source: canvas,
							width: canvas.width,
						};
					}
				}
				if (!cancelled) setImages(next);
			},
		);
		return () => {
			cancelled = true;
		};
	}, [signature]);

	return images;
}
