import { describe, expect, test } from "bun:test";

import {
	applyPanelCount,
	computeDeviceRect,
	computeDisplayScale,
	computeImageFit,
	createDefaultAnnotation,
	createDefaultScene,
	createImageAnnotation,
	createShapeAnnotation,
	defaultFrameForDisplayType,
	getDisplayTypeLabel,
	getPanelCount,
	getTargetDimensions,
	hitTestAnnotation,
	hitTestCalloutTarget,
	hitTestDevice,
	hitTestTextLayer,
	measureAnnotationBox,
	reorderById,
	resolveTextPosition,
	SHAPE_ASPECT,
	snapNormalizedPosition,
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
		expect(defaultFrameForDisplayType("tenInch")).toBe("android-tablet");
		expect(defaultFrameForDisplayType("sevenInch")).toBe("android-tablet");
	});

	test("uses an iPhone frame for iOS display types", () => {
		expect(defaultFrameForDisplayType("APP_IPHONE_67")).toBe("iphone");
	});

	test("uses an iPad frame for the iPad display type", () => {
		expect(defaultFrameForDisplayType("APP_IPAD_PRO_129")).toBe("ipad");
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

	test("stretch fills the whole target with the whole source", () => {
		const { dest, src } = computeImageFit(400, 200, target, "stretch");
		expect(dest).toEqual(target);
		expect(src).toEqual({ x: 0, y: 0, width: 400, height: 200 });
	});

	test("cover focal offsetX pans the crop window horizontally", () => {
		// src 400x200 into 100x200 target → crop width 100, slack 300.
		const left = computeImageFit(400, 200, target, "cover", -1);
		const center = computeImageFit(400, 200, target, "cover", 0);
		const right = computeImageFit(400, 200, target, "cover", 1);
		expect(left.src.x).toBeCloseTo(0);
		expect(center.src.x).toBeCloseTo(150);
		expect(right.src.x).toBeCloseTo(300);
	});

	test("cover focal offsetY pans the crop window vertically", () => {
		// src 100x400 into 100x200 (wide) target: taller source → crop height.
		const tallTarget = { x: 0, y: 0, width: 100, height: 100 };
		const top = computeImageFit(100, 400, tallTarget, "cover", 0, -1);
		const bottom = computeImageFit(100, 400, tallTarget, "cover", 0, 1);
		expect(top.src.y).toBeCloseTo(0);
		expect(bottom.src.y).toBeCloseTo(300);
	});

	test("clamps focal offsets outside the -1..1 range", () => {
		const over = computeImageFit(400, 200, target, "cover", 5);
		expect(over.src.x).toBeCloseTo(300);
		const under = computeImageFit(400, 200, target, "cover", -5);
		expect(under.src.x).toBeCloseTo(0);
	});

	test("focal offsets do not affect contain mode", () => {
		const a = computeImageFit(400, 200, target, "contain", 1, 1);
		const b = computeImageFit(400, 200, target, "contain");
		expect(a).toEqual(b);
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

describe("createImageAnnotation", () => {
	test("builds a centered image layer with the given aspect", () => {
		const ann = createImageAnnotation("img1", "data:image/png;base64,xyz", 0.5);
		expect(ann.type).toBe("image");
		expect(ann.id).toBe("img1");
		expect(ann.x).toBe(0.5);
		expect(ann.y).toBe(0.5);
		expect(ann.aspect).toBe(0.5);
		expect(ann.opacity).toBe(1);
		expect(ann.rotation).toBe(0);
	});

	test("falls back to a square aspect for invalid values", () => {
		expect(createImageAnnotation("i", "u", 0).aspect).toBe(1);
		expect(createImageAnnotation("i", "u", -2).aspect).toBe(1);
	});
});

describe("measureAnnotationBox — image layers", () => {
	const scene = { width: 1000, height: 2000 };

	test("sizes the box from normalized width and stored aspect", () => {
		const box = measureAnnotationBox(
			{
				aspect: 0.5,
				id: "img",
				type: "image",
				url: "data:,",
				width: 0.4,
				x: 0.5,
				y: 0.25,
			},
			scene,
		);
		// width = 0.4 * 1000 = 400; height = 400 * 0.5 = 200; centered on (500, 500).
		expect(box).toEqual({ x: 300, y: 400, width: 400, height: 200 });
	});

	test("defaults to a square box when aspect is missing", () => {
		const box = measureAnnotationBox(
			{ id: "img", type: "image", url: "data:,", width: 0.2, x: 0.5, y: 0.5 },
			scene,
		);
		expect(box.width).toBe(200);
		expect(box.height).toBe(200);
	});
});

describe("hitTestAnnotation — image layers", () => {
	const scene: SceneData = {
		width: 1000,
		height: 2000,
		background: { type: "color", value: "#000" },
		textLayers: [],
		annotations: [
			{
				aspect: 1,
				id: "img",
				type: "image",
				url: "data:,",
				width: 0.4,
				x: 0.5,
				y: 0.5,
			},
		],
	};

	test("hits inside the image box and misses outside", () => {
		expect(hitTestAnnotation(scene, 500, 1000)).toBe("img");
		expect(hitTestAnnotation(scene, 50, 50)).toBeNull();
	});
});

describe("hitTestDevice", () => {
	const baseScene: SceneData = {
		width: 1000,
		height: 2000,
		background: { type: "color", value: "#000" },
		device: { frame: "iphone", scale: 0.5, offsetX: 0, offsetY: 0 },
		textLayers: [],
	};

	test("hits inside the device frame rect", () => {
		// frame: width 500, height 1025, centered at (500, 1000).
		expect(hitTestDevice(baseScene, 500, 1000)).toBe(true);
		expect(hitTestDevice(baseScene, 260, 600)).toBe(true);
	});

	test("misses outside the device frame rect", () => {
		expect(hitTestDevice(baseScene, 100, 100)).toBe(false);
	});

	test("is false without a device or with the 'none' frame", () => {
		expect(hitTestDevice({ ...baseScene, device: undefined }, 500, 1000)).toBe(
			false,
		);
		expect(
			hitTestDevice(
				{
					...baseScene,
					device: { frame: "none", scale: 0.5, offsetX: 0, offsetY: 0 },
				},
				500,
				1000,
			),
		).toBe(false);
	});

	test("expands the hit box for a rotated frame", () => {
		const rotated: SceneData = {
			...baseScene,
			device: {
				frame: "iphone",
				scale: 0.5,
				offsetX: 0,
				offsetY: 0,
				rotation: 90,
			},
		};
		// At 90° the AABB is height×width: a point beyond the unrotated width
		// (|dx| > 250) but within the rotated half-width (~512) now hits.
		expect(hitTestDevice(rotated, 950, 1000)).toBe(true);
		expect(hitTestDevice(baseScene, 950, 1000)).toBe(false);
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

describe("getPanelCount", () => {
	test("defaults to 1 when panels is missing", () => {
		expect(getPanelCount({})).toBe(1);
		expect(getPanelCount({ panels: undefined })).toBe(1);
	});

	test("returns the stored panel count", () => {
		expect(getPanelCount({ panels: 3 })).toBe(3);
	});

	test("clamps invalid values to 1", () => {
		expect(getPanelCount({ panels: 0 })).toBe(1);
		expect(getPanelCount({ panels: Number.NaN })).toBe(1);
	});
});

describe("applyPanelCount", () => {
	test("widens the scene to target width × panels", () => {
		const scene = createDefaultScene("APP_IPHONE_65");
		const panorama = applyPanelCount(scene, "APP_IPHONE_65", 3);
		expect(panorama.width).toBe(1242 * 3);
		expect(panorama.height).toBe(2688);
		expect(panorama.panels).toBe(3);
	});

	test("returns to a single-screen scene for panels = 1", () => {
		const scene = applyPanelCount(
			createDefaultScene("APP_IPHONE_65"),
			"APP_IPHONE_65",
			4,
		);
		const single = applyPanelCount(scene, "APP_IPHONE_65", 1);
		expect(single.width).toBe(1242);
		expect(single.panels).toBe(1);
	});

	test("keeps layers intact when resizing", () => {
		const scene = createDefaultScene("APP_IPHONE_65");
		const panorama = applyPanelCount(scene, "APP_IPHONE_65", 2);
		expect(panorama.textLayers).toEqual(scene.textLayers);
		expect(panorama.device).toEqual(scene.device);
	});
});

describe("computeDeviceRect in panorama mode", () => {
	test("keeps the frame sized to ONE panel width, not the full canvas", () => {
		const single = createDefaultScene("APP_IPHONE_65");
		const singleRect = computeDeviceRect(single);
		const panorama = applyPanelCount(single, "APP_IPHONE_65", 3);
		const panoramaRect = computeDeviceRect(panorama);
		expect(panoramaRect?.width).toBeCloseTo(singleRect?.width ?? 0);
		expect(panoramaRect?.height).toBeCloseTo(singleRect?.height ?? 0);
	});
});

describe("createShapeAnnotation", () => {
	test("builds a stroked shape with defaults scaled to the scene", () => {
		const scene = { height: 2796, width: 1290 };
		const shape = createShapeAnnotation("s1", "underline", scene);
		expect(shape.type).toBe("shape");
		expect(shape.shape).toBe("underline");
		expect(shape.width).toBeCloseTo(0.3);
		expect(shape.strokeWidth).toBeGreaterThan(1);
		expect(shape.x).toBe(0.5);
	});

	test("marks (sparkle/star) start smaller than strokes", () => {
		const scene = { height: 2796, width: 1290 };
		expect(createShapeAnnotation("s2", "sparkle", scene).width).toBeCloseTo(0.1);
		expect(createShapeAnnotation("s3", "star", scene).width).toBeCloseTo(0.1);
	});
});

describe("measureAnnotationBox (shape)", () => {
	test("uses the per-shape aspect for the bounding box", () => {
		const scene = { height: 2000, width: 1000 };
		const shape = createShapeAnnotation("s1", "underline", scene);
		const box = measureAnnotationBox(shape, scene);
		expect(box.width).toBeCloseTo(shape.width * scene.width);
		expect(box.height).toBeCloseTo(box.width * SHAPE_ASPECT.underline);
	});

	test("shape annotations are hit-testable through hitTestAnnotation", () => {
		const scene: SceneData = {
			annotations: [createShapeAnnotation("s1", "star", { height: 2000, width: 1000 })],
			background: { type: "color", value: "#000" },
			height: 2000,
			textLayers: [],
			width: 1000,
		};
		expect(hitTestAnnotation(scene, 500, 1000)).toBe("s1");
		expect(hitTestAnnotation(scene, 20, 20)).toBeNull();
	});
});

describe("snapNormalizedPosition", () => {
	const baseScene: SceneData = {
		background: { type: "color", value: "#000" },
		device: { frame: "iphone", offsetX: 0.2, offsetY: 0.1, scale: 0.7 },
		height: 2000,
		textLayers: [],
		width: 1000,
	};

	test("snaps to the canvas center within the threshold", () => {
		const snap = snapNormalizedPosition(0.492, 0.508, baseScene);
		expect(snap.x).toBe(0.5);
		expect(snap.y).toBe(0.5);
		expect(snap.guideX).toBe(0.5);
		expect(snap.guideY).toBe(0.5);
	});

	test("passes positions outside the threshold through unchanged", () => {
		const snap = snapNormalizedPosition(0.42, 0.3, baseScene);
		expect(snap.x).toBe(0.42);
		expect(snap.y).toBe(0.3);
		expect(snap.guideX).toBeUndefined();
		expect(snap.guideY).toBeUndefined();
	});

	test("snaps to the device center", () => {
		const snap = snapNormalizedPosition(0.708, 0.595, baseScene);
		expect(snap.x).toBeCloseTo(0.7);
		expect(snap.y).toBeCloseTo(0.6);
	});

	test("snaps to panel centers and seams in panorama mode", () => {
		const panorama: SceneData = { ...baseScene, device: undefined, panels: 2 };
		expect(snapNormalizedPosition(0.253, 0.3, panorama).x).toBe(0.25);
		expect(snapNormalizedPosition(0.497, 0.3, panorama).x).toBe(0.5);
		expect(snapNormalizedPosition(0.748, 0.3, panorama).x).toBe(0.75);
	});
});

describe("reorderById", () => {
	const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

	test("moves an item later (drawn above)", () => {
		expect(reorderById(items, "a", 1).map((i) => i.id)).toEqual([
			"b",
			"a",
			"c",
		]);
	});

	test("moves an item earlier (drawn below)", () => {
		expect(reorderById(items, "c", -1).map((i) => i.id)).toEqual([
			"a",
			"c",
			"b",
		]);
	});

	test("out-of-range moves and unknown ids return the array unchanged", () => {
		expect(reorderById(items, "a", -1).map((i) => i.id)).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(reorderById(items, "c", 1).map((i) => i.id)).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(reorderById(items, "zz", 1).map((i) => i.id)).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("does not mutate the input array", () => {
		const input = [{ id: "a" }, { id: "b" }];
		reorderById(input, "a", 1);
		expect(input.map((i) => i.id)).toEqual(["a", "b"]);
	});
});
