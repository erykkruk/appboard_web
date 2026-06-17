import { describe, expect, test } from "bun:test";

import {
	computeDeviceRect,
	computeDisplayScale,
	computeImageFit,
	createDefaultAnnotation,
	createDefaultScene,
	defaultFrameForDisplayType,
	getDisplayTypeLabel,
	getTargetDimensions,
	hitTestAnnotation,
	hitTestCalloutTarget,
	hitTestTextLayer,
	measureAnnotationBox,
	resolveTextPosition,
} from "./screenshot-editor";
import type { SceneAnnotation, SceneData } from "./types";

describe("getTargetDimensions", () => {
	test("returns the exact backend portrait size for a known display type", () => {
		expect(getTargetDimensions("APP_IPHONE_67")).toEqual([1290, 2796]);
		expect(getTargetDimensions("APP_IPAD_PRO_129")).toEqual([2048, 2732]);
		expect(getTargetDimensions("phone")).toEqual([1080, 1920]);
	});

	test("falls back to the iPhone 6.7 default for an unknown type", () => {
		expect(getTargetDimensions("MYSTERY")).toEqual([1290, 2796]);
	});
});

describe("getDisplayTypeLabel", () => {
	test("maps known types to friendly labels", () => {
		expect(getDisplayTypeLabel("APP_IPHONE_67")).toBe('iPhone 6.7"');
		expect(getDisplayTypeLabel("phone")).toBe("Android phone");
	});

	test("falls back to the raw key when unknown", () => {
		expect(getDisplayTypeLabel("CUSTOM_X")).toBe("CUSTOM_X");
	});
});

describe("defaultFrameForDisplayType", () => {
	test("uses an Android frame for Android display types", () => {
		expect(defaultFrameForDisplayType("phone")).toBe("android");
		expect(defaultFrameForDisplayType("tenInch")).toBe("android");
	});

	test("uses an iPhone frame for iOS display types", () => {
		expect(defaultFrameForDisplayType("APP_IPHONE_67")).toBe("iphone");
	});
});

describe("createDefaultScene", () => {
	test("creates a scene at the exact target dimensions", () => {
		const scene = createDefaultScene("APP_IPHONE_67");
		expect(scene.width).toBe(1290);
		expect(scene.height).toBe(2796);
		expect(scene.textLayers.length).toBeGreaterThan(0);
		expect(scene.device?.frame).toBe("iphone");
	});

	test("uses an Android frame for Android targets", () => {
		const scene = createDefaultScene("phone");
		expect(scene.device?.frame).toBe("android");
		expect(scene.width).toBe(1080);
		expect(scene.height).toBe(1920);
	});
});

describe("computeDeviceRect", () => {
	test("returns null when the scene has no device", () => {
		const scene = createDefaultScene("APP_IPHONE_67");
		scene.device = undefined;
		expect(computeDeviceRect(scene)).toBeNull();
	});

	test("centers the frame and applies scale/offset", () => {
		const scene: SceneData = {
			width: 1000,
			height: 2000,
			background: { type: "color", value: "#000" },
			device: { frame: "iphone", scale: 0.5, offsetX: 0, offsetY: 0 },
			textLayers: [],
		};
		const rect = computeDeviceRect(scene);
		expect(rect).not.toBeNull();
		// frameWidth = 1000 * 0.5 = 500, centered horizontally => x = 250
		expect(rect?.width).toBe(500);
		expect(rect?.x).toBe(250);
	});
});

describe("computeImageFit", () => {
	const target = { x: 0, y: 0, width: 100, height: 200 };

	test("cover crops the wider source to the target aspect ratio", () => {
		const { dest, src } = computeImageFit(400, 200, target, "cover");
		expect(dest).toEqual(target);
		// target ratio 0.5, src ratio 2 > 0.5 → crop width
		expect(src.width).toBeCloseTo(100);
		expect(src.height).toBe(200);
		expect(src.x).toBeCloseTo(150);
	});

	test("contain letterboxes the source inside the target", () => {
		const { dest } = computeImageFit(400, 200, target, "contain");
		// src ratio 2 > target ratio 0.5 → fit width, shrink height
		expect(dest.width).toBe(100);
		expect(dest.height).toBeCloseTo(50);
		// vertically centered in the 200-tall target
		expect(dest.y).toBeCloseTo(75);
	});

	test("handles zero-sized source without dividing by zero", () => {
		const { dest } = computeImageFit(0, 0, target, "cover");
		expect(dest).toEqual(target);
	});
});

describe("resolveTextPosition", () => {
	test("scales normalized coordinates to canvas pixels", () => {
		const pos = resolveTextPosition(
			{ x: 0.5, y: 0.25 },
			{ width: 1000, height: 2000 },
		);
		expect(pos).toEqual({ x: 500, y: 500 });
	});
});

describe("hitTestTextLayer", () => {
	const scene: SceneData = {
		width: 1000,
		height: 2000,
		background: { type: "color", value: "#000" },
		textLayers: [
			{
				id: "a",
				text: "Hello",
				x: 0.5,
				y: 0.1,
				fontFamily: "sans",
				fontSize: 100,
				color: "#fff",
				align: "center",
			},
		],
	};

	test("returns the layer id when the point is over the text box", () => {
		// y = 0.1 * 2000 = 200, x center = 500
		expect(hitTestTextLayer(scene, 500, 200)).toBe("a");
	});

	test("returns null when the point misses every layer", () => {
		expect(hitTestTextLayer(scene, 10, 1900)).toBeNull();
	});

	test("prefers the topmost (last) layer on overlap", () => {
		const overlap: SceneData = {
			...scene,
			textLayers: [
				{ ...scene.textLayers[0], id: "bottom" },
				{ ...scene.textLayers[0], id: "top" },
			],
		};
		expect(hitTestTextLayer(overlap, 500, 200)).toBe("top");
	});
});

