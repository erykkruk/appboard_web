import {
	buildFontString,
	computeDeviceRect,
	computeImageFit,
	getPanelCount,
	measureAnnotationBox,
	resolveTextPosition,
	type Rect,
} from "@/lib/screenshot-editor";
import type {
	SceneData,
	SceneDeviceColor,
	SceneImageAnnotation,
	SceneTextAnnotation,
} from "@/lib/types";

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
	/** Decoded image-annotation sources keyed by annotation id. */
	annotations?: Record<string, RenderImage | undefined>;
}

// Realistic device-frame proportions (fractions of the frame width W, except
// button lengths which are fractions of the frame height H). Tuned to read as a
// modern iPhone (titanium rail + Dynamic Island) and a modern hole-punch
// Android. See scripts/frames preview used during design.
const BODY_RADIUS_RATIO = { android: 0.135, iphone: 0.16 } as const;
const RAIL_RATIO = 0.02; // metallic edge thickness
const BEZEL_RATIO = 0.038; // outer edge → screen inset (thin, uniform)
const BTN_PROTRUDE_RATIO = 0.012;
const BTN_THICKNESS_RATIO = 0.016;

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

/**
 * Metallic side-rail gradient (light edges → dark centre) across [x, x+W].
 * "silver" reads as brushed titanium; "black" as black titanium with a faint
 * edge sheen so it never looks flat.
 */
function metalGradient(
	ctx: CanvasRenderingContext2D,
	x: number,
	w: number,
	color: SceneDeviceColor,
): CanvasGradient {
	const g = ctx.createLinearGradient(x, 0, x + w, 0);
	if (color === "black") {
		g.addColorStop(0, "#4a4d52");
		g.addColorStop(0.12, "#17181b");
		g.addColorStop(0.5, "#0c0d0f");
		g.addColorStop(0.88, "#17181b");
		g.addColorStop(1, "#45484d");
	} else {
		g.addColorStop(0, "#f4f2ee");
		g.addColorStop(0.12, "#c6c4be");
		g.addColorStop(0.5, "#8c8a85");
		g.addColorStop(0.88, "#c6c4be");
		g.addColorStop(1, "#eae8e3");
	}
	return g;
}

/** Side-button rects (power/volume/action) protruding from the frame edge. */
function deviceButtons(frame: Rect, isAndroid: boolean): Rect[] {
	const { x, y, width: W, height: H } = frame;
	const bp = W * BTN_PROTRUDE_RATIO;
	const bt = W * BTN_THICKNESS_RATIO;
	const right = (top: number, len: number): Rect => ({
		x: x + W - bt * 0.4,
		y: y + H * top,
		width: bt + bp,
		height: H * len,
	});
	const left = (top: number, len: number): Rect => ({
		x: x - bp,
		y: y + H * top,
		width: bt + bp,
		height: H * len,
	});
	if (isAndroid) {
		return [right(0.22, 0.07), right(0.32, 0.13)]; // power + volume rocker
	}
	// iPhone: action + volume up/down (left), power (right).
	return [left(0.185, 0.05), left(0.28, 0.08), left(0.385, 0.08), right(0.27, 0.13)];
}

function fillCircle(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	color: string,
): void {
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
}

