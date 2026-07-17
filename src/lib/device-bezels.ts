// Catalog of photographic device bezels (Apple "Product Bezels" from
// developer.apple.com/design/resources — PNGs intended for showcasing apps in
// marketing screenshots). The screen cutout of each asset was measured from
// its alpha channel; coordinates are normalized to the asset so any render
// size maps with a multiply. Assets live in /public/device-bezels.

export interface DeviceBezel {
	id: string;
	label: string;
	/** Public URL of the PNG (transparent screen cutout). */
	src: string;
	/** Asset pixel size — its aspect drives the device rect. */
	width: number;
	height: number;
	/** Screen cutout, normalized (0..1) to the asset dimensions. */
	screen: { x: number; y: number; w: number; h: number };
}

const IPHONE_17_SCREEN = { h: 0.8953, w: 0.8933, x: 0.0533, y: 0.0797 };
const IPHONE_17_PRO_MAX_SCREEN = { h: 0.9057, w: 0.898, x: 0.051, y: 0.0723 };
const IPHONE_AIR_SCREEN = { h: 0.8913, w: 0.913, x: 0.0435, y: 0.0837 };
const IPAD_PRO_13_SCREEN = { h: 0.9173, w: 0.8974, x: 0.0513, y: 0.0413 };
const WATCH_S11_SCREEN = { h: 0.5636, w: 0.7429, x: 0.1286, y: 0.2182 };

export const DEVICE_BEZELS: DeviceBezel[] = [
	{
		height: 3000,
		id: "iphone-17-pro-max-deep-blue",
		label: "iPhone 17 Pro Max · Deep Blue",
		screen: IPHONE_17_PRO_MAX_SCREEN,
		src: "/device-bezels/iphone-17-pro-max-deep-blue.png",
		width: 1470,
	},
	{
		height: 3000,
		id: "iphone-17-pro-max-silver",
		label: "iPhone 17 Pro Max · Silver",
		screen: IPHONE_17_PRO_MAX_SCREEN,
		src: "/device-bezels/iphone-17-pro-max-silver.png",
		width: 1470,
	},
	{
		height: 3000,
		id: "iphone-17-pro-max-cosmic-orange",
		label: "iPhone 17 Pro Max · Cosmic Orange",
		screen: IPHONE_17_PRO_MAX_SCREEN,
		src: "/device-bezels/iphone-17-pro-max-cosmic-orange.png",
		width: 1470,
	},
	{
		height: 2760,
		id: "iphone-17-black",
		label: "iPhone 17 · Black",
		screen: IPHONE_17_SCREEN,
		src: "/device-bezels/iphone-17-black.png",
		width: 1350,
	},
	{
		height: 2760,
		id: "iphone-17-lavender",
		label: "iPhone 17 · Lavender",
		screen: IPHONE_17_SCREEN,
		src: "/device-bezels/iphone-17-lavender.png",
		width: 1350,
	},
	{
		height: 2880,
		id: "iphone-air-space-black",
		label: "iPhone Air · Space Black",
		screen: IPHONE_AIR_SCREEN,
		src: "/device-bezels/iphone-air-space-black.png",
		width: 1380,
	},
	{
		height: 3000,
		id: "ipad-pro-13-space-black",
		label: 'iPad Pro 13" · Space Black',
		screen: IPAD_PRO_13_SCREEN,
		src: "/device-bezels/ipad-pro-13-space-black.png",
		width: 2300,
	},
	{
		height: 3000,
		id: "ipad-pro-13-silver",
		label: 'iPad Pro 13" · Silver',
		screen: IPAD_PRO_13_SCREEN,
		src: "/device-bezels/ipad-pro-13-silver.png",
		width: 2300,
	},
	{
		height: 880,
		id: "apple-watch-s11-slate-milanese",
		label: "Apple Watch S11 · Slate + Milanese",
		screen: WATCH_S11_SCREEN,
		src: "/device-bezels/apple-watch-s11-slate-milanese.png",
		width: 560,
	},
	{
		height: 880,
		id: "apple-watch-s11-natural-caramel",
		label: "Apple Watch S11 · Natural + Caramel",
		screen: WATCH_S11_SCREEN,
		src: "/device-bezels/apple-watch-s11-natural-caramel.png",
		width: 560,
	},
];

export const DEFAULT_BEZEL_ID = DEVICE_BEZELS[0].id;

/** Bezel by id, falling back to the default so stale ids never blank out. */
export function getDeviceBezel(id: string | undefined): DeviceBezel {
	return DEVICE_BEZELS.find((b) => b.id === id) ?? DEVICE_BEZELS[0];
}
