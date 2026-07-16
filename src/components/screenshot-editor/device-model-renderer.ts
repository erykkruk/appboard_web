"use client";

import {
	getDeviceModel,
	MODEL_RENDER_PAD_X,
	MODEL_RENDER_PAD_Y,
} from "@/lib/device-models";

// True-3D device rendering: a GLB phone model is rendered with three.js into
// an off-screen WebGL canvas (transparent background), then handed to the 2D
// scene renderer as a plain image. three.js is imported lazily so the editor
// bundle stays lean until the user actually picks the 3D style.
//
// Approach ported from the MIT-licensed AppScreen (YUZU-Hub/appscreen)
// three-renderer.js: pivot at the screen center, a screen-plane overlay
// carrying the screenshot texture (the models' own UVs are unreliable), and a
// three-point light rig.

type ThreeModule = typeof import("three");

interface ModelSetup {
	pivot: import("three").Group;
	screenPlane: import("three").Mesh;
	baseScale: number;
}

interface RendererState {
	three: ThreeModule;
	renderer: import("three").WebGLRenderer;
	scene: import("three").Scene;
	camera: import("three").PerspectiveCamera;
	models: Map<string, Promise<ModelSetup>>;
	mounted: ModelSetup | null;
}

/** World-space height the phone model is normalized to (AppScreen constant). */
const MODEL_WORLD_HEIGHT = 3.75;
/** Reference height of the screen overlay plane (AppScreen constant). */
const SCREEN_PLANE_REF_HEIGHT = 4.3;
const CAMERA_FOV_DEG = 35;

let statePromise: Promise<RendererState> | null = null;

async function getRendererState(): Promise<RendererState> {
	if (statePromise) return statePromise;
	statePromise = (async () => {
		const three = await import("three");
		const renderer = new three.WebGLRenderer({
			alpha: true,
			antialias: true,
			preserveDrawingBuffer: true,
		});
		renderer.setPixelRatio(1);
		renderer.outputColorSpace = three.SRGBColorSpace;
		renderer.toneMapping = three.NoToneMapping;

		const scene = new three.Scene();
		scene.background = null;
		scene.add(new three.AmbientLight(0xffffff, 1.6));
		const keyLight = new three.DirectionalLight(0xffffff, 2.4);
		keyLight.position.set(2, 3, 4);
		scene.add(keyLight);
		const fillLight = new three.DirectionalLight(0xffffff, 1.2);
		fillLight.position.set(-2, 1, 2);
		scene.add(fillLight);
		const rimLight = new three.DirectionalLight(0xffffff, 0.9);
		rimLight.position.set(0, -2, -3);
		scene.add(rimLight);

		const camera = new three.PerspectiveCamera(CAMERA_FOV_DEG, 1, 0.1, 1000);
		return {
			camera,
			models: new Map(),
			mounted: null,
			renderer,
			scene,
			three,
		};
	})();
	return statePromise;
}

async function loadModel(
	state: RendererState,
	modelId: string,
): Promise<ModelSetup> {
	const cached = state.models.get(modelId);
	if (cached) return cached;
	const promise = (async () => {
		const { GLTFLoader } = await import(
			"three/examples/jsm/loaders/GLTFLoader.js"
		);
		const config = getDeviceModel(modelId);
		const gltf = await new GLTFLoader().loadAsync(config.src);
		const three = state.three;
		const model = gltf.scene;

		// Normalize: center the model and scale its largest dimension (height)
		// to the reference world height.
		const box = new three.Box3().setFromObject(model);
		const center = box.getCenter(new three.Vector3());
		const size = box.getSize(new three.Vector3());
		model.position.sub(center);
		const baseScale = MODEL_WORLD_HEIGHT / Math.max(size.x, size.y, size.z);
		model.scale.setScalar(baseScale);

		// Pivot at the screen center so rotations feel like tilting the device
		// in hand, not orbiting some arbitrary corner.
		const pivot = new three.Group();
		model.position.set(
			-config.screenOffset.x * baseScale,
			-config.screenOffset.y * baseScale,
			-config.screenOffset.z * baseScale,
		);
		pivot.add(model);

		// Screen overlay plane (the models' UV maps are unreliable, so the
		// screenshot rides on a dedicated plane in front of the glass).
		const planeHeight = SCREEN_PLANE_REF_HEIGHT * config.screenHeightFactor;
		const planeWidth = planeHeight * config.screenAspect;
		const screenPlane = new three.Mesh(
			new three.PlaneGeometry(planeWidth, planeHeight),
			new three.MeshBasicMaterial({ color: 0x111111 }),
		);
		screenPlane.position.set(
			config.screenOffset.x,
			config.screenOffset.y,
			config.screenOffset.z,
		);
		model.add(screenPlane);

		return { baseScale, pivot, screenPlane };
	})();
	state.models.set(modelId, promise);
	promise.catch(() => state.models.delete(modelId));
	return promise;
}