function drawBackground(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
): void {
	const { background } = scene;
	if (background.type === "image" && images.background) {
		const fit = background.fit ?? "cover";
		if (fit === "contain") {
			// Letterbox bars: fill the canvas before drawing the fitted image.
			ctx.fillStyle = "#000000";
			ctx.fillRect(0, 0, scene.width, scene.height);
		}
		const { dest, src } = computeImageFit(
			images.background.width,
			images.background.height,
			{ x: 0, y: 0, width: scene.width, height: scene.height },
			fit,
			background.offsetX ?? 0,
			background.offsetY ?? 0,
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

	const isAndroid = device.frame === "android";
	// Default color per platform preserves the look of scenes saved before the
	// color option existed (iPhone silver, Android black).
	const color: SceneDeviceColor =
		device.color ?? (isAndroid ? "black" : "silver");
	const W = frame.width;
	const bodyRadius =
		W * (isAndroid ? BODY_RADIUS_RATIO.android : BODY_RADIUS_RATIO.iphone);
	const rail = W * RAIL_RATIO;
	const bezel = W * BEZEL_RATIO;
	const cx = frame.x + W / 2;

	ctx.save();
	if (device.rotation) {
		const rcx = frame.x + frame.width / 2;
		const rcy = frame.y + frame.height / 2;
		ctx.translate(rcx, rcy);
		ctx.rotate((device.rotation * Math.PI) / 180);
		ctx.translate(-rcx, -rcy);
	}

	// Metallic body + side buttons, sharing one drop shadow. Buttons are drawn
	// first so the body rail covers their inner (seam) end, leaving only the nub.
	const metal = metalGradient(ctx, frame.x, W, color);
	const buttons = deviceButtons(frame, isAndroid);
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.4)";
	ctx.shadowBlur = W * 0.05;
	ctx.shadowOffsetY = W * 0.02;
	ctx.fillStyle = color === "silver" ? "#adaba3" : "#2a2c30";
	for (const b of buttons) {
		roundedRectPath(ctx, b, b.width * 0.4);
		ctx.fill();
	}
	ctx.fillStyle = metal;
	roundedRectPath(ctx, frame, bodyRadius);
	ctx.fill();
	ctx.restore();

	// Black glass bezel (covers the body interior, leaving the metal rail ring).
	const glass: Rect = {
		x: frame.x + rail,
		y: frame.y + rail,
		width: W - rail * 2,
		height: frame.height - rail * 2,
	};
	ctx.fillStyle = "#050507";
	roundedRectPath(ctx, glass, bodyRadius - rail);
	ctx.fill();

	// Screen area (screenshot clipped to rounded corners).
	const screen: Rect = {
		x: frame.x + bezel,
		y: frame.y + bezel,
		width: W - bezel * 2,
		height: frame.height - bezel * 2,
	};
	ctx.save();
	roundedRectPath(ctx, screen, bodyRadius - bezel);
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

	// Camera cutout, drawn over the screen.
	if (isAndroid) {
		const holeCy = screen.y + W * 0.058;
		fillCircle(ctx, cx, holeCy, W * 0.026, "#000000");
		fillCircle(ctx, cx, holeCy, W * 0.013, "#0b1a2b");
		fillCircle(ctx, cx, holeCy, W * 0.006, "#1e3a5f");
	} else {
		const iw = screen.width * 0.275;
		const ih = W * 0.072;
		const island: Rect = {
			x: cx - iw / 2,
			y: screen.y + W * 0.05,
			width: iw,
			height: ih,
		};
		ctx.fillStyle = "#000000";
		roundedRectPath(ctx, island, ih / 2);
		ctx.fill();
		const lensCx = island.x + iw - ih * 0.62;
		const lensCy = island.y + ih / 2;
		fillCircle(ctx, lensCx, lensCy, ih * 0.26, "#0b1a2b");
		fillCircle(ctx, lensCx, lensCy, ih * 0.12, "#1e3a5f");
	}

	ctx.restore();
}

function drawTextLayers(ctx: CanvasRenderingContext2D, scene: SceneData): void {
	for (const layer of scene.textLayers) {
		const { x, y } = resolveTextPosition(layer, scene);
		ctx.font = buildFontString(layer);
		const lines = layer.text.split("\n");
		const lineHeight = layer.fontSize * 1.2;
		const totalHeight = lineHeight * (lines.length - 1);

		// Optional background panel sized to the measured text block.
		if (layer.bg) {
			const maxWidth = lines.reduce(
				(w, line) => Math.max(w, ctx.measureText(line).width),
				0,
			);
			const padX = layer.fontSize * 0.4;
			const padY = layer.fontSize * 0.3;
			const boxW = maxWidth + padX * 2;
			const boxH = lineHeight * lines.length + padY * 2 - layer.fontSize * 0.2;
			let boxX = x - boxW / 2;
			if (layer.align === "left") boxX = x - padX;
			else if (layer.align === "right") boxX = x - maxWidth - padX;
			const box: Rect = { x: boxX, y: y - boxH / 2, width: boxW, height: boxH };
			ctx.fillStyle = layer.bg;
			roundedRectPath(ctx, box, layer.fontSize * 0.25);
			ctx.fill();
		}

		ctx.save();
		ctx.textAlign = layer.align;
		ctx.textBaseline = "middle";
		const lineY = (i: number) => y - totalHeight / 2 + i * lineHeight;

		const hasStroke = Boolean(layer.strokeColor && (layer.strokeWidth ?? 0) > 0);
		const hasShadow = Boolean(
			layer.shadowColor &&
				((layer.shadowOffsetX ?? 0) !== 0 ||
					(layer.shadowOffsetY ?? 0) !== 0 ||
					(layer.shadowBlur ?? 0) > 0),
		);
		if (hasShadow && layer.shadowColor) {
			ctx.shadowColor = layer.shadowColor;
			ctx.shadowOffsetX = layer.shadowOffsetX ?? 0;
			ctx.shadowOffsetY = layer.shadowOffsetY ?? 0;
			ctx.shadowBlur = layer.shadowBlur ?? 0;
		}

		// Outline pass first (cartoon "stroke behind fill" look). The shadow rides
		// on this pass when a stroke exists, so the fill above stays crisp.
		if (hasStroke && layer.strokeColor) {
			ctx.lineJoin = "round";
			ctx.miterLimit = 2;
			ctx.strokeStyle = layer.strokeColor;
			// The canvas stroke straddles the glyph edge, so double the width to get
			// the requested visible outline thickness outside the fill.
			ctx.lineWidth = (layer.strokeWidth ?? 0) * 2;
			lines.forEach((line, i) => {
				ctx.strokeText(line, x, lineY(i));
			});
			ctx.shadowColor = "transparent";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;
		}

		ctx.fillStyle = layer.color;
		lines.forEach((line, i) => {
			ctx.fillText(line, x, lineY(i));
		});
		ctx.restore();
	}
}

/** Draw the multi-line text of an annotation centered inside `box`. */
function drawAnnotationText(
	ctx: CanvasRenderingContext2D,
	annotation: SceneTextAnnotation,
	box: Rect,
): void {
	ctx.font = buildFontString({
		fontFamily: annotation.fontFamily ?? "Inter, system-ui, sans-serif",
		fontSize: annotation.fontSize,
		weight: annotation.weight,
	});
	ctx.fillStyle = annotation.color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const lines = annotation.text.split("\n");
	const lineHeight = annotation.fontSize * 1.2;
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;
	const totalHeight = lineHeight * (lines.length - 1);
	lines.forEach((line, i) => {
		ctx.fillText(line, cx, cy - totalHeight / 2 + i * lineHeight);
	});
}

/**
 * Draw a callout: a rounded bubble plus a triangular tail pointing from the
 * bubble edge toward the target point. The tail base sits on the bubble side
 * nearest the target so the pointer always reads as attached.
 */
function drawCallout(
	ctx: CanvasRenderingContext2D,
	annotation: SceneTextAnnotation & { type: "callout" },
	scene: SceneData,
): void {
	const box = measureAnnotationBox(annotation, scene);
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;
	const tx = annotation.targetX * scene.width;
	const ty = annotation.targetY * scene.height;

	// Tail base width scales with font size; anchored at the bubble center and
	// pointing toward the target, clamped to the bubble edge.
	const tailBase = Math.max(annotation.fontSize * 0.5, 12);
	const dx = tx - cx;
	const dy = ty - cy;
	const len = Math.hypot(dx, dy) || 1;
	const nx = dx / len;
	const ny = dy / len;
	// Perpendicular for the tail base spread.
	const px = -ny;
	const py = nx;
	// Base point on the bubble edge (project center toward target by half-extent).
	const baseDist = Math.min(box.width, box.height) / 2;
	const baseX = cx + nx * baseDist;
	const baseY = cy + ny * baseDist;

	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.3)";
	ctx.shadowBlur = annotation.fontSize * 0.4;
	ctx.shadowOffsetY = annotation.fontSize * 0.12;
	ctx.fillStyle = annotation.bg;

	// Tail triangle (drawn first, shares the bubble fill/shadow).
	ctx.beginPath();
	ctx.moveTo(baseX + px * tailBase, baseY + py * tailBase);
	ctx.lineTo(tx, ty);
	ctx.lineTo(baseX - px * tailBase, baseY - py * tailBase);
	ctx.closePath();
	ctx.fill();

	// Bubble.
	roundedRectPath(ctx, box, Math.min(box.height / 2, annotation.fontSize));
	ctx.fill();
	ctx.restore();

	drawAnnotationText(ctx, annotation, box);
}

