"use client";

import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

import { computeDisplayScale, hitTestTextLayer } from "@/lib/screenshot-editor";
import type { SceneData } from "@/lib/types";
import { cn } from "@/lib/utils";

import { renderScene, type RenderImages } from "./render-scene";

export interface SceneCanvasHandle {
	/** Render the scene at true device pixels and return a PNG blob, or null if
	 * the canvas is tainted (remote image without CORS) and cannot be exported. */
	exportPng: () => Promise<Blob | null>;
}

interface SceneCanvasProps {
	scene: SceneData;
	images: RenderImages;
	selectedLayerId: string | null;
	onSelectLayer: (id: string | null) => void;
	onMoveLayer: (id: string, x: number, y: number) => void;
	className?: string;
}

export const SceneCanvas = forwardRef<SceneCanvasHandle, SceneCanvasProps>(
	function SceneCanvas(
		{ scene, images, selectedLayerId, onSelectLayer, onMoveLayer, className },
		ref,
	) {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const containerRef = useRef<HTMLDivElement>(null);
		const [displayScale, setDisplayScale] = useState(1);
		const draggingRef = useRef<string | null>(null);

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

		// Redraw whenever the scene or decoded images change.
		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			renderScene(ctx, scene, images);
		}, [scene, images]);

		useImperativeHandle(
			ref,
			() => ({
				exportPng: () =>
					new Promise<Blob | null>((resolve) => {
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
					}),
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
				const hit = hitTestTextLayer(scene, point.x, point.y);
				onSelectLayer(hit);
				if (hit) {
					draggingRef.current = hit;
					e.currentTarget.setPointerCapture(e.pointerId);
				}
			},
			[scene, toScenePoint, onSelectLayer],
		);

		const handlePointerMove = useCallback(
			(e: React.PointerEvent<HTMLCanvasElement>) => {
				const id = draggingRef.current;
				if (!id) return;
				const point = toScenePoint(e.clientX, e.clientY);
				if (!point) return;
				const nx = Math.min(Math.max(point.x / scene.width, 0), 1);
				const ny = Math.min(Math.max(point.y / scene.height, 0), 1);
				onMoveLayer(id, nx, ny);
			},
			[scene.width, scene.height, toScenePoint, onMoveLayer],
		);

		const handlePointerUp = useCallback(
			(e: React.PointerEvent<HTMLCanvasElement>) => {
				if (draggingRef.current) {
					e.currentTarget.releasePointerCapture(e.pointerId);
					draggingRef.current = null;
				}
			},
			[],
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
