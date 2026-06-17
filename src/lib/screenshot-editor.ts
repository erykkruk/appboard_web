import type {
	SceneData,
	SceneDeviceFrame,
	SceneScreenshotFit,
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

/** Default Android frame for Android display types, iPhone otherwise. */
export function defaultFrameForDisplayType(
	displayType: string,
): SceneDeviceFrame {
	return displayType === "phone" ||
		displayType === "sevenInch" ||
		displayType === "tenInch"
		? "android"
		: "iphone";
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
				text: "Twój nagłówek",
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

/**
 * Compute the on-canvas pixel rect of the device frame from the scene's device
 * config. `scale` is the fraction of canvas width the frame spans; `offsetX/Y`
 * are fractions of canvas size from center. Pure — drives both render and tests.
 */
export function computeDeviceRect(scene: SceneData): Rect | null {
	if (!scene.device) return null;
	const { scale, offsetX, offsetY } = scene.device;
	const frameWidth = scene.width * scale;
	// iPhone aspect ratio ~ 2.16 (height/width) for a typical 9:19.5 device body.
	const frameHeight = frameWidth * 2.05;
	const centerX = scene.width / 2 + offsetX * scene.width;
	const centerY = scene.height / 2 + offsetY * scene.height;
	return {
		x: centerX - frameWidth / 2,
		y: centerY - frameHeight / 2,
		width: frameWidth,
		height: frameHeight,
	};
}

/**
 * Compute the destination rect for drawing a source image of `srcW`×`srcH`
 * inside `target`, honoring the fit mode. "cover" fills and crops; "contain"
 * letterboxes. Returns the rect and the source crop rect for drawImage.
 */
export function computeImageFit(
	srcW: number,
	srcH: number,
	target: Rect,
	fit: SceneScreenshotFit = "cover",
): { dest: Rect; src: Rect } {
	if (srcW <= 0 || srcH <= 0) {
		return { dest: target, src: { x: 0, y: 0, width: srcW, height: srcH } };
	}
	const targetRatio = target.width / target.height;
	const srcRatio = srcW / srcH;

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

	// cover: crop the source to the target aspect ratio
	let sx = 0;
	let sy = 0;
	let sw = srcW;
	let sh = srcH;
	if (srcRatio > targetRatio) {
		sw = srcH * targetRatio;
		sx = (srcW - sw) / 2;
	} else {
		sh = srcW / targetRatio;
		sy = (srcH - sh) / 2;
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