/** Draw a pill-shaped badge: a fully-rounded rect with centered text. */
function drawBadge(
	ctx: CanvasRenderingContext2D,
	annotation: SceneTextAnnotation & { type: "badge" },
	scene: SceneData,
): void {
	const box = measureAnnotationBox(annotation, scene);
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.25)";
	ctx.shadowBlur = annotation.fontSize * 0.3;
	ctx.shadowOffsetY = annotation.fontSize * 0.1;
	ctx.fillStyle = annotation.bg;
	roundedRectPath(ctx, box, box.height / 2);
	ctx.fill();
	ctx.restore();
	drawAnnotationText(ctx, annotation, box);
}

/** Draw a label: centered text with an optional rounded background panel. */
function drawLabel(
	ctx: CanvasRenderingContext2D,
	annotation: SceneTextAnnotation & { type: "label" },
	scene: SceneData,
): void {
	const box = measureAnnotationBox(annotation, scene);
	if (annotation.showBackground !== false) {
		ctx.save();
		ctx.fillStyle = annotation.bg;
		roundedRectPath(ctx, box, annotation.fontSize * 0.25);
		ctx.fill();
		ctx.restore();
	}
	drawAnnotationText(ctx, annotation, box);
}

/**
 * Draw a user image layer: centered on its anchor, width as a fraction of the
 * scene width, height following the natural aspect ratio (stored `aspect` is
 * preferred so the drawn box matches the hit-test box), with optional opacity
 * and rotation. Skipped silently while the image is still decoding.
 */
