import { getDeviceBezel } from "@/lib/device-bezels";
import {
	drawImageToQuad,
	projectRectCorners,
} from "@/lib/perspective";
import {
	buildFontString,
	computeDeviceRect,
	computeImageFit,
	deviceHas3DTilt,
	getPanelCount,
	measureAnnotationBox,
	resolveTextPosition,
	type Rect,
} from "@/lib/screenshot-editor";
import type {
	SceneData,
	SceneDevice,
	SceneDeviceColor,
	SceneImageAnnotation,
	SceneShapeAnnotation,
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
	/** Photographic device bezel PNG ("photo" device style). */
	bezel?: RenderImage;
	/**
	 * Pre-rendered true-3D device ("3d" style): a transparent canvas produced
	 * by the WebGL model renderer, already rotated — drawn centered on the
	 * device rect with no further transforms.
	 */
	deviceModel?: RenderImage;
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

/** Parse #rgb/#rrggbb and scale its brightness by `factor` (0..1 darkens). */
function scaleHexColor(hex: string, factor: number): string {
	const raw = hex.replace("#", "");
	const full =
		raw.length === 3
			? raw
					.split("")
					.map((c) => c + c)
					.join("")
			: raw;
	const num = Number.parseInt(full, 16);
	if (Number.isNaN(num) || full.length !== 6) return hex;
	const scale = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
	const r = scale((num >> 16) & 0xff);
	const g = scale((num >> 8) & 0xff);
	const b = scale(num & 0xff);
	return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Default clay body color (muted periwinkle, reads well on most backgrounds). */
const DEFAULT_CLAY_COLOR = "#8282b2";

/** Resolved fills for a device body, honoring the realistic/clay style. */
interface DeviceFills {
	body: CanvasGradient | string;
	button: string;
	/** Bezel/glass color between the rail and the screen. */
	glass: string;
}

function resolveDeviceFills(
	ctx: CanvasRenderingContext2D,
	frame: Rect,
	device: SceneDevice,
	defaultColor: SceneDeviceColor,
): DeviceFills {
	if ((device.style ?? "realistic") === "clay") {
		const clay = device.clayColor ?? DEFAULT_CLAY_COLOR;
		// Subtle vertical shading so the clay body never reads as a flat sticker.
		const g = ctx.createLinearGradient(0, frame.y, 0, frame.y + frame.height);
		g.addColorStop(0, clay);
		g.addColorStop(1, scaleHexColor(clay, 0.82));
		return {
			body: g,
			button: scaleHexColor(clay, 0.72),
			glass: scaleHexColor(clay, 0.38),
		};
	}
	const color = device.color ?? defaultColor;
	return {
		body: metalGradient(ctx, frame.x, frame.width, color),
		button: color === "silver" ? "#adaba3" : "#2a2c30",
		glass: "#050507",
	};
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

/** 5-point star path centered at (cx, cy) with the given outer radius. */
function starPath(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	outer: number,
): void {
	const inner = outer * 0.42;
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const r = i % 2 === 0 ? outer : inner;
		const a = (i * Math.PI) / 5 - Math.PI / 2;
		const px = cx + r * Math.cos(a);
		const py = cy + r * Math.sin(a);
		if (i === 0) ctx.moveTo(px, py);
		else ctx.lineTo(px, py);
	}
	ctx.closePath();
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
		const kind = background.gradientType ?? "linear";
		const cx = scene.width / 2;
		const cy = scene.height / 2;

		if (kind === "mesh") {
			drawMeshGradient(ctx, scene, from, background.mesh ?? [to]);
		} else if (kind === "radial") {
			const radius = Math.max(scene.width, scene.height) * 0.75;
			const grad = ctx.createRadialGradient(
				cx,
				scene.height * 0.42,
				0,
				cx,
				scene.height * 0.42,
				radius,
			);
			grad.addColorStop(0, from);
			if (background.via) grad.addColorStop(0.5, background.via);
			grad.addColorStop(1, to);
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, scene.width, scene.height);
		} else {
			const rad = (angle * Math.PI) / 180;
			const half = Math.max(scene.width, scene.height);
			const dx = (Math.cos(rad) * half) / 2;
			const dy = (Math.sin(rad) * half) / 2;
			const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
			grad.addColorStop(0, from);
			if (background.via) grad.addColorStop(0.5, background.via);
			grad.addColorStop(1, to);
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, scene.width, scene.height);
		}
	} else {
		ctx.fillStyle = background.value || "#000000";
		ctx.fillRect(0, 0, scene.width, scene.height);
	}

	if (background.pattern) {
		drawBackgroundPattern(ctx, scene, background.pattern);
	}
}

/**
 * Fixed normalized blob anchors for the mesh gradient. Deterministic so a
 * saved scene renders identically on every export. In panorama mode the
 * anchors repeat per panel, giving a seamless multi-artboard wash.
 */
const MESH_ANCHORS: [number, number][] = [
	[0.12, 0.15],
	[0.88, 0.1],
	[0.85, 0.82],
	[0.15, 0.85],
	[0.55, 0.45],
];

/** Base fill + large soft radial blobs — a "mesh gradient" wash. */
function drawMeshGradient(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	base: string,
	colors: string[],
): void {
	ctx.fillStyle = base;
	ctx.fillRect(0, 0, scene.width, scene.height);
	if (colors.length === 0) return;
	const panels = getPanelCount(scene);
	const panelWidth = scene.width / panels;
	const radius = Math.max(panelWidth, scene.height) * 0.62;
	for (let panel = 0; panel < panels; panel++) {
		colors.forEach((color, i) => {
			const [ax, ay] = MESH_ANCHORS[i % MESH_ANCHORS.length];
			// Mirror alternating panels so the wash flows across artboard seams.
			const nx = panel % 2 === 1 ? 1 - ax : ax;
			const bx = panel * panelWidth + nx * panelWidth;
			const by = ay * scene.height;
			const grad = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
			grad.addColorStop(0, color);
			grad.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, scene.width, scene.height);
		});
	}
}

