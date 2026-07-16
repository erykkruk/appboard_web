"use client";

import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

import {
	ensureSceneFontsLoaded,
	loadGoogleFont,
	registerCustomFont,
} from "@/lib/scene-fonts";
import {
	computeDeviceRect,
	computeDisplayScale,
	hitTestAnnotation,
	hitTestCalloutTarget,
	hitTestDevice,
	hitTestTextLayer,
	snapNormalizedPosition,
} from "@/lib/screenshot-editor";
import type { SceneData } from "@/lib/types";
import { cn } from "@/lib/utils";

import { renderScene, type RenderImages } from "./render-scene";

export interface SceneCanvasHandle {
	/** Render the scene at true device pixels and return a PNG blob, or null if
	 * the canvas is tainted (remote image without CORS) and cannot be exported. */
	exportPng: () => Promise<Blob | null>;
}

// What the active pointer drag is moving. Text layers and annotation boxes are
// dragged by their anchor; a callout's tail tip is dragged independently. The
// device frame drags by the grab point (offset from its center) to avoid a
// jump on pointer down.
type DragTarget =
	| { kind: "text"; id: string }
	| { kind: "annotation"; id: string }
	| { kind: "callout-target"; id: string }
	| { kind: "device"; grabDx: number; grabDy: number };

// Matches the ±40% range of the device position sliders in the panel.
const DEVICE_OFFSET_LIMIT = 0.4;

interface SceneCanvasProps {
	scene: SceneData;
	images: RenderImages;
	selectedLayerId: string | null;
	onSelectLayer: (id: string | null) => void;
	onMoveLayer: (id: string, x: number, y: number) => void;
	onMoveAnnotation: (id: string, x: number, y: number) => void;
	onMoveCalloutTarget: (id: string, targetX: number, targetY: number) => void;
	onMoveDevice: (offsetX: number, offsetY: number) => void;
	/**
	 * An image file was dropped on the canvas. `overDevice` is true when the
	 * drop landed on the device frame (callers typically set the screenshot);
	 * otherwise `nx`/`ny` give the normalized drop point for an image layer.
	 */
	onDropImageFile?: (
		dataUrl: string,
		drop: { nx: number; ny: number; overDevice: boolean },
	) => void;
	className?: string;
}

