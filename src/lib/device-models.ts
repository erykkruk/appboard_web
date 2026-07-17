// Catalog of true-3D device models (GLB) rendered with three.js. Plain data —
// safe to import anywhere; the WebGL renderer itself lives in
// `components/screenshot-editor/device-model-renderer.ts` and loads three.js
// lazily on the client.
//
// Models ported from the MIT-licensed AppScreen project (YUZU-Hub/appscreen).
// Original assets (CC BY 4.0): iPhone 15 Pro Max by MajdyModels (Sketchfab),
// Samsung Galaxy S25 Ultra by mistJS (Sketchfab). See
// public/device-models/README.md for attribution.

export interface DeviceModel {
	id: string;
	label: string;
	/** Public URL of the GLB file. */
	src: string;
	/** Screen aspect (width / height) used to shape the screen overlay. */
	screenAspect: number;
	/** Screen-plane height as a fraction of the 4.3-unit reference height. */
	screenHeightFactor: number;
	/** Screen-center offset inside the raw model (pre-scale model units). */
	screenOffset: { x: number; y: number; z: number };
	/** Screenshot corner rounding as a fraction of the screenshot width. */
	cornerRadiusFactor: number;
}

export const DEVICE_MODELS: DeviceModel[] = [
	{
		cornerRadiusFactor: 0.16,
		id: "iphone-15-pro-max",
		label: "iPhone 15 Pro Max (3D)",
		screenAspect: 1290 / 2796,
		screenHeightFactor: 0.826,
		// z sits just above the glass: the original 0.098 pushed the screen
		// plane so far forward that at strong yaw it slid past the body edge
		// (parallax — the "corners" artifact).
		screenOffset: { x: 0.027, y: 0.745, z: 0.035 },
		src: "/device-models/iphone-15-pro-max.glb",
	},
	{
		cornerRadiusFactor: 0.04,
		id: "samsung-galaxy-s25-ultra",
		label: "Samsung Galaxy S25 Ultra (3D)",
		screenAspect: 1440 / 3120,
		screenHeightFactor: 0.66,
		screenOffset: { x: 0, y: 0, z: 0.08 },
		src: "/device-models/samsung-galaxy-s25-ultra.glb",
	},
];

export const DEFAULT_MODEL_ID = DEVICE_MODELS[0].id;

/** Model by id, falling back to the default so stale ids never blank out. */
export function getDeviceModel(id: string | undefined): DeviceModel {
	return DEVICE_MODELS.find((m) => m.id === id) ?? DEVICE_MODELS[0];
}

/**
 * Extra canvas the 3D render gets around the device rect so rotated devices
 * never clip (a 45° roll needs ~height×sin(45°) of horizontal headroom).
 */
export const MODEL_RENDER_PAD_X = 1.9;
export const MODEL_RENDER_PAD_Y = 1.2;