describe("computeDisplayScale", () => {
	test("scales down to fit the smaller axis, never upscaling", () => {
		// target 1000x2000 into 500x500 box → min(0.5, 0.25) = 0.25
		expect(computeDisplayScale([1000, 2000], { width: 500, height: 500 })).toBe(
			0.25,
		);
	});

	test("never returns a scale above 1", () => {
		expect(
			computeDisplayScale([100, 100], { width: 1000, height: 1000 }),
		).toBe(1);
	});

	test("guards against a zero-sized target", () => {
		expect(computeDisplayScale([0, 0], { width: 500, height: 500 })).toBe(1);
	});
});

describe("createDefaultAnnotation", () => {
	const scene = { height: 2000 };

	test("builds a callout with a tail target and a deterministic id", () => {
		const ann = createDefaultAnnotation("callout", scene, "a1");
		expect(ann.type).toBe("callout");
		expect(ann.id).toBe("a1");
		if (ann.type === "callout") {
			expect(typeof ann.targetX).toBe("number");
			expect(typeof ann.targetY).toBe("number");
		}
		expect(ann.fontSize).toBeGreaterThan(0);
	});

	test("builds a badge with a bold weight and a fill", () => {
		const ann = createDefaultAnnotation("badge", scene, "b1");
		expect(ann.type).toBe("badge");
		expect(ann.weight).toBe(700);
		expect(ann.bg).toBeTruthy();
	});

	test("builds a label with a visible background by default", () => {
		const ann = createDefaultAnnotation("label", scene, "l1");
		expect(ann.type).toBe("label");
		if (ann.type === "label") {
			expect(ann.showBackground).toBe(true);
		}
	});
});

describe("measureAnnotationBox", () => {
	const scene = { width: 1000, height: 2000 };

	function badge(text: string, fontSize: number): SceneAnnotation {
		return {
			id: "x",
			type: "badge",
			text,
			x: 0.5,
			y: 0.5,
			fontSize,
			color: "#fff",
			bg: "#000",
		};
	}

	test("centers the box on the normalized anchor", () => {
		const box = measureAnnotationBox(badge("Hi", 50), scene);
		expect(box.x + box.width / 2).toBeCloseTo(500);
		expect(box.y + box.height / 2).toBeCloseTo(1000);
	});

	test("a longer text yields a wider box", () => {
		const narrow = measureAnnotationBox(badge("Hi", 50), scene);
		const wide = measureAnnotationBox(badge("Much longer text", 50), scene);
		expect(wide.width).toBeGreaterThan(narrow.width);
	});

	test("multi-line text increases the box height", () => {
		const oneLine = measureAnnotationBox(badge("One", 50), scene);
		const twoLines = measureAnnotationBox(badge("One\nTwo", 50), scene);
		expect(twoLines.height).toBeGreaterThan(oneLine.height);
	});
});

describe("hitTestAnnotation", () => {
	const scene: SceneData = {
		width: 1000,
		height: 2000,
		background: { type: "color", value: "#000" },
		textLayers: [],
		annotations: [
			{
				id: "badge",
				type: "badge",
				text: "NEW",
				x: 0.5,
				y: 0.5,
				fontSize: 60,
				color: "#fff",
				bg: "#f00",
			},
		],
	};

	test("returns the annotation id when the point is over its box", () => {
		expect(hitTestAnnotation(scene, 500, 1000)).toBe("badge");
	});

	test("returns null when the point misses every annotation", () => {
		expect(hitTestAnnotation(scene, 10, 50)).toBeNull();
	});

	test("returns null when the scene has no annotations", () => {
		expect(
			hitTestAnnotation({ ...scene, annotations: undefined }, 500, 1000),
		).toBeNull();
	});

	test("prefers the topmost (last) annotation on overlap", () => {
		const overlap: SceneData = {
			...scene,
			annotations: [
				{ ...(scene.annotations?.[0] as SceneAnnotation), id: "bottom" },
				{ ...(scene.annotations?.[0] as SceneAnnotation), id: "top" },
			],
		};
		expect(hitTestAnnotation(overlap, 500, 1000)).toBe("top");
	});
});

describe("hitTestCalloutTarget", () => {
	const scene = { width: 1000, height: 2000 };
	const callout: SceneAnnotation = {
		id: "c",
		type: "callout",
		text: "Hi",
		x: 0.5,
		y: 0.3,
		fontSize: 50,
		color: "#fff",
		bg: "#000",
		targetX: 0.5,
		targetY: 0.6,
	};

	test("is true near the tail target point", () => {
		// targetX 0.5 → 500, targetY 0.6 → 1200
		expect(hitTestCalloutTarget(callout, scene, 500, 1200)).toBe(true);
	});

	test("is false far from the tail target point", () => {
		expect(hitTestCalloutTarget(callout, scene, 100, 100)).toBe(false);
	});

	test("is always false for non-callout annotations", () => {
		const badge: SceneAnnotation = {
			id: "b",
			type: "badge",
			text: "X",
			x: 0.5,
			y: 0.6,
			fontSize: 50,
			color: "#fff",
			bg: "#000",
		};
		expect(hitTestCalloutTarget(badge, scene, 500, 1200)).toBe(false);
	});
});
