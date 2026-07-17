import { getDeviceBezel } from "@/lib/device-bezels";
import { projectRectCorners, quadBounds } from "@/lib/perspective";
import type {
	SceneAnnotation,
	SceneAnnotationType,
	SceneBackgroundFit,
	SceneData,
	SceneDevice,
	SceneDeviceFrame,
	SceneExtraDevice,
	SceneImageAnnotation,
	SceneShapeAnnotation,
	SceneShapeKind,
	SceneTextAnnotation,
} from "@/lib/types";

// Exact device target dimensions keyed by displayType. Mirrors the backend
// REQUIRED_SIZES (publishing.service.ts): the FIRST entry of each preset is the
// canonical portrait size the editor exports at, so the 1.4 dimension validation
// accepts the uploaded PNG without cropping. Both FE and BE must agree here.
export const DISPLAY_TYPE_TARGETS: Record<string, [number, number]> = {
	APP_IPHONE_35: [640, 1136],
	APP_IPHONE_40: [640, 1136],
	APP_IPHONE_47: [750, 1334],
	APP_IPHONE_55: [1242, 2208],
	APP_IPHONE_58: [1125, 2436],
	APP_IPHONE_61: [1284, 2778],
	APP_IPHONE_65: [1242, 2688],
	APP_IPHONE_67: [1290, 2796],
	APP_IPAD_PRO_129: [2048, 2732],
	// Android — Google Play accepts custom sizes; reuse iPhone-compatible targets
	phone: [1080, 1920],
	sevenInch: [2048, 2732],
	tenInch: [2048, 2732],
};

// Human-friendly labels, mirrors DISPLAY_TYPE_NAMES on the backend.
export const DISPLAY_TYPE_LABELS: Record<string, string> = {
	APP_IPHONE_35: 'iPhone 3.5"',
	APP_IPHONE_40: 'iPhone 4.0"',
	APP_IPHONE_47: 'iPhone 4.7"',
	APP_IPHONE_55: 'iPhone 5.5"',
	APP_IPHONE_58: 'iPhone 5.8"',
	APP_IPHONE_61: 'iPhone 6.1"',
	APP_IPHONE_65: 'iPhone 6.5"',
	APP_IPHONE_67: 'iPhone 6.7"',
	APP_IPAD_PRO_129: 'iPad Pro 12.9"',
	phone: "Android phone",
	sevenInch: 'Android 7" tablet',
	tenInch: 'Android 10" tablet',
};

const DEFAULT_TARGET: [number, number] = [1290, 2796];

/** Exact [width, height] the canvas backing store (and export) must use. */
export function getTargetDimensions(displayType: string): [number, number] {
	return DISPLAY_TYPE_TARGETS[displayType] ?? DEFAULT_TARGET;
}

/** Display label for a display type, falling back to the raw key. */
export function getDisplayTypeLabel(displayType: string): string {
	return DISPLAY_TYPE_LABELS[displayType] ?? displayType;
}

/** Default frame per display type: platform + form factor aware. */
export function defaultFrameForDisplayType(
	displayType: string,
): SceneDeviceFrame {
	if (displayType === "phone") return "android";
	if (displayType === "sevenInch" || displayType === "tenInch") {
		return "android-tablet";
	}
	if (displayType === "APP_IPAD_PRO_129") return "ipad";
	return "iphone";
}

/**
 * Build a fresh scene at the exact target dimensions for a display type. Used
 * when the user opens the editor with no existing scene.
 */
