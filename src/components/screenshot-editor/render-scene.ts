import {
	buildFontString,
	computeDeviceRect,
	computeImageFit,
	resolveTextPosition,
	type Rect,
} from "@/lib/screenshot-editor";
import type { SceneData } from "@/lib/types";

// A decoded image plus its natural pixel dimensions. The element is passed to
// drawImage; the dims drive the fit math (the element's own width/height can be
// layout values, not natural pixels).
export interface RenderImage {
	source: CanvasImageSource;
	width: number;
	height: number;
}

// Image-like inputs that have already been decoded by the caller. Keeping the
// renderer image-agnostic (vs. loading internally) makes it usable for both the
// live preview and the off-screen export canvas, and avoids async inside draw.
export interface RenderImages {
	background?: RenderImage;
	screenshot?: RenderImage;
}

const NOTCH_WIDTH_RATIO = 0.42;
const NOTCH_HEIGHT_RATIO = 0.028;
const SCREEN_INSET_RATIO = 0.045;

function roundedRectPath(
	ctx: CanvasRenderingContext2D,
	r: Rect,
	radius: number,
): void {
	const rad = Math.min(radius, r.width / 2, r.height / 2);
	ctx.beginPath();
	ctx.moveTo(r.x + rad, r.y);
	ctx.arcTo(r.x + r.width, r.y, r.x + r.width, r.y + r.height, rad);
	ctx.arcTo(r.x + r.width, r.y + r.height, r.x, r.y + r.height, rad);
	ctx.arcTo(r.x, r.y + r.height, r.x, r.y, rad);
	ctx.arcTo(r.x, r.y, r.x + r.width, r.y, rad);
	ctx.closePath();
}

function drawBackground(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
): void {
	const { background } = scene;
	if (background.type === "image" && images.background) {
		const { dest, src } = computeImageFit(
			images.background.width,
			images.background.height,
			{ x: 0, y: 0, width: scene.width, height: scene.height },
			"cover",
		);
		ctx.drawImage(
			images.background.source,
			src.x,
			src.y,
			src.width,
			src.height,
			dest.x,
			dest.y,
			dest.width,
			dest.height,
		);
		return;
	}

	if (background.type === "gradient" && background.gradient) {
		const { from, to, angle } = background.gradient;
		const rad = (angle * Math.PI) / 180;
		const cx = scene.width / 2;
		const cy = scene.height / 2;
		const half = Math.max(scene.width, scene.height);
		const dx = (Math.cos(rad) * half) / 2;
		const dy = (Math.sin(rad) * half) / 2;
		const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
		grad.addColorStop(0, from);
		grad.addColorStop(1, to);
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, scene.width, scene.height);
		return;
	}

	ctx.fillStyle = background.value || "#000000";
	ctx.fillRect(0, 0, scene.width, scene.height);
}

/**
 * Draw a recognizable device frame programmatically (no external mockup
 * assets): an outer bezel rounded-rect, an inner screen area, and an optional
 * notch for the iPhone preset. The screenshot (if any) is clipped to the screen
 * area. Returns the inner screen rect so callers can place a screenshot there.
 */
function drawDeviceFrame(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
): void {
	const device = scene.device;
	if (!device || device.frame === "none") {
		// No frame: still allow a screenshot to fill the canvas if present.
		if (images.screenshot) {
			const { dest, src } = computeImageFit(
				images.screenshot.width,
				images.screenshot.height,
				{ x: 0, y: 0, width: scene.width, height: scene.height },
				scene.screenshot?.fit ?? "cover",
			);
			ctx.drawImage(
				images.screenshot.source,
				src.x,
				src.y,
				src.width,
				src.height,
				dest.x,
				dest.y,
				dest.width,
				dest.height,
			);
		}
		return;
	}

	const frame = computeDeviceRect(scene);
	if (!frame) return;

	ctx.save();
	if (device.rotation) {
		const cx = frame.x + frame.width / 2;
		const cy = frame.y + frame.height / 2;
		ctx.translate(cx, cy);
		ctx.rotate((device.rotation * Math.PI) / 180);
		ctx.translate(-cx, -cy);
	}

	const bezelRadius = frame.width * 0.14;
	const isAndroid = device.frame === "android";

	// Drop shadow for depth.
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.35)";
	ctx.shadowBlur = frame.width * 0.06;
	ctx.shadowOffsetY = frame.width * 0.03;
	ctx.fillStyle = "#0b0b0f";
	roundedRectPath(ctx, frame, bezelRadius);
	ctx.fill();
	ctx.restore();

	// Inner screen area.
	const inset = frame.width * SCREEN_INSET_RATIO;
	const screen: Rect = {
		x: frame.x + inset,
		y: frame.y + inset,
		width: frame.width - inset * 2,
		height: frame.height - inset * 2,
	};
	const screenRadius = bezelRadius - inset;

	ctx.save();
	roundedRectPath(ctx, screen, screenRadius);
	ctx.clip();
	if (images.screenshot) {
		const { dest, src } = computeImageFit(
			images.screenshot.width,
			images.screenshot.height,
			screen,
			scene.screenshot?.fit ?? "cover",
		);
		ctx.drawImage(
			images.screenshot.source,
			src.x,
			src.y,
			src.width,
			src.height,
			dest.x,
			dest.y,
			dest.width,
			dest.height,
		);
	} else {
		ctx.fillStyle = "#1c1c22";
		ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
	}
	ctx.restore();

	// Notch (iPhone only).
	if (!isAndroid) {
		const notchWidth = frame.width * NOTCH_WIDTH_RATIO;
		const notchHeight = frame.height * NOTCH_HEIGHT_RATIO;
		const notch: Rect = {
			x: frame.x + (frame.width - notchWidth) / 2,
			y: frame.y + inset,
			width: notchWidth,
			height: notchHeight,
		};
		ctx.fillStyle = "#0b0b0f";
		roundedRectPath(ctx, notch, notchHeight / 2);
		ctx.fill();
	}

	ctx.restore();
}

function drawTextLayers(ctx: CanvasRenderingContext2D, scene: SceneData): void {
	for (const layer of scene.textLayers) {
		const { x, y } = resolveTextPosition(layer, scene);
		ctx.font = buildFontString(layer);
		ctx.fillStyle = layer.color;
		ctx.textAlign = layer.align;
		ctx.textBaseline = "middle";
		const lines = layer.text.split("\n");
		const lineHeight = layer.fontSize * 1.2;
		const totalHeight = lineHeight * (lines.length - 1);
		lines.forEach((line, i) => {
			ctx.fillText(line, x, y - totalHeight / 2 + i * lineHeight);
		});
	}
}

/**
 * Render a full scene onto a 2D context. The context's canvas MUST already be
 * sized to `scene.width`×`scene.height` (true device pixels). Synchronous: all
 * images must be decoded and passed in `images`. Used by both the live preview
 * (scaled via CSS) and the off-screen export canvas.
 */
export function renderScene(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
): void {
	ctx.clearRect(0, 0, scene.width, scene.height);
	drawBackground(ctx, scene, images);
	drawDeviceFrame(ctx, scene, images);
	drawTextLayers(ctx, scene);
}