/** Procedural decorative overlay (dots/grid/diagonal/waves/rings). */
function drawBackgroundPattern(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	pattern: NonNullable<SceneData["background"]["pattern"]>,
): void {
	const unit = Math.max(
		12,
		scene.height * 0.045 * Math.max(0.2, pattern.scale || 1),
	);
	ctx.save();
	ctx.globalAlpha = Math.min(Math.max(pattern.opacity, 0), 1);
	ctx.strokeStyle = pattern.color;
	ctx.fillStyle = pattern.color;
	ctx.lineWidth = Math.max(1, unit * 0.045);

	if (pattern.type === "dots") {
		const r = unit * 0.14;
		for (let y = unit / 2; y < scene.height + unit; y += unit) {
			// Offset odd rows for a honeycomb-like rhythm.
			const rowIndex = Math.round(y / unit);
			const offset = rowIndex % 2 === 0 ? 0 : unit / 2;
			for (let x = offset; x < scene.width + unit; x += unit) {
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	} else if (pattern.type === "grid") {
		ctx.beginPath();
		for (let x = 0; x <= scene.width; x += unit) {
			ctx.moveTo(x, 0);
			ctx.lineTo(x, scene.height);
		}
		for (let y = 0; y <= scene.height; y += unit) {
			ctx.moveTo(0, y);
			ctx.lineTo(scene.width, y);
		}
		ctx.stroke();
	} else if (pattern.type === "diagonal") {
		ctx.beginPath();
		const span = scene.width + scene.height;
		for (let d = -scene.height; d < span; d += unit) {
			ctx.moveTo(d, 0);
			ctx.lineTo(d + scene.height, scene.height);
		}
		ctx.stroke();
	} else if (pattern.type === "waves") {
		const amplitude = unit * 0.28;
		const wavelength = unit * 2;
		for (let y = unit / 2; y < scene.height + unit; y += unit) {
			ctx.beginPath();
			ctx.moveTo(-wavelength, y);
			for (let x = -wavelength; x <= scene.width + wavelength; x += 2) {
				ctx.lineTo(x, y + Math.sin((x / wavelength) * Math.PI * 2) * amplitude);
			}
			ctx.stroke();
		}
	} else if (pattern.type === "noise") {
		// Film-grain speckle. Seeded PRNG (mulberry32) keeps the grain layout
		// identical between the preview and every export of the same scene.
		let seed = 0x9e3779b9;
		const rand = (): number => {
			seed |= 0;
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const count = Math.min(
			30000,
			Math.round(((scene.width * scene.height) / (unit * unit)) * 42),
		);
		const grain = Math.max(1, scene.height * 0.0012);
		for (let i = 0; i < count; i++) {
			const x = rand() * scene.width;
			const y = rand() * scene.height;
			const size = grain * (0.5 + rand());
			ctx.globalAlpha =
				Math.min(Math.max(pattern.opacity, 0), 1) * (0.35 + rand() * 0.65);
			ctx.fillRect(x, y, size, size);
		}
	} else {
		// rings: concentric circles from the canvas center outward.
		const cx = scene.width / 2;
		const cy = scene.height / 2;
		const maxR = Math.hypot(scene.width, scene.height) / 2;
		for (let r = unit; r < maxR; r += unit) {
			ctx.beginPath();
			ctx.arc(cx, cy, r, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	ctx.restore();
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

	// Ground shadow first, on the untransformed canvas, so it stays "on the
	// floor" no matter how the device above it is rotated or tilted.
	if (device.groundShadow) {
		const cx = frame.x + frame.width / 2;
		const cy = frame.y + frame.height * 1.03;
		const rx = frame.width * 0.62;
		const ry = frame.width * 0.085;
		const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
		grad.addColorStop(0, "rgba(0,0,0,0.38)");
		grad.addColorStop(0.7, "rgba(0,0,0,0.14)");
		grad.addColorStop(1, "rgba(0,0,0,0)");
		ctx.save();
		ctx.translate(cx, cy);
		ctx.scale(1, ry / rx);
		ctx.translate(-cx, -cy);
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(cx, cy, rx, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	// True-3D style: the WebGL renderer already applied all rotations, so the
	// pre-rendered transparent canvas just lands centered on the device rect
	// (bypasses both the flat path and the 2.5D warp below).
	if (device.style === "3d" && images.deviceModel) {
		const cx = frame.x + frame.width / 2;
		const cy = frame.y + frame.height / 2;
		ctx.drawImage(
			images.deviceModel.source,
			cx - images.deviceModel.width / 2,
			cy - images.deviceModel.height / 2,
			images.deviceModel.width,
			images.deviceModel.height,
		);
		return;
	}

	if (!deviceHas3DTilt(device)) {
		// Flat path (legacy): optional Z rotation via a plain 2D transform.
		ctx.save();
		if (device.rotation) {
			const rcx = frame.x + frame.width / 2;
			const rcy = frame.y + frame.height / 2;
			ctx.translate(rcx, rcy);
			ctx.rotate((device.rotation * Math.PI) / 180);
			ctx.translate(-rcx, -rcy);
		}
		paintDevice(ctx, scene, images, frame);
		ctx.restore();
		return;
	}

	// 3D path: render the device flat to an off-screen canvas (padded so
	// protruding buttons/bands/shadows survive), then perspective-warp that
	// render onto the projected quad. Preview and export share this code, so
	// exported pixels always match the on-screen look.
	const pad = frame.width * (device.frame === "apple-watch" ? 0.34 : 0.16);
	const off = document.createElement("canvas");
	off.width = Math.max(1, Math.ceil(frame.width + pad * 2));
	off.height = Math.max(1, Math.ceil(frame.height + pad * 2));
	const offCtx = off.getContext("2d");
	if (!offCtx) return;
	offCtx.translate(pad - frame.x, pad - frame.y);
	paintDevice(offCtx, scene, images, frame);

	const cx = frame.x + frame.width / 2;
	const cy = frame.y + frame.height / 2;
	const quad = projectRectCorners(
		cx,
		cy,
		off.width,
		off.height,
		device.rotationX ?? 0,
		device.rotationY ?? 0,
		device.rotation ?? 0,
	);
	drawImageToQuad(ctx, off, off.width, off.height, quad);
}

/**
 * Paint the device body + screen at `frame` with no rotation applied — the
 * caller owns transforms (flat Z-rotation or the off-screen 3D warp).
 */
function paintDevice(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
	frame: Rect,
): void {
	const device = scene.device;
	if (!device) return;
	// Photographic bezel wins over programmatic frames; falls back to the
	// realistic painter while the bezel PNG is still decoding.
	if (device.style === "photo" && images.bezel) {
		paintPhotoDevice(ctx, scene, images, frame);
		return;
	}
	switch (device.frame) {
		case "ipad":
		case "android-tablet":
			paintTablet(ctx, scene, images, frame, device);
			return;
		case "apple-watch":
			paintWatch(ctx, scene, images, frame, device);
			return;
		case "laptop":
			paintLaptop(ctx, scene, images, frame, device);
			return;
		default:
			paintPhone(ctx, scene, images, frame, device);
	}
}

/**
 * Photographic device: the screenshot is drawn into the bezel's measured
 * screen cutout, then the bezel PNG is composited on top. The cutout is
 * transparent in the asset, so its rounded corners and the Dynamic Island
 * come from the photo itself — pixel-real, no programmatic drawing.
 */
function paintPhotoDevice(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
	frame: Rect,
): void {
	const bezelImage = images.bezel;
	if (!bezelImage || !scene.device) return;
	const bezel = getDeviceBezel(scene.device.bezelId);
	const screen: Rect = {
		x: frame.x + bezel.screen.x * frame.width,
		y: frame.y + bezel.screen.y * frame.height,
		width: bezel.screen.w * frame.width,
		height: bezel.screen.h * frame.height,
	};
	// A soft drop shadow behind the whole bezel grounds it like the
	// programmatic frames (the PNG itself ships without one).
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.35)";
	ctx.shadowBlur = frame.width * 0.05;
	ctx.shadowOffsetY = frame.width * 0.02;
	// The shadow needs an opaque shape: fill the screen rect (fully covered by
	// the screenshot + bezel afterwards).
	ctx.fillStyle = "#000000";
	ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
	ctx.restore();

	paintScreen(ctx, scene, images, screen, frame.width * 0.001);
	ctx.drawImage(
		bezelImage.source,
		frame.x,
		frame.y,
		frame.width,
		frame.height,
	);
}

/** Fill the screen rect (rounded, clipped) with the screenshot or placeholder. */
function paintScreen(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
	screen: Rect,
	radius: number,
): void {
	ctx.save();
	roundedRectPath(ctx, screen, radius);
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
		// No screenshot yet: a soft gradient placeholder reads better than a
		// flat gray slab (and exports fine if the user ships without one).
		const g = ctx.createLinearGradient(
			screen.x,
			screen.y,
			screen.x,
			screen.y + screen.height,
		);
		g.addColorStop(0, "#26262e");
		g.addColorStop(1, "#131318");
		ctx.fillStyle = g;
		ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
	}

	// Diagonal glass reflection: a soft white sheen fading from the top-left
	// corner, clipped to the screen so it reads as glass, not an overlay.
	if (scene.device?.glare) {
		const g = ctx.createLinearGradient(
			screen.x,
			screen.y,
			screen.x + screen.width,
			screen.y + screen.height * 0.55,
		);
		g.addColorStop(0, "rgba(255,255,255,0.20)");
		g.addColorStop(0.4, "rgba(255,255,255,0.06)");
		g.addColorStop(0.55, "rgba(255,255,255,0)");
		ctx.fillStyle = g;
		ctx.fillRect(screen.x, screen.y, screen.width, screen.height);
	}
	ctx.restore();
}

/** Body + buttons under one drop shadow, then the glass bezel ring. */
function paintBodyAndGlass(
	ctx: CanvasRenderingContext2D,
	frame: Rect,
	fills: DeviceFills,
	bodyRadius: number,
	rail: number,
	buttons: Rect[],
): void {
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.4)";
	ctx.shadowBlur = frame.width * 0.05;
	ctx.shadowOffsetY = frame.width * 0.02;
	ctx.fillStyle = fills.button;
	for (const b of buttons) {
		roundedRectPath(ctx, b, b.width * 0.4);
		ctx.fill();
	}
	ctx.fillStyle = fills.body;
	roundedRectPath(ctx, frame, bodyRadius);
	ctx.fill();
	ctx.restore();

	const glass: Rect = {
		x: frame.x + rail,
		y: frame.y + rail,
		width: frame.width - rail * 2,
		height: frame.height - rail * 2,
	};
	ctx.fillStyle = fills.glass;
	roundedRectPath(ctx, glass, bodyRadius - rail);
	ctx.fill();
}

/** Modern phone: titanium rail, Dynamic Island (iPhone) / hole-punch (Android). */
function paintPhone(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
	frame: Rect,
	device: SceneDevice,
): void {
	const isAndroid = device.frame === "android";
	// Default color per platform preserves the look of scenes saved before the
	// color option existed (iPhone silver, Android black).
	const fills = resolveDeviceFills(
		ctx,
		frame,
		device,
		isAndroid ? "black" : "silver",
	);
	const W = frame.width;
	const bodyRadius =
		W * (isAndroid ? BODY_RADIUS_RATIO.android : BODY_RADIUS_RATIO.iphone);
	const rail = W * RAIL_RATIO;
	const bezel = W * BEZEL_RATIO;
	const cx = frame.x + W / 2;

	paintBodyAndGlass(
		ctx,
		frame,
		fills,
		bodyRadius,
		rail,
		deviceButtons(frame, isAndroid),
	);

	const screen: Rect = {
		x: frame.x + bezel,
		y: frame.y + bezel,
		width: W - bezel * 2,
		height: frame.height - bezel * 2,
	};
	paintScreen(ctx, scene, images, screen, bodyRadius - bezel);

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
}

// Tablet proportions (fractions of frame width).
const TABLET_RADIUS_RATIO = 0.055;
const TABLET_RAIL_RATIO = 0.011;
const TABLET_BEZEL_RATIO = 0.042;

/** iPad / Android slate: uniform bezel, camera dot (iPad) or hole-punch. */
function paintTablet(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
	frame: Rect,
	device: SceneDevice,
): void {
	const isAndroid = device.frame === "android-tablet";
	const fills = resolveDeviceFills(
		ctx,
		frame,
		device,
		isAndroid ? "black" : "silver",
	);
	const W = frame.width;
	const bodyRadius = W * TABLET_RADIUS_RATIO;
	const rail = W * TABLET_RAIL_RATIO;
	const bezel = W * TABLET_BEZEL_RATIO;
	const cx = frame.x + W / 2;

	// Power + volume on the right edge.
	const bt = W * BTN_THICKNESS_RATIO * 0.9;
	const bp = W * BTN_PROTRUDE_RATIO * 0.9;
	const buttons: Rect[] = [
		{
			x: frame.x + W - bt * 0.4,
			y: frame.y + frame.height * 0.06,
			width: bt + bp,
			height: frame.height * 0.045,
		},
		{
			x: frame.x + W - bt * 0.4,
			y: frame.y + frame.height * 0.125,
			width: bt + bp,
			height: frame.height * 0.09,
		},
	];
	paintBodyAndGlass(ctx, frame, fills, bodyRadius, rail, buttons);

	const screen: Rect = {
		x: frame.x + bezel,
		y: frame.y + bezel,
		width: W - bezel * 2,
		height: frame.height - bezel * 2,
	};
	paintScreen(ctx, scene, images, screen, bodyRadius - bezel);

	if (isAndroid) {
		const holeCy = screen.y + W * 0.032;
		fillCircle(ctx, cx, holeCy, W * 0.014, "#000000");
		fillCircle(ctx, cx, holeCy, W * 0.007, "#0b1a2b");
	} else {
		// iPad front camera sits in the bezel, not the screen.
		const camCy = frame.y + bezel / 2 + rail / 2;
		fillCircle(ctx, cx, camCy, W * 0.008, "#1a1c20");
		fillCircle(ctx, cx, camCy, W * 0.004, "#0b1a2b");
	}
}

// Apple Watch proportions (fractions of frame width/height).
const WATCH_RADIUS_RATIO = 0.3;
const WATCH_RAIL_RATIO = 0.028;
const WATCH_BEZEL_RATIO = 0.085;
const WATCH_BAND_WIDTH_RATIO = 0.56;
const WATCH_BAND_LENGTH_RATIO = 0.2;

/** Apple Watch: squircle body, digital crown + side button, band stubs. */
function paintWatch(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
	frame: Rect,
	device: SceneDevice,
): void {
	const fills = resolveDeviceFills(ctx, frame, device, "silver");
	const W = frame.width;
	const H = frame.height;
	const bodyRadius = W * WATCH_RADIUS_RATIO;
	const rail = W * WATCH_RAIL_RATIO;
	const bezel = W * WATCH_BEZEL_RATIO;
	const cx = frame.x + W / 2;

	// Band stubs behind the body (top + bottom).
	const bandW = W * WATCH_BAND_WIDTH_RATIO;
	const bandL = H * WATCH_BAND_LENGTH_RATIO;
	const isClay = (device.style ?? "realistic") === "clay";
	const bandColor = isClay
		? scaleHexColor(device.clayColor ?? DEFAULT_CLAY_COLOR, 0.6)
		: "#1f2126";
	ctx.save();
	ctx.fillStyle = bandColor;
	roundedRectPath(
		ctx,
		{ x: cx - bandW / 2, y: frame.y - bandL, width: bandW, height: bandL + rail * 2 },
		W * 0.06,
	);
	ctx.fill();
	roundedRectPath(
		ctx,
		{
			x: cx - bandW / 2,
			y: frame.y + H - rail * 2,
			width: bandW,
			height: bandL + rail * 2,
		},
		W * 0.06,
	);
	ctx.fill();
	ctx.restore();

	// Digital crown + side button on the right edge.
	const crownW = W * 0.045;
	const buttons: Rect[] = [
		{
			x: frame.x + W - crownW * 0.35,
			y: frame.y + H * 0.22,
			width: crownW,
			height: H * 0.14,
		},
		{
			x: frame.x + W - crownW * 0.3,
			y: frame.y + H * 0.44,
			width: crownW * 0.75,
			height: H * 0.2,
		},
	];
	paintBodyAndGlass(ctx, frame, fills, bodyRadius, rail, buttons);

	const screen: Rect = {
		x: frame.x + bezel,
		y: frame.y + bezel,
		width: W - bezel * 2,
		height: H - bezel * 2,
	};
	paintScreen(ctx, scene, images, screen, bodyRadius - bezel);
}

// Laptop proportions (fractions of frame width).
const LAPTOP_LID_WIDTH_RATIO = 0.86;
const LAPTOP_LID_BEZEL_RATIO = 0.014;
const LAPTOP_BASE_HEIGHT_RATIO = 0.045;

/** Laptop: 16:10 lid centered over a wider base with a front notch. */
function paintLaptop(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	images: RenderImages,
	frame: Rect,
	device: SceneDevice,
): void {
	const fills = resolveDeviceFills(ctx, frame, device, "silver");
	const W = frame.width;
	const cx = frame.x + W / 2;
	const lidW = W * LAPTOP_LID_WIDTH_RATIO;
	const lidBezel = W * LAPTOP_LID_BEZEL_RATIO;
	const screenW = lidW - lidBezel * 2;
	const screenH = screenW * (10 / 16);
	const lidH = screenH + lidBezel * 2;
	const baseH = W * LAPTOP_BASE_HEIGHT_RATIO;
	const lid: Rect = {
		x: cx - lidW / 2,
		y: frame.y,
		width: lidW,
		height: lidH,
	};

	// Lid with shared drop shadow.
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.35)";
	ctx.shadowBlur = W * 0.03;
	ctx.shadowOffsetY = W * 0.012;
	ctx.fillStyle = fills.body;
	roundedRectPath(ctx, lid, W * 0.02);
	ctx.fill();
	ctx.restore();

	// Glass inside the lid.
	ctx.fillStyle = fills.glass;
	roundedRectPath(
		ctx,
		{
			x: lid.x + lidBezel * 0.5,
			y: lid.y + lidBezel * 0.5,
			width: lidW - lidBezel,
			height: lidH - lidBezel,
		},
		W * 0.016,
	);
	ctx.fill();

	const screen: Rect = {
		x: lid.x + lidBezel,
		y: lid.y + lidBezel,
		width: screenW,
		height: screenH,
	};
	paintScreen(ctx, scene, images, screen, W * 0.01);

	// Webcam dot centered in the top bezel.
	fillCircle(ctx, cx, lid.y + lidBezel / 2, W * 0.004, "#0b1a2b");

	// Base/deck: full frame width, rounded bottom, subtle top hinge line and a
	// centered front notch.
	const baseY = lid.y + lidH;
	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.35)";
	ctx.shadowBlur = W * 0.025;
	ctx.shadowOffsetY = W * 0.01;
	ctx.fillStyle = fills.body;
	roundedRectPath(
		ctx,
		{ x: frame.x, y: baseY, width: W, height: baseH },
		baseH * 0.45,
	);
	ctx.fill();
	ctx.restore();
	// Notch (thumb scoop) on the front edge of the base.
	const notchW = W * 0.12;
	ctx.fillStyle = "rgba(0,0,0,0.28)";
	ctx.beginPath();
	ctx.ellipse(cx, baseY, notchW / 2, baseH * 0.34, 0, 0, Math.PI);
	ctx.fill();
}

/** Apply optional letterSpacing (not in the lib's ctx type in every TS env). */
function applyLetterSpacing(
	ctx: CanvasRenderingContext2D,
	spacing: number | undefined,
): void {
	if (!spacing) return;
	const target = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
	if ("letterSpacing" in target) target.letterSpacing = `${spacing}px`;
}

/**
 * Draw one line of text bent along a circular arc spanning `curveDeg` degrees
 * (positive arches upward). Each glyph is positioned and rotated individually;
 * `paint` runs per glyph so stroke and fill passes share the layout.
 */
function drawCurvedLine(
	ctx: CanvasRenderingContext2D,
	line: string,
	cx: number,
	cy: number,
	curveDeg: number,
	paint: (ch: string) => void,
): void {
	const chars = [...line];
	if (chars.length === 0) return;
	const widths = chars.map((ch) => ctx.measureText(ch).width);
	const total = widths.reduce((a, b) => a + b, 0);
	if (total <= 0) return;
	const arc = (Math.min(Math.abs(curveDeg), 180) * Math.PI) / 180;
	if (arc < 0.01) return;
	const radius = total / arc;
	const up = curveDeg > 0;
	let traveled = 0;
	for (let i = 0; i < chars.length; i++) {
		const mid = traveled + widths[i] / 2;
		const theta = (mid / total - 0.5) * arc;
		const px = cx + radius * Math.sin(theta);
		const py = up
			? cy + radius - radius * Math.cos(theta)
			: cy - radius + radius * Math.cos(theta);
		ctx.save();
		ctx.translate(px, py);
		ctx.rotate(up ? theta : -theta);
		paint(chars[i]);
		ctx.restore();
		traveled += widths[i];
	}
}

function drawTextLayers(ctx: CanvasRenderingContext2D, scene: SceneData): void {
	for (const layer of scene.textLayers) {
		const { x, y } = resolveTextPosition(layer, scene);
		ctx.save();
		ctx.font = buildFontString(layer);
		applyLetterSpacing(ctx, layer.letterSpacing);
		const lines = layer.text.split("\n");
		const lineHeight = layer.fontSize * (layer.lineHeight ?? 1.2);
		const totalHeight = lineHeight * (lines.length - 1);
		const lineY = (i: number) => y - totalHeight / 2 + i * lineHeight;
		const curve = layer.curve ?? 0;
		// Curved text always renders centered on its anchor, so the background
		// panel and highlight bars must follow the same alignment or they drift
		// away from the glyphs.
		const align = curve !== 0 ? "center" : layer.align;

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
			if (align === "left") boxX = x - padX;
			else if (align === "right") boxX = x - maxWidth - padX;
			const box: Rect = { x: boxX, y: y - boxH / 2, width: boxW, height: boxH };
			ctx.fillStyle = layer.bg;
			roundedRectPath(ctx, box, layer.fontSize * 0.25);
			ctx.fill();
		}

		// Marker-style highlight bar behind each line.
		if (layer.highlight) {
			ctx.fillStyle = layer.highlight;
			lines.forEach((line, i) => {
				const w = ctx.measureText(line).width;
				if (w <= 0) return;
				const pad = layer.fontSize * 0.18;
				let left = x - w / 2;
				if (align === "left") left = x;
				else if (align === "right") left = x - w;
				const barH = layer.fontSize * 0.82;
				roundedRectPath(
					ctx,
					{
						x: left - pad,
						y: lineY(i) - barH / 2 + layer.fontSize * 0.06,
						width: w + pad * 2,
						height: barH,
					},
					barH * 0.28,
				);
				ctx.fill();
			});
		}

		ctx.textAlign = align;
		ctx.textBaseline = "middle";

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

		// Gradient fill spans the whole text block vertically (overrides color).
		const fillStyle: string | CanvasGradient = layer.gradient
			? (() => {
					const g = ctx.createLinearGradient(
						0,
						y - totalHeight / 2 - layer.fontSize * 0.6,
						0,
						y + totalHeight / 2 + layer.fontSize * 0.6,
					);
					g.addColorStop(0, layer.gradient.from);
					g.addColorStop(1, layer.gradient.to);
					return g;
				})()
			: layer.color;

		const strokePass = () => {
			if (!hasStroke || !layer.strokeColor) return;
			ctx.lineJoin = "round";
			ctx.miterLimit = 2;
			ctx.strokeStyle = layer.strokeColor;
			// The canvas stroke straddles the glyph edge, so double the width to get
			// the requested visible outline thickness outside the fill.
			ctx.lineWidth = (layer.strokeWidth ?? 0) * 2;
		};
		const clearShadow = () => {
			ctx.shadowColor = "transparent";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;
		};

		if (curve !== 0) {
			// Glyphs are laid out along the arc, so each one is drawn centered on
			// its own arc position (`align` is already forced to center above).
			lines.forEach((line, i) => {
				if (hasStroke && layer.strokeColor) {
					strokePass();
					drawCurvedLine(ctx, line, x, lineY(i), curve, (ch) =>
						ctx.strokeText(ch, 0, 0),
					);
					clearShadow();
				}
				ctx.fillStyle = fillStyle;
				drawCurvedLine(ctx, line, x, lineY(i), curve, (ch) =>
					ctx.fillText(ch, 0, 0),
				);
			});
		} else {
			// Outline pass first (cartoon "stroke behind fill" look). The shadow
			// rides on this pass when a stroke exists, so the fill stays crisp.
			if (hasStroke && layer.strokeColor) {
				strokePass();
				lines.forEach((line, i) => {
					ctx.strokeText(line, x, lineY(i));
				});
				clearShadow();
			}
			ctx.fillStyle = fillStyle;
			lines.forEach((line, i) => {
				ctx.fillText(line, x, lineY(i));
			});
		}
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

/**
 * Draw one laurel branch: a curved stem with leaf pairs along it. Drawn in
 * local coordinates rising from (0,0); the caller mirrors it for the right
 * side. `height` is the branch's vertical extent.
 */
function drawLaurelBranch(
	ctx: CanvasRenderingContext2D,
	height: number,
	color: string,
): void {
	const leafLength = height * 0.16;
	const leafWidth = leafLength * 0.42;
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = Math.max(1.5, height * 0.02);
	// Stem: arc bending outward (to the left).
	ctx.beginPath();
	ctx.moveTo(0, height / 2);
	ctx.quadraticCurveTo(-height * 0.32, 0, 0, -height / 2);
	ctx.stroke();
	// Leaf pairs along the stem.
	const steps = 6;
	for (let i = 0; i < steps; i++) {
		const t = (i + 0.5) / steps;
		// Point on the quadratic curve.
		const mt = 1 - t;
		const px = 2 * mt * t * -height * 0.32;
		const py = mt * mt * (height / 2) + t * t * (-height / 2);
		// Tangent angle of the curve at t.
		const dx = 2 * (1 - 2 * t) * -height * 0.32;
		const dy = -height;
		const angle = Math.atan2(dy, dx);
		for (const side of [-1, 1]) {
			ctx.save();
			ctx.translate(px, py);
			ctx.rotate(angle + (side * Math.PI) / 3.2);
			ctx.beginPath();
			ctx.ellipse(leafLength / 2, 0, leafLength / 2, leafWidth / 2, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}
}

/** Draw an award laurel: mirrored branches around up to three text lines. */
function drawLaurel(
	ctx: CanvasRenderingContext2D,
	annotation: SceneTextAnnotation & { type: "laurel" },
	scene: SceneData,
): void {
	const box = measureAnnotationBox(annotation, scene);
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;
	const branchHeight = box.height * 0.92;

	ctx.save();
	ctx.translate(cx - box.width / 2 + annotation.fontSize * 1.1, cy);
	drawLaurelBranch(ctx, branchHeight, annotation.color);
	ctx.restore();
	ctx.save();
	ctx.translate(cx + box.width / 2 - annotation.fontSize * 1.1, cy);
	ctx.scale(-1, 1);
	drawLaurelBranch(ctx, branchHeight, annotation.color);
	ctx.restore();

	ctx.save();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = annotation.color;
	const family = annotation.fontFamily ?? "Inter, system-ui, sans-serif";
	const smallSize = Math.round(annotation.fontSize * 0.55);
	const lines = annotation.text.split("\n");
	const mainHeight = lines.length * annotation.fontSize * 1.15;
	let y = cy - mainHeight / 2;
	if (annotation.textTop) {
		ctx.font = `600 ${smallSize}px ${family}`;
		ctx.fillText(annotation.textTop, cx, y - smallSize * 0.75);
	}
	ctx.font = buildFontString({
		fontFamily: family,
		fontSize: annotation.fontSize,
		weight: annotation.weight ?? 800,
	});
	lines.forEach((line, i) => {
		ctx.fillText(
			line,
			cx,
			y + annotation.fontSize * 0.575 + i * annotation.fontSize * 1.15,
		);
	});
	y += mainHeight;
	if (annotation.textBottom) {
		ctx.font = `600 ${smallSize}px ${family}`;
		ctx.fillText(annotation.textBottom, cx, y + smallSize * 0.85);
	}
	ctx.restore();
}

/** Draw a review card: quote mark, quote, star row and author line. */
function drawReview(
	ctx: CanvasRenderingContext2D,
	annotation: SceneTextAnnotation & { type: "review" },
	scene: SceneData,
): void {
	const box = measureAnnotationBox(annotation, scene);
	const cx = box.x + box.width / 2;
	const fontSize = annotation.fontSize;
	const family = annotation.fontFamily ?? "Inter, system-ui, sans-serif";

	if (annotation.showBackground) {
		ctx.save();
		ctx.shadowColor = "rgba(0,0,0,0.25)";
		ctx.shadowBlur = fontSize * 0.5;
		ctx.shadowOffsetY = fontSize * 0.15;
		ctx.fillStyle = annotation.bg;
		roundedRectPath(ctx, box, fontSize * 0.6);
		ctx.fill();
		ctx.restore();
	}

	ctx.save();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = annotation.color;
	let y = box.y + fontSize * 1.1;

	if (annotation.showQuoteMark !== false) {
		ctx.font = `900 ${Math.round(fontSize * 2.4)}px Georgia, serif`;
		ctx.fillText("“", cx, y + fontSize * 0.45);
		y += fontSize * 1.5;
	}

	ctx.font = buildFontString({
		fontFamily: family,
		fontSize,
		weight: annotation.weight ?? 600,
	});
	const lines = annotation.text.split("\n");
	lines.forEach((line) => {
		ctx.fillText(line, cx, y + fontSize * 0.6);
		y += fontSize * 1.2;
	});

	const stars = Math.max(0, Math.min(5, annotation.stars ?? 5));
	if (stars > 0) {
		y += fontSize * 0.55;
		const starR = fontSize * 0.38;
		const gap = starR * 0.7;
		const step = starR * 2 + gap;
		const startX = cx - ((stars - 1) * step) / 2;
		for (let i = 0; i < stars; i++) {
			starPath(ctx, startX + i * step, y, starR);
			ctx.fill();
		}
		y += fontSize * 0.75;
	}

	if (annotation.author) {
		y += fontSize * 0.45;
		ctx.globalAlpha *= 0.75;
		ctx.font = `500 ${Math.round(fontSize * 0.62)}px ${family}`;
		ctx.fillText(annotation.author, cx, y);
	}
	ctx.restore();
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

/**
 * Draw a decorative hand-drawn shape. Paths are defined in the shape's local
 * box (centered at 0,0) so rotation/flip compose naturally. Deterministic —
 * the same scene always exports the same pixels.
 */
function drawShapeAnnotation(
	ctx: CanvasRenderingContext2D,
	annotation: SceneShapeAnnotation,
	scene: SceneData,
): void {
	const box = measureAnnotationBox(annotation, scene);
	const w = box.width;
	const h = box.height;
	ctx.save();
	ctx.globalAlpha = Math.min(Math.max(annotation.opacity ?? 1, 0), 1);
	ctx.translate(box.x + w / 2, box.y + h / 2);
	if (annotation.rotation) ctx.rotate((annotation.rotation * Math.PI) / 180);
	if (annotation.flip) ctx.scale(-1, 1);
	ctx.strokeStyle = annotation.color;
	ctx.fillStyle = annotation.color;
	ctx.lineWidth = Math.max(2, annotation.strokeWidth ?? h * 0.16);
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	switch (annotation.shape) {
		case "underline": {
			ctx.beginPath();
			ctx.moveTo(-w * 0.48, h * 0.2);
			ctx.quadraticCurveTo(0, -h * 0.4, w * 0.48, h * 0.05);
			ctx.stroke();
			break;
		}
		case "squiggle": {
			const bumps = 4;
			const step = (w * 0.94) / bumps;
			ctx.beginPath();
			ctx.moveTo(-w * 0.47, 0);
			for (let i = 0; i < bumps; i++) {
				const x0 = -w * 0.47 + step * i;
				const dir = i % 2 === 0 ? -1 : 1;
				ctx.quadraticCurveTo(x0 + step / 2, dir * h * 0.9, x0 + step, 0);
			}
			ctx.stroke();
			break;
		}
		case "arrow": {
			// Curved shaft ending bottom-right, plus a two-line head.
			ctx.beginPath();
			ctx.moveTo(-w * 0.45, -h * 0.38);
			ctx.quadraticCurveTo(w * 0.15, -h * 0.55, w * 0.42, h * 0.3);
			ctx.stroke();
			// Tangent at the end of the quadratic points from the control point.
			const angle = Math.atan2(h * 0.3 - -h * 0.55, w * 0.42 - w * 0.15);
			const headLen = Math.min(w, h) * 0.32;
			const tipX = w * 0.42;
			const tipY = h * 0.3;
			ctx.beginPath();
			ctx.moveTo(
				tipX - headLen * Math.cos(angle - 0.5),
				tipY - headLen * Math.sin(angle - 0.5),
			);
			ctx.lineTo(tipX, tipY);
			ctx.lineTo(
				tipX - headLen * Math.cos(angle + 0.5),
				tipY - headLen * Math.sin(angle + 0.5),
			);
			ctx.stroke();
			break;
		}
		case "circle": {
			// Hand-drawn emphasis ellipse: slightly tilted, over-closed arc.
			ctx.beginPath();
			ctx.ellipse(0, 0, w * 0.46, h * 0.4, -0.08, 0.35, Math.PI * 2 + 0.75);
			ctx.stroke();
			break;
		}
		case "sparkle": {
			// 4-point concave star.
			const r = Math.min(w, h) / 2;
			const pinch = r * 0.18;
			ctx.beginPath();
			ctx.moveTo(0, -r);
			ctx.quadraticCurveTo(pinch, -pinch, r, 0);
			ctx.quadraticCurveTo(pinch, pinch, 0, r);
			ctx.quadraticCurveTo(-pinch, pinch, -r, 0);
			ctx.quadraticCurveTo(-pinch, -pinch, 0, -r);
			ctx.closePath();
			ctx.fill();
			break;
		}
		case "star": {
			starPath(ctx, 0, 0, Math.min(w, h) / 2);
			ctx.fill();
			break;
		}
		case "rating": {
			// Five-star review row — the classic ASO social-proof element.
			const starOuter = Math.min(w / 11, h / 2);
			const gap = starOuter * 0.6;
			const step = starOuter * 2 + gap;
			const startX = -2 * step;
			for (let i = 0; i < 5; i++) {
				starPath(ctx, startX + i * step, 0, starOuter);
				ctx.fill();
			}
			break;
		}
		case "heart": {
			const r = Math.min(w, h) / 2;
			ctx.beginPath();
			ctx.moveTo(0, r * 0.75);
			ctx.bezierCurveTo(-r * 1.25, -r * 0.1, -r * 0.65, -r, 0, -r * 0.35);
			ctx.bezierCurveTo(r * 0.65, -r, r * 1.25, -r * 0.1, 0, r * 0.75);
			ctx.closePath();
			ctx.fill();
			break;
		}
		case "check": {
			ctx.lineWidth = Math.max(
				ctx.lineWidth,
				Math.min(w, h) * 0.18,
			);
			ctx.beginPath();
			ctx.moveTo(-w * 0.34, h * 0.02);
			ctx.lineTo(-w * 0.08, h * 0.3);
			ctx.lineTo(w * 0.38, -h * 0.32);
			ctx.stroke();
			break;
		}
		default: {
			// blob: organic filled shape from four bezier lobes.
			ctx.beginPath();
			ctx.moveTo(-w * 0.42, 0);
			ctx.bezierCurveTo(-w * 0.45, -h * 0.55, -w * 0.05, -h * 0.5, w * 0.3, -h * 0.32);
			ctx.bezierCurveTo(w * 0.52, -h * 0.18, w * 0.46, h * 0.28, w * 0.18, h * 0.42);
			ctx.bezierCurveTo(-w * 0.08, h * 0.55, -w * 0.38, h * 0.35, -w * 0.42, 0);
			ctx.closePath();
			ctx.fill();
			break;
		}
	}
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
		} else if (annotation.type === "shape") {
			drawShapeAnnotation(ctx, annotation, scene);
		} else if (annotation.type === "callout") {
			drawCallout(ctx, annotation, scene);
		} else if (annotation.type === "badge") {
			drawBadge(ctx, annotation, scene);
		} else if (annotation.type === "laurel") {
			drawLaurel(ctx, annotation, scene);
		} else if (annotation.type === "review") {
			drawReview(ctx, annotation, scene);
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
	options?: {
		splitGuides?: boolean;
		/** Normalized snap guide lines shown while dragging (preview only). */
		guides?: { x?: number; y?: number };
	},
): void {
	ctx.clearRect(0, 0, scene.width, scene.height);
	drawBackground(ctx, scene, images);
	drawDeviceFrame(ctx, scene, images);
	drawTextLayers(ctx, scene);
	drawAnnotations(ctx, scene, images);
	if (options?.splitGuides) drawSplitGuides(ctx, scene);
	if (options?.guides) drawSnapGuides(ctx, scene, options.guides);
}

/**
 * Editor-only overlay: cyan alignment lines shown while a dragged layer snaps
 * to a target (canvas/panel center, panel seam, device center). Never drawn on
 * export.
 */
function drawSnapGuides(
	ctx: CanvasRenderingContext2D,
	scene: SceneData,
	guides: { x?: number; y?: number },
): void {
	ctx.save();
	ctx.strokeStyle = "#22d3ee";
	ctx.lineWidth = Math.max(2, Math.round(scene.width / 1200));
	ctx.setLineDash([scene.height * 0.012, scene.height * 0.008]);
	if (guides.x !== undefined) {
		const x = guides.x * scene.width;
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, scene.height);
		ctx.stroke();
	}
	if (guides.y !== undefined) {
		const y = guides.y * scene.height;
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(scene.width, y);
		ctx.stroke();
	}
	ctx.restore();
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