/** Round the screenshot's corners on a 2D canvas before texturing. */
function roundedScreenshotCanvas(
	source: CanvasImageSource,
	width: number,
	height: number,
	radiusFactor: number,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, width);
	canvas.height = Math.max(1, height);
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	const r = Math.round(width * radiusFactor);
	ctx.beginPath();
	ctx.moveTo(r, 0);
	ctx.arcTo(canvas.width, 0, canvas.width, canvas.height, r);
	ctx.arcTo(canvas.width, canvas.height, 0, canvas.height, r);
	ctx.arcTo(0, canvas.height, 0, 0, r);
	ctx.arcTo(0, 0, canvas.width, 0, r);
	ctx.closePath();
	ctx.clip();
	ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
	return canvas;
}

export interface DeviceModelRenderRequest {
	modelId: string;
	rotationX: number;
	rotationY: number;
	rotationZ: number;
	/** Device rect size in scene pixels; the output canvas is padded around it. */
	frameWidth: number;
	frameHeight: number;
	/** Decoded screenshot to show on the model's screen. */
	screenshot?: { source: CanvasImageSource; width: number; height: number };
}

/**
 * Render the 3D device to a transparent 2D canvas sized
 * `frameWidth×PAD_X` × `frameHeight×PAD_Y`. The device is framed so its body
 * height matches `frameHeight` at zero rotation, mirroring how the 2D device
 * rect drives every other style. Returns null when WebGL is unavailable.
 */
export async function renderDeviceModel(
	request: DeviceModelRenderRequest,
): Promise<HTMLCanvasElement | null> {
	try {
		const state = await getRendererState();
		const setup = await loadModel(state, request.modelId);
		const { renderer, scene, camera, three } = state;

		// Swap the mounted model when a different one was rendered previously.
		if (state.mounted !== setup) {
			if (state.mounted) scene.remove(state.mounted.pivot);
			scene.add(setup.pivot);
			state.mounted = setup;
		}

		const config = getDeviceModel(request.modelId);
		setup.pivot.rotation.set(
			(request.rotationX * Math.PI) / 180,
			(request.rotationY * Math.PI) / 180,
			(request.rotationZ * Math.PI) / 180,
		);

		const material = setup.screenPlane.material as import("three").MeshBasicMaterial;
		if (request.screenshot) {
			const rounded = roundedScreenshotCanvas(
				request.screenshot.source,
				request.screenshot.width,
				request.screenshot.height,
				config.cornerRadiusFactor,
			);
			material.map?.dispose();
			const texture = new three.CanvasTexture(rounded);
			texture.colorSpace = three.SRGBColorSpace;
			material.map = texture;
			material.color.set(0xffffff);
		} else {
			material.map?.dispose();
			material.map = null;
			material.color.set(0x111111);
		}
		material.needsUpdate = true;

		const width = Math.max(2, Math.round(request.frameWidth * MODEL_RENDER_PAD_X));
		const height = Math.max(2, Math.round(request.frameHeight * MODEL_RENDER_PAD_Y));
		// Camera distance such that `frameHeight` pixels correspond to the
		// model's world height: visible world height = worldHeight × (canvas
		// height / frame height).
		const visibleHeight =
			MODEL_WORLD_HEIGHT * (height / Math.max(1, request.frameHeight));
		const distance =
			visibleHeight / (2 * Math.tan((CAMERA_FOV_DEG * Math.PI) / 360));
		camera.aspect = width / height;
		camera.position.set(0, 0, distance);
		camera.updateProjectionMatrix();

		renderer.setSize(width, height, false);
		renderer.render(scene, camera);

		// Copy out of the shared WebGL canvas so later renders don't clobber it.
		const out = document.createElement("canvas");
		out.width = width;
		out.height = height;
		const ctx = out.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(renderer.domElement, 0, 0);
		return out;
	} catch {
		return null;
	}
}