export function createDefaultScene(displayType: string): SceneData {
	const [width, height] = getTargetDimensions(displayType);
	return {
		width,
		height,
		background: {
			type: "gradient",
			value: "#6366f1",
			gradient: { from: "#6366f1", to: "#8b5cf6", angle: 135 },
		},
		device: {
			frame: defaultFrameForDisplayType(displayType),
			scale: 0.72,
			offsetX: 0,
			offsetY: 0.12,
			rotation: 0,
		},
		textLayers: [
			{
				id: "headline",
				text: "Your headline",
				x: 0.5,
				y: 0.08,
				fontFamily: "Inter, system-ui, sans-serif",
				fontSize: Math.round(height * 0.045),
				color: "#ffffff",
				align: "center",
				weight: 700,
			},
		],
	};
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Number of panorama panels in a scene (1 = a regular single screenshot). */
export function getPanelCount(scene: Pick<SceneData, "panels">): number {
	const panels = scene.panels ?? 1;
	return Number.isFinite(panels) && panels >= 1 ? Math.round(panels) : 1;
}

export type SceneOrientation = "portrait" | "landscape";

/**
 * Orientation of a scene, derived from one panel's dimensions (a panorama's
 * full width spans several store screenshots). Square-ish panels count as
 * portrait, matching the store defaults.
 */
export function getSceneOrientation(
	scene: Pick<SceneData, "width" | "height" | "panels">,
): SceneOrientation {
	const panelWidth = scene.width / getPanelCount(scene);
	return panelWidth > scene.height ? "landscape" : "portrait";
}

/** Target [width, height] for a display type in the requested orientation. */
export function getTargetDimensionsFor(
	displayType: string,
	orientation: SceneOrientation,
): [number, number] {
	const [w, h] = getTargetDimensions(displayType);
	return orientation === "landscape" ? [h, w] : [w, h];
}

/**
 * Resize the scene canvas to the display type's target in the given
 * orientation, keeping the panel count. Layers keep their normalized
 * positions, so switching orientation re-flows instead of destroying work.
 * Store validation accepts both orientations (backend REQUIRED_SIZES lists
 * portrait and landscape for every iOS display type; Google Play is flexible).
 */
export function applyOrientation(
	scene: SceneData,
	displayType: string,
	orientation: SceneOrientation,
): SceneData {
	const [targetWidth, targetHeight] = getTargetDimensionsFor(
		displayType,
		orientation,
	);
	return {
		...scene,
		height: targetHeight,
		width: targetWidth * getPanelCount(scene),
	};
}

/**
 * Resize a scene to span `panels` store screenshots side by side. The canvas
 * width becomes target width × panels; layers keep their normalized positions
 * and the scene's current orientation is preserved.
 */
export function applyPanelCount(
	scene: SceneData,
	displayType: string,
	panels: number,
): SceneData {
	const [targetWidth, targetHeight] = getTargetDimensionsFor(
		displayType,
		getSceneOrientation(scene),
	);
	const count = Math.max(1, Math.round(panels));
	return {
		...scene,
		height: targetHeight,
		panels: count,
		width: targetWidth * count,
	};
}

/**
 * Body aspect ratio (height / width) per device frame. Phones keep the legacy
 * 2.05 so pre-existing scenes render pixel-identical; tablets read as iPad /
 * Android slates, the watch as a squircle body, the laptop as a wide lid +
 * base silhouette.
 */
export const DEVICE_BODY_ASPECT: Record<
	Exclude<SceneDeviceFrame, "none">,
	number
> = {
	android: 2.05,
	"android-tablet": 1.42,
	"apple-watch": 1.14,
	ipad: 1.34,
	iphone: 2.05,
	laptop: 0.6,
};

/** Aspect for a frame, defaulting to the phone silhouette for unknown values. */
export function deviceBodyAspect(frame: SceneDeviceFrame): number {
	return frame === "none" ? 2.05 : (DEVICE_BODY_ASPECT[frame] ?? 2.05);
}

/**
 * Aspect (height / width) of the device as configured: photographic bezels
 * carry their own asset aspect; programmatic frames use the per-frame table.
 */
export function deviceAspect(
	device: NonNullable<SceneData["device"]>,
): number {
	if (device.style === "photo") {
		const bezel = getDeviceBezel(device.bezelId);
		return bezel.height / bezel.width;
	}
	return deviceBodyAspect(device.frame);
}

/**
 * Compute the on-canvas pixel rect of the device frame from the scene's device
 * config. `scale` is the fraction of canvas width the frame spans; `offsetX/Y`
 * are fractions of canvas size from center. Pure — drives both render and tests.
 */
export function computeDeviceRect(scene: SceneData): Rect | null {
	if (!scene.device) return null;
	return computeDeviceRectFor(scene.device, scene);
}

/** Device rect for ANY device config (primary or an extra mockup). */
export function computeDeviceRectFor(
	device: SceneDevice,
	scene: Pick<SceneData, "width" | "height" | "panels">,
): Rect {
	const { scale, offsetX, offsetY } = device;
	// In panorama mode `scale` stays a fraction of ONE panel's width, so the
	// frame keeps its size when the canvas widens to N panels.
	const frameWidth = (scene.width / getPanelCount(scene)) * scale;
	const frameHeight = frameWidth * deviceAspect(device);
	const centerX = scene.width / 2 + offsetX * scene.width;
	const centerY = scene.height / 2 + offsetY * scene.height;
	return {
		x: centerX - frameWidth / 2,
		y: centerY - frameHeight / 2,
		width: frameWidth,
		height: frameHeight,
	};
}

/** Fresh extra device mockup, offset so it never hides the primary one. */
export function createExtraDevice(
	id: string,
	scene: Pick<SceneData, "device" | "extraDevices">,
): SceneExtraDevice {
	const count = (scene.extraDevices?.length ?? 0) + 1;
	return {
		frame: scene.device?.frame ?? "iphone",
		groundShadow: scene.device?.groundShadow,
		id,
		offsetX: Math.min(0.4, 0.14 * count),
		offsetY: (scene.device?.offsetY ?? 0.12) + 0.04 * count,
		rotation: 0,
		scale: Math.max(0.2, (scene.device?.scale ?? 0.72) * 0.85),
		style:
			scene.device?.style === "clay" ? "clay" : ("realistic" as const),
	};
}

/** True when the device has any non-zero 3D tilt (perspective warp path). */
export function deviceHas3DTilt(
	device: Pick<SceneData, "device">["device"],
): boolean {
	return Boolean(device && ((device.rotationX ?? 0) !== 0 || (device.rotationY ?? 0) !== 0));
}

/** Clamp a value into [min, max]. */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Compute the destination rect for drawing a source image of `srcW`×`srcH`
 * inside `target`, honoring the fit mode. "cover" fills and crops; "contain"
 * letterboxes; "stretch" fills ignoring aspect ratio. In "cover" mode the
 * focal offsets (-1..1, default 0) pan the crop window: -1 keeps the
 * left/top edge, 0 the center, 1 the right/bottom edge. Returns the rect and
 * the source crop rect for drawImage.
 */
export function computeImageFit(
	srcW: number,
	srcH: number,
	target: Rect,
	fit: SceneBackgroundFit = "cover",
	focalX = 0,
	focalY = 0,
): { dest: Rect; src: Rect } {
	if (srcW <= 0 || srcH <= 0) {
		return { dest: target, src: { x: 0, y: 0, width: srcW, height: srcH } };
	}
	const targetRatio = target.width / target.height;
	const srcRatio = srcW / srcH;

	if (fit === "stretch") {
		return { dest: target, src: { x: 0, y: 0, width: srcW, height: srcH } };
	}

	if (fit === "contain") {
		let w = target.width;
		let h = target.height;
		if (srcRatio > targetRatio) {
			h = target.width / srcRatio;
		} else {
			w = target.height * srcRatio;
		}
		return {
			dest: {
				x: target.x + (target.width - w) / 2,
				y: target.y + (target.height - h) / 2,
				width: w,
				height: h,
			},
			src: { x: 0, y: 0, width: srcW, height: srcH },
		};
	}

	// cover: crop the source to the target aspect ratio, panned by the focal
	// offsets (a focal of -1/0/1 maps to the start/center/end of the slack).
	let sx = 0;
	let sy = 0;
	let sw = srcW;
	let sh = srcH;
	if (srcRatio > targetRatio) {
		sw = srcH * targetRatio;
		sx = ((srcW - sw) / 2) * (1 + clamp(focalX, -1, 1));
	} else {
		sh = srcW / targetRatio;
		sy = ((srcH - sh) / 2) * (1 + clamp(focalY, -1, 1));
	}
	return {
		dest: target,
		src: { x: sx, y: sy, width: sw, height: sh },
	};
}

/** Resolve a normalized (0..1) text-layer position to canvas pixels. */
export function resolveTextPosition(
	layer: { x: number; y: number },
	scene: Pick<SceneData, "width" | "height">,
): { x: number; y: number } {
	return { x: layer.x * scene.width, y: layer.y * scene.height };
}

/**
 * Find the topmost text layer whose bounding box contains the given canvas
 * point. Layers are tested last-to-first so the visually-topmost wins. The box
 * is approximated from font size and alignment (canvas text has no DOM box).
 */
export function hitTestTextLayer(
	scene: SceneData,
	px: number,
	py: number,
): string | null {
	for (let i = scene.textLayers.length - 1; i >= 0; i--) {
		const layer = scene.textLayers[i];
		// Locked layers ignore canvas hits so they can't be dragged by accident;
		// they remain selectable from the layers list.
		if (layer.locked) continue;
		const { x, y } = resolveTextPosition(layer, scene);
		const approxWidth = Math.max(
			layer.fontSize * 0.6 * Math.max(layer.text.length, 4),
			layer.fontSize * 3,
		);
		const halfH = layer.fontSize * 0.75;
		let left = x;
		if (layer.align === "center") left = x - approxWidth / 2;
		else if (layer.align === "right") left = x - approxWidth;
		const right = left + approxWidth;
		if (px >= left && px <= right && py >= y - halfH && py <= y + halfH) {
			return layer.id;
		}
	}
	return null;
}

/** Build a CSS canvas font string from a text layer. */
export function buildFontString(layer: {
	fontFamily: string;
	fontSize: number;
	weight?: number;
}): string {
	return `${layer.weight ?? 400} ${layer.fontSize}px ${layer.fontFamily}`;
}

// ---------------------------------------------------------------------------
// Annotations (callouts / badges / labels)
// ---------------------------------------------------------------------------

const DEFAULT_ANNOTATION_FONT = "Inter, system-ui, sans-serif";

/** Default text for each annotation variant. */
const ANNOTATION_DEFAULT_TEXT: Record<SceneAnnotationType, string> = {
	badge: "NEW",
	callout: "Your description",
	label: "Label",
	laurel: "Finalist",
	review: "This solves so many\nof my problems.",
};

/**
 * Build a fresh annotation of `type` for `scene`, sized relative to the scene
 * height so it reads at any target resolution. Pure — drives both the "add
 * annotation" action and tests. `id` is injected by the caller so the factory
 * stays deterministic and testable.
 */
export function createDefaultAnnotation(
	type: SceneAnnotationType,
	scene: Pick<SceneData, "height">,
	id: string,
): SceneTextAnnotation {
	const base = {
		id,
		text: ANNOTATION_DEFAULT_TEXT[type],
		x: 0.5,
		y: 0.5,
		color: "#ffffff",
		fontFamily: DEFAULT_ANNOTATION_FONT,
		weight: type === "badge" ? 700 : 600,
	};
	if (type === "callout") {
		return {
			...base,
			type: "callout",
			bg: "#111827",
			fontSize: Math.round(scene.height * 0.028),
			targetX: 0.5,
			targetY: 0.62,
		};
	}
	if (type === "badge") {
		return {
			...base,
			type: "badge",
			bg: "#ef4444",
			fontSize: Math.round(scene.height * 0.026),
		};
	}
	if (type === "laurel") {
		return {
			...base,
			type: "laurel",
			bg: "#000000",
			fontSize: Math.round(scene.height * 0.03),
			textBottom: "Design Award",
			textTop: "2026",
			weight: 800,
		};
	}
	if (type === "review") {
		return {
			...base,
			author: "Mark — App Reviewer",
			bg: "#111827",
			fontSize: Math.round(scene.height * 0.026),
			showBackground: false,
			showQuoteMark: true,
			stars: 5,
			type: "review",
		};
	}
	return {
		...base,
		type: "label",
		bg: "#000000",
		color: "#ffffff",
		fontSize: Math.round(scene.height * 0.03),
		showBackground: true,
	};
}

/** Default colors giving each shape a distinct, legible starting look. */
const SHAPE_DEFAULT_COLOR: Record<SceneShapeKind, string> = {
	arrow: "#facc15",
	blob: "#f472b6",
	check: "#22c55e",
	circle: "#ef4444",
	heart: "#ef4444",
	rating: "#fbbf24",
	sparkle: "#fde047",
	squiggle: "#facc15",
	star: "#facc15",
	underline: "#facc15",
};

/**
 * Build a fresh decorative shape annotation centered on the scene. Pure — the
 * caller injects `id` so the factory stays deterministic and testable.
 */
export function createShapeAnnotation(
	id: string,
	shape: SceneShapeKind,
	scene: Pick<SceneData, "height" | "width">,
): SceneShapeAnnotation {
	const isMark =
		shape === "sparkle" ||
		shape === "star" ||
		shape === "heart" ||
		shape === "check";
	return {
		color: SHAPE_DEFAULT_COLOR[shape],
		id,
		opacity: 1,
		rotation: 0,
		shape,
		strokeWidth: Math.max(4, Math.round(scene.height * 0.008)),
		type: "shape",
		width: isMark ? 0.1 : shape === "rating" ? 0.42 : 0.3,
		x: 0.5,
		y: 0.5,
	};
}

/**
 * Build a fresh image annotation centered on the scene. `aspect` is the
 * uploaded image's natural height/width so the box (and hit-test) match the
 * rendered size immediately. Pure — the caller injects `id` and `url`.
 */
export function createImageAnnotation(
	id: string,
	url: string,
	aspect: number,
): SceneImageAnnotation {
	return {
		aspect: aspect > 0 ? aspect : 1,
		id,
		opacity: 1,
		rotation: 0,
		type: "image",
		url,
		width: 0.4,
		x: 0.5,
		y: 0.5,
	};
}

/** Horizontal/vertical padding (as a multiple of fontSize) around annotation text. */
const ANNOTATION_PADDING_X = 0.7;
const ANNOTATION_PADDING_Y = 0.45;
/** Approx. average glyph width as a fraction of fontSize (canvas text has no DOM box). */
const ANNOTATION_GLYPH_RATIO = 0.58;

/**
 * Approximate the on-canvas pixel rect of an annotation's pill/bubble box,
 * centered on its anchor point. The width is estimated from the longest text
 * line; height accounts for line count. Used for both rendering and hit-testing
 * so the visible box and the clickable box stay in sync. Pure.
 */
/** Height/width aspect of each decorative shape's bounding box. */
export const SHAPE_ASPECT: Record<SceneShapeKind, number> = {
	arrow: 0.55,
	blob: 0.75,
	check: 0.8,
	circle: 0.5,
	heart: 0.9,
	rating: 0.2,
	sparkle: 1,
	squiggle: 0.22,
	star: 1,
	underline: 0.16,
};

export function measureAnnotationBox(
	annotation: SceneAnnotation,
	scene: Pick<SceneData, "width" | "height">,
): Rect {
	const cx = annotation.x * scene.width;
	const cy = annotation.y * scene.height;
	if (annotation.type === "image") {
		const width = annotation.width * scene.width;
		const height = width * (annotation.aspect ?? 1);
		return { x: cx - width / 2, y: cy - height / 2, width, height };
	}
	if (annotation.type === "shape") {
		const width = annotation.width * scene.width;
		const height = width * SHAPE_ASPECT[annotation.shape];
		return { x: cx - width / 2, y: cy - height / 2, width, height };
	}
	const lines = annotation.text.split("\n");
	const longest = lines.reduce((max, l) => Math.max(max, l.length), 1);
	const padX = annotation.fontSize * ANNOTATION_PADDING_X;
	const padY = annotation.fontSize * ANNOTATION_PADDING_Y;
	const textWidth = longest * annotation.fontSize * ANNOTATION_GLYPH_RATIO;
	const textHeight = lines.length * annotation.fontSize * 1.2;

	if (annotation.type === "laurel") {
		// Wreath branches flank the text block; small lines above/below.
		const extraLines =
			(annotation.textTop ? 1 : 0) + (annotation.textBottom ? 1 : 0);
		const width = textWidth + annotation.fontSize * 4.4;
		const height =
			textHeight + extraLines * annotation.fontSize * 0.95 + padY * 2;
		return { x: cx - width / 2, y: cy - height / 2, width, height };
	}
	if (annotation.type === "review") {
		// Quote mark + quote + stars + author stack vertically.
		const quoteMark = annotation.showQuoteMark !== false ? 1.4 : 0;
		const stars = (annotation.stars ?? 5) > 0 ? 1.1 : 0;
		const author = annotation.author ? 1.5 : 0;
		const width = Math.max(textWidth, annotation.fontSize * 8) + padX * 2;
		const height =
			textHeight +
			(quoteMark + stars + author) * annotation.fontSize +
			padY * 2.6;
		return { x: cx - width / 2, y: cy - height / 2, width, height };
	}

	const width = textWidth + padX * 2;
	const height = textHeight + padY * 2;
	return { x: cx - width / 2, y: cy - height / 2, width, height };
}

/**
 * Find the topmost annotation whose box contains the given canvas point.
 * Annotations are tested last-to-first so the visually-topmost wins. Returns
 * the annotation id or null. Pure.
 */
export function hitTestAnnotation(
	scene: SceneData,
	px: number,
	py: number,
): string | null {
	const annotations = scene.annotations ?? [];
	for (let i = annotations.length - 1; i >= 0; i--) {
		const box = measureAnnotationBox(annotations[i], scene);
		if (
			px >= box.x &&
			px <= box.x + box.width &&
			py >= box.y &&
			py <= box.y + box.height
		) {
			return annotations[i].id;
		}
	}
	return null;
}

/** Radius (px) of the draggable target handle at a callout's tail tip. */
const CALLOUT_TARGET_HANDLE_RADIUS = 28;

/**
 * Hit-test the draggable tail-target handle of a single callout annotation.
 * Returns true when the point is within the handle radius of the target point.
 * Used so the callout's bubble and its tail tip can be dragged independently.
 */
export function hitTestCalloutTarget(
	annotation: SceneAnnotation,
	scene: Pick<SceneData, "width" | "height">,
	px: number,
	py: number,
): boolean {
	if (annotation.type !== "callout") return false;
	const tx = annotation.targetX * scene.width;
	const ty = annotation.targetY * scene.height;
	const dx = px - tx;
	const dy = py - ty;
	const handle = Math.max(CALLOUT_TARGET_HANDLE_RADIUS, annotation.fontSize);
	return dx * dx + dy * dy <= handle * handle;
}

/**
 * Hit-test the device frame's on-canvas box (rotation-aware axis-aligned
 * bounding box of the rotated frame rect). Lowest-priority drag target: the
 * canvas checks text layers and annotations first. Pure.
 */
export function hitTestDevice(
	scene: SceneData,
	px: number,
	py: number,
): boolean {
	const device = scene.device;
	if (!device || device.frame === "none") return false;
	return hitTestDeviceConfig(device, scene, px, py);
}

/**
 * Which device sits under the point: an extra device's id (topmost first,
 * they draw above the primary), "primary", or null. Drives canvas drags.
 */
export function hitTestAnyDevice(
	scene: SceneData,
	px: number,
	py: number,
): string | null {
	const extras = scene.extraDevices ?? [];
	for (let i = extras.length - 1; i >= 0; i--) {
		if (
			extras[i].frame !== "none" &&
			hitTestDeviceConfig(extras[i], scene, px, py)
		) {
			return extras[i].id;
		}
	}
	return hitTestDevice(scene, px, py) ? "primary" : null;
}

/** Rotation-aware AABB hit-test for one device config. */
function hitTestDeviceConfig(
	device: SceneDevice,
	scene: SceneData,
	px: number,
	py: number,
): boolean {
	const rect = computeDeviceRectFor(device, scene);
	const cx = rect.x + rect.width / 2;
	const cy = rect.y + rect.height / 2;
	if (deviceHas3DTilt(device)) {
		// Perspective path: hit-test the AABB of the projected quad.
		const quad = projectRectCorners(
			cx,
			cy,
			rect.width,
			rect.height,
			device.rotationX ?? 0,
			device.rotationY ?? 0,
			device.rotation ?? 0,
		);
		const box = quadBounds(quad);
		return (
			px >= box.x &&
			px <= box.x + box.width &&
			py >= box.y &&
			py <= box.y + box.height
		);
	}
	const rad = ((device.rotation ?? 0) * Math.PI) / 180;
	const cos = Math.abs(Math.cos(rad));
	const sin = Math.abs(Math.sin(rad));
	const halfW = (rect.width / 2) * cos + (rect.height / 2) * sin;
	const halfH = (rect.width / 2) * sin + (rect.height / 2) * cos;
	return (
		px >= cx - halfW && px <= cx + halfW && py >= cy - halfH && py <= cy + halfH
	);
}

/** Result of snapping a dragged layer: final position + guide lines to show. */
export interface SnapResult {
	x: number;
	y: number;
	/** Normalized x of the vertical guide line, when x snapped. */
	guideX?: number;
	/** Normalized y of the horizontal guide line, when y snapped. */
	guideY?: number;
}

/** Snap radius as a fraction of the scene size. */
const SNAP_THRESHOLD = 0.015;

/**
 * Snap a normalized drag position to alignment targets: the canvas/panel
 * centers, panorama panel seams and the device center. Returns the snapped
 * position plus the guide lines to visualize. Pure — drives canvas drags and
 * tests. Pass the raw position through when the user holds Alt (caller's job).
 */
export function snapNormalizedPosition(
	nx: number,
	ny: number,
	scene: SceneData,
	threshold = SNAP_THRESHOLD,
): SnapResult {
	const panels = getPanelCount(scene);
	const xTargets: number[] = [];
	for (let i = 0; i < panels; i++) {
		xTargets.push((i + 0.5) / panels);
		if (i > 0) xTargets.push(i / panels);
	}
	const yTargets: number[] = [0.5];
	const device = scene.device;
	if (device && device.frame !== "none") {
		xTargets.push(0.5 + device.offsetX);
		yTargets.push(0.5 + device.offsetY);
	}

	const nearest = (value: number, targets: number[]): number | undefined => {
		let best: number | undefined;
		let bestDist = threshold;
		for (const target of targets) {
			const dist = Math.abs(value - target);
			if (dist <= bestDist) {
				best = target;
				bestDist = dist;
			}
		}
		return best;
	};

	const snappedX = nearest(nx, xTargets);
	const snappedY = nearest(ny, yTargets);
	return {
		guideX: snappedX,
		guideY: snappedY,
		x: snappedX ?? nx,
		y: snappedY ?? ny,
	};
}

/**
 * Return a copy of `items` with the item of the given id moved `delta` places
 * (-1 = up/earlier = drawn below, +1 = down/later = drawn above). Out-of-range
 * moves and unknown ids return the original array unchanged. Pure.
 */
export function reorderById<T extends { id: string }>(
	items: readonly T[],
	id: string,
	delta: -1 | 1,
): T[] {
	const index = items.findIndex((item) => item.id === id);
	const target = index + delta;
	if (index < 0 || target < 0 || target >= items.length) {
		return [...items];
	}
	const next = [...items];
	const [moved] = next.splice(index, 1);
	next.splice(target, 0, moved);
	return next;
}

/**
 * Compute the integer scale-to-fit factor for showing a `target`-sized canvas
 * inside an available viewport box, never upscaling past 1. Used to render the
 * canvas at true device pixels while displaying it smaller.
 */
export function computeDisplayScale(
	target: [number, number],
	available: { width: number; height: number },
): number {
	const [tw, th] = target;
	if (tw <= 0 || th <= 0) return 1;
	const scale = Math.min(available.width / tw, available.height / th);
	return Math.min(scale, 1);
}