export const SceneCanvas = forwardRef<SceneCanvasHandle, SceneCanvasProps>(
	function SceneCanvas(
		{
			scene,
			images,
			selectedLayerId,
			onSelectLayer,
			onMoveLayer,
			onMoveAnnotation,
			onMoveCalloutTarget,
			onMoveDevice,
			onDropImageFile,
			className,
		},
		ref,
	) {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const containerRef = useRef<HTMLDivElement>(null);
		const [displayScale, setDisplayScale] = useState(1);
		const draggingRef = useRef<DragTarget | null>(null);
		// Active snap guide lines (normalized), shown while a drag is snapping.
		const [guides, setGuides] = useState<{ x?: number; y?: number } | null>(
			null,
		);
		// Bumped once the scene's custom fonts finish loading so text drawn
		// before the FontFace resolved is re-rendered with the real glyphs.
		const [fontsVersion, setFontsVersion] = useState(0);
		const customFonts = scene.customFonts;
		const googleFonts = scene.googleFonts;

		useEffect(() => {
			const hasCustom = customFonts && customFonts.length > 0;
			const hasGoogle = googleFonts && googleFonts.length > 0;
			if (!hasCustom && !hasGoogle) return;
			let cancelled = false;
			Promise.all([
				...(customFonts ?? []).map((font) => registerCustomFont(font)),
				...(googleFonts ?? []).map((family) => loadGoogleFont(family)),
			]).then(() => {
				if (!cancelled) setFontsVersion((v) => v + 1);
			});
			return () => {
				cancelled = true;
			};
		}, [customFonts, googleFonts]);

		// Fit the canvas into the available container box while keeping the
		// backing store at true device pixels (scene.width × scene.height).
		useEffect(() => {
			const container = containerRef.current;
			if (!container) return;
			const update = () => {
				const rect = container.getBoundingClientRect();
				setDisplayScale(
					computeDisplayScale([scene.width, scene.height], {
						width: rect.width,
						height: rect.height,
					}),
				);
			};
			update();
			const observer = new ResizeObserver(update);
			observer.observe(container);
			return () => observer.disconnect();
		}, [scene.width, scene.height]);

		// Redraw whenever the scene, decoded images or loaded fonts change. The
		// live preview shows panorama split guides; the export path does not.
		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			renderScene(ctx, scene, images, {
				guides: guides ?? undefined,
				splitGuides: true,
			});
		}, [scene, images, fontsVersion, guides]);

		useImperativeHandle(
			ref,
			() => ({
				exportPng: async () => {
					// Guarantee custom and Google fonts are registered before the
					// off-screen draw so the exported PNG uses the real glyphs.
					await ensureSceneFontsLoaded(scene);
					return new Promise<Blob | null>((resolve) => {
						const exportCanvas = document.createElement("canvas");
						exportCanvas.width = scene.width;
						exportCanvas.height = scene.height;
						const ctx = exportCanvas.getContext("2d");
						if (!ctx) {
							resolve(null);
							return;
						}
						renderScene(ctx, scene, images);
						try {
							exportCanvas.toBlob(
								(blob) => resolve(blob),
								"image/png",
							);
						} catch {
							// Tainted canvas (remote image without CORS headers).
							resolve(null);
						}
					});
				},
			}),
			[scene, images],
		);

		const toScenePoint = useCallback(
			(clientX: number, clientY: number) => {
				const canvas = canvasRef.current;
				if (!canvas) return null;
				const rect = canvas.getBoundingClientRect();
				const x = ((clientX - rect.left) / rect.width) * scene.width;
				const y = ((clientY - rect.top) / rect.height) * scene.height;
				return { x, y };
			},
			[scene.width, scene.height],
		);

		const handlePointerDown = useCallback(
			(e: React.PointerEvent<HTMLCanvasElement>) => {
				const point = toScenePoint(e.clientX, e.clientY);
				if (!point) return;

				// When a callout is already selected, its tail-target handle wins so
				// the user can re-aim the pointer without first moving the bubble.
				const selectedAnn = (scene.annotations ?? []).find(
					(a) => a.id === selectedLayerId,
				);
				if (
					selectedAnn &&
					hitTestCalloutTarget(selectedAnn, scene, point.x, point.y)
				) {
					draggingRef.current = { kind: "callout-target", id: selectedAnn.id };
					e.currentTarget.setPointerCapture(e.pointerId);
					return;
				}

				const annHit = hitTestAnnotation(scene, point.x, point.y);
				if (annHit) {
					onSelectLayer(annHit);
					draggingRef.current = { kind: "annotation", id: annHit };
					e.currentTarget.setPointerCapture(e.pointerId);
					return;
				}

				const textHit = hitTestTextLayer(scene, point.x, point.y);
				if (textHit) {
					onSelectLayer(textHit);
					draggingRef.current = { kind: "text", id: textHit };
					e.currentTarget.setPointerCapture(e.pointerId);
					return;
				}

				// Device frame is the lowest-priority drag target — it usually
				// covers most of the scene, so text/annotations must win above.
				if (hitTestDevice(scene, point.x, point.y)) {
					const rect = computeDeviceRect(scene);
					if (rect) {
						onSelectLayer("__device");
						draggingRef.current = {
							kind: "device",
							grabDx: point.x - (rect.x + rect.width / 2),
							grabDy: point.y - (rect.y + rect.height / 2),
						};
						e.currentTarget.setPointerCapture(e.pointerId);
						return;
					}
				}

				onSelectLayer(null);
			},
			[scene, selectedLayerId, toScenePoint, onSelectLayer],
		);

		const handlePointerMove = useCallback(
			(e: React.PointerEvent<HTMLCanvasElement>) => {
				const drag = draggingRef.current;
				if (!drag) return;
				const point = toScenePoint(e.clientX, e.clientY);
				if (!point) return;
				if (drag.kind === "device") {
					const centerX = point.x - drag.grabDx;
					const centerY = point.y - drag.grabDy;
					let offsetX = Math.min(
						Math.max(
							(centerX - scene.width / 2) / scene.width,
							-DEVICE_OFFSET_LIMIT,
						),
						DEVICE_OFFSET_LIMIT,
					);
					let offsetY = Math.min(
						Math.max(
							(centerY - scene.height / 2) / scene.height,
							-DEVICE_OFFSET_LIMIT,
						),
						DEVICE_OFFSET_LIMIT,
					);
					// Snap the device to the canvas center (Alt bypasses).
					if (!e.altKey) {
						const snapped: { x?: number; y?: number } = {};
						if (Math.abs(offsetX) < 0.015) {
							offsetX = 0;
							snapped.x = 0.5;
						}
						if (Math.abs(offsetY) < 0.015) {
							offsetY = 0;
							snapped.y = 0.5;
						}
						setGuides(
							snapped.x !== undefined || snapped.y !== undefined
								? snapped
								: null,
						);
					} else {
						setGuides(null);
					}
					onMoveDevice(offsetX, offsetY);
					return;
				}
				let nx = Math.min(Math.max(point.x / scene.width, 0), 1);
				let ny = Math.min(Math.max(point.y / scene.height, 0), 1);
				// Text and annotation boxes snap to centers/seams; the callout tail
				// tip is a free aim point, so it never snaps.
				if (drag.kind !== "callout-target" && !e.altKey) {
					const snap = snapNormalizedPosition(nx, ny, scene);
					nx = snap.x;
					ny = snap.y;
					setGuides(
						snap.guideX !== undefined || snap.guideY !== undefined
							? { x: snap.guideX, y: snap.guideY }
							: null,
					);
				} else {
					setGuides(null);
				}
				if (drag.kind === "text") onMoveLayer(drag.id, nx, ny);
				else if (drag.kind === "annotation") onMoveAnnotation(drag.id, nx, ny);
				else onMoveCalloutTarget(drag.id, nx, ny);
			},
			[
				scene,
				toScenePoint,
				onMoveLayer,
				onMoveAnnotation,
				onMoveCalloutTarget,
				onMoveDevice,
			],
		);

		const handlePointerUp = useCallback(
			(e: React.PointerEvent<HTMLCanvasElement>) => {
				if (draggingRef.current) {
					e.currentTarget.releasePointerCapture(e.pointerId);
					draggingRef.current = null;
				}
				setGuides(null);
			},
			[],
		);

		// OS drag & drop: drop a PNG/JPG straight onto the canvas — on the
		// device it becomes the screenshot, elsewhere an image layer.
		const handleDragOver = useCallback(
			(e: React.DragEvent<HTMLCanvasElement>) => {
				if (onDropImageFile && e.dataTransfer.types.includes("Files")) {
					e.preventDefault();
					e.dataTransfer.dropEffect = "copy";
				}
			},
			[onDropImageFile],
		);

		const handleDrop = useCallback(
			(e: React.DragEvent<HTMLCanvasElement>) => {
				if (!onDropImageFile) return;
				const file = Array.from(e.dataTransfer.files).find((f) =>
					f.type.startsWith("image/"),
				);
				if (!file) return;
				e.preventDefault();
				const point = toScenePoint(e.clientX, e.clientY);
				if (!point) return;
				const overDevice = hitTestDevice(scene, point.x, point.y);
				const reader = new FileReader();
				reader.onload = () => {
					onDropImageFile(reader.result as string, {
						nx: Math.min(Math.max(point.x / scene.width, 0), 1),
						ny: Math.min(Math.max(point.y / scene.height, 0), 1),
						overDevice,
					});
				};
				reader.readAsDataURL(file);
			},
			[onDropImageFile, scene, toScenePoint],
		);

		return (
			<div
				ref={containerRef}
				className={cn(
					"flex h-full w-full items-center justify-center overflow-hidden",
					className,
				)}
			>
				<canvas
					ref={canvasRef}
					width={scene.width}
					height={scene.height}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
					style={{
						width: scene.width * displayScale,
						height: scene.height * displayScale,
					}}
					className={cn(
						"touch-none rounded-[2rem] shadow-2xl",
						selectedLayerId ? "cursor-grabbing" : "cursor-default",
					)}
				/>
			</div>
		);
	},
);