function drawImageAnnotation(
	ctx: CanvasRenderingContext2D,
	annotation: SceneImageAnnotation,
	scene: SceneData,
	image: RenderImage | undefined,
): void {
	if (!image) return;
	const width = annotation.width * scene.width;
	const naturalAspect = image.width > 0 ? image.height / image.width : 1;
	const height = width * (annotation.aspect ?? naturalAspect);
	const cx = annotation.x * scene.width;
	const cy = annotation.y * scene.height;
	ctx.save();
	ctx.globalAlpha = Math.min(Math.max(annotation.opacity ?? 1, 0), 1);
	ctx.translate(cx, cy);
	if (annotation.rotation) {
		ctx.rotate((annotation.rotation * Math.PI) / 180);
	}
	ctx.drawImage(image.source, -width / 2, -height / 2, width, height);
	ctx.restore();
}

function drawAnnotations(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
): void {
	for (const annotation of scene.annotations ?? []) {
		if (annotation.type === "image") {
			drawImageAnnotation(
				ctx,
				annotation,
				scene,
				images.annotations?.[annotation.id],
			);
		} else if (annotation.type === "callout") {
			drawCallout(ctx, annotation, scene);
		} else if (annotation.type === "badge") {
			drawBadge(ctx, annotation, scene);
		} else {
			drawLabel(ctx, annotation, scene);
		}
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
	options?: { splitGuides?: boolean },
): void {
	ctx.clearRect(0, 0, scene.width, scene.height);
	drawBackground(ctx, scene, images);
	drawDeviceFrame(ctx, scene, images);
	drawTextLayers(ctx, scene);
	drawAnnotations(ctx, scene, images);
	if (options?.splitGuides) drawSplitGuides(ctx, scene);
}

/**
 * Editor-only overlay: dashed vertical lines where a panorama scene will be
 * split into individual store screenshots. Never drawn on export — the caller
 * opts in for the live preview only.
 */
function drawSplitGuides(ctx: CanvasRenderingContext2D, scene: SceneData): void {
	const panels = getPanelCount(scene);
	if (panels < 2) return;
	const panelWidth = scene.width / panels;
	ctx.save();
	ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
	ctx.lineWidth = Math.max(2, Math.round(scene.width / 1000));
	ctx.setLineDash([scene.height * 0.02, scene.height * 0.012]);
	for (let i = 1; i < panels; i++) {
		const x = Math.round(panelWidth * i);
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, scene.height);
		ctx.stroke();
	}
	ctx.restore();
}
