import {
	applyPanelCount,
	createDefaultScene,
	createShapeAnnotation,
	getTargetDimensions,
} from "@/lib/screenshot-editor";
import type { SceneData, SceneTextLayer } from "@/lib/types";

// One-click scene templates. Each template builds a complete SceneData for the
// requested display type, so it works for every iOS (App Store) and Android
// (Google Play) target size. Layer ids are template-scoped constants — a
// template is applied to a fresh scene, so they never collide.

export interface SceneTemplate {
	id: string;
	name: string;
	description: string;
	build: (displayType: string) => SceneData;
}

function headline(
	overrides: Partial<SceneTextLayer> & { text: string },
	height: number,
): SceneTextLayer {
	return {
		align: "center",
		color: "#ffffff",
		fontFamily: "Inter, system-ui, sans-serif",
		fontSize: Math.round(height * 0.045),
		id: "headline",
		weight: 700,
		x: 0.5,
		y: 0.08,
		...overrides,
	};
}

export const SCENE_TEMPLATES: SceneTemplate[] = [
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: {
					gradient: { angle: 0, from: "#4c1d95", to: "#8b5cf6" },
					gradientType: "mesh",
					mesh: ["#8b5cf6", "#ec4899", "#312e81", "#7c3aed"],
					type: "gradient",
					value: "#4c1d95",
				},
				device: {
					...scene.device!,
					// Real photographic iPhone (Apple bezel) sells the hero shot.
					bezelId: "iphone-17-pro-max-deep-blue",
					groundShadow: true,
					offsetY: 0.16,
					rotation: -8,
					rotationX: 18,
					rotationY: 26,
					scale: 0.78,
					style: "photo",
				},
				textLayers: [
					headline(
						{
							fontSize: Math.round(scene.height * 0.052),
							text: "Meet your new\nfavorite app",
							y: 0.09,
						},
						scene.height,
					),
				],
			};
		},
		description: "3D-tilted device over a violet mesh wash",
		id: "hero-3d",
		name: "Hero 3D",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				annotations: [
					{
						bg: "#111827",
						color: "#ffffff",
						fontFamily: "Inter, system-ui, sans-serif",
						fontSize: Math.round(scene.height * 0.028),
						id: "tpl-callout",
						targetX: 0.5,
						targetY: 0.58,
						text: "Everything in one tap",
						type: "callout",
						weight: 600,
						x: 0.28,
						y: 0.36,
					},
					{
						...createShapeAnnotation("tpl-arrow", "arrow", scene),
						color: "#fde047",
						x: 0.72,
						y: 0.42,
						width: 0.2,
					},
				],
				background: {
					gradient: { angle: 150, from: "#0ea5e9", to: "#2563eb" },
					type: "gradient",
					value: "#0ea5e9",
				},
				device: {
					...scene.device!,
					offsetY: 0.2,
					rotationY: -14,
					scale: 0.72,
				},
				textLayers: [
					headline({ text: "Find it faster" }, scene.height),
				],
			};
		},
		description: "Callout + hand-drawn arrow pointing at the screen",
		id: "feature-callout",
		name: "Feature callout",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: { type: "color", value: "#f8fafc" },
				device: {
					...scene.device!,
					clayColor: "#c7d2fe",
					groundShadow: true,
					offsetY: 0.18,
					scale: 0.7,
					style: "clay",
				},
				textLayers: [
					headline(
						{
							color: "#0f172a",
							text: "Simple. Fast. Yours.",
							weight: 800,
						},
						scene.height,
					),
					headline(
						{
							color: "#475569",
							fontSize: Math.round(scene.height * 0.024),
							id: "subline",
							text: "No setup required",
							weight: 500,
							y: 0.13,
						},
						scene.height,
					),
				],
			};
		},
		description: "Light minimal look with a pastel clay device",
		id: "minimal-light",
		name: "Minimal light",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: {
					pattern: { color: "#ffffff", opacity: 0.08, scale: 0.8, type: "dots" },
					type: "color",
					value: "#0b1120",
				},
				device: {
					...scene.device!,
					color: "black",
					offsetY: 0.18,
					scale: 0.72,
				},
				textLayers: [
					headline(
						{
							gradient: { from: "#a5b4fc", to: "#22d3ee" },
							text: "Work in dark mode",
						},
						scene.height,
					),
				],
			};
		},
		description: "Dark dotted backdrop with gradient headline",
		id: "minimal-dark",
		name: "Minimal dark",
	},
	{
		build: (displayType) => {
			const base = createDefaultScene(displayType);
			const scene = applyPanelCount(base, displayType, 2);
			return {
				...scene,
				background: {
					gradient: { angle: 0, from: "#0c4a6e", to: "#22d3ee" },
					gradientType: "mesh",
					mesh: ["#22d3ee", "#3b82f6", "#0f766e", "#6366f1"],
					type: "gradient",
					value: "#0c4a6e",
				},
				device: {
					...scene.device!,
					offsetX: 0,
					offsetY: 0.1,
					rotationY: 12,
					scale: 0.8,
				},
				textLayers: [
					headline({ text: "One flow", x: 0.25 }, scene.height),
					headline({ id: "headline-2", text: "Zero friction", x: 0.75 }, scene.height),
				],
			};
		},
		description: "Two-panel panorama, device crossing the seam",
		id: "panorama-duo",
		name: "Panorama duo",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				annotations: [
					{
						...createShapeAnnotation("tpl-underline", "underline", scene),
						color: "#fde047",
						width: 0.42,
						x: 0.5,
						y: 0.125,
					},
					{
						...createShapeAnnotation("tpl-sparkle", "sparkle", scene),
						color: "#fde047",
						width: 0.07,
						x: 0.85,
						y: 0.06,
					},
				],
				background: {
					gradient: { angle: 135, from: "#c026d3", to: "#4c1d95" },
					type: "gradient",
					value: "#c026d3",
				},
				device: {
					...scene.device!,
					offsetY: 0.2,
					rotation: 6,
					scale: 0.7,
				},
				textLayers: [
					headline(
						{
							fontSize: Math.round(scene.height * 0.05),
							text: "Loved by 1M+ users",
							weight: 800,
						},
						scene.height,
					),
				],
			};
		},
		description: "Bold headline with marker underline + sparkle",
		id: "bold-statement",
		name: "Bold statement",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: {
					gradient: { angle: 0, from: "#fde68a", to: "#ea580c" },
					gradientType: "radial",
					type: "gradient",
					value: "#fde68a",
					via: "#fb923c",
				},
				device: {
					...scene.device!,
					offsetY: 0.22,
					rotationX: -10,
					scale: 0.68,
				},
				textLayers: [
					headline(
						{
							color: "#7c2d12",
							curve: 60,
							fontSize: Math.round(scene.height * 0.042),
							text: "Start your journey",
							weight: 800,
							y: 0.075,
						},
						scene.height,
					),
				],
			};
		},
		description: "Curved headline over a sunrise radial wash",
		id: "curved-promo",
		name: "Curved promo",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: {
					gradient: { angle: 160, from: "#0d9488", to: "#134e4a" },
					pattern: { color: "#ffffff", opacity: 0.1, scale: 1.2, type: "waves" },
					type: "gradient",
					value: "#0d9488",
				},
				device: {
					...scene.device!,
					clayColor: "#99f6e4",
					groundShadow: true,
					offsetY: 0.16,
					rotationY: 18,
					scale: 0.74,
					style: "clay",
				},
				textLayers: [
					headline(
						{ highlight: "#134e4a", text: "Track everything" },
						scene.height,
					),
				],
			};
		},
		description: "Clay device on waves with highlighted headline",
		id: "clay-showcase",
		name: "Clay showcase",
	},
];

SCENE_TEMPLATES.push(
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				annotations: [
					{
						author: "Franklin B. — developer",
						bg: "#111827",
						color: "#ffffff",
						fontSize: Math.round(scene.height * 0.028),
						id: "tpl-review",
						showBackground: false,
						showQuoteMark: true,
						stars: 5,
						text: "Best software purchase\nI made this year.",
						type: "review",
						weight: 600,
						x: 0.5,
						y: 0.24,
					},
				],
				background: {
					gradient: { angle: 160, from: "#7c2d12", to: "#431407" },
					type: "gradient",
					value: "#7c2d12",
				},
				device: {
					...scene.device!,
					groundShadow: true,
					offsetY: 0.27,
					rotationX: 8,
					scale: 0.62,
				},
				textLayers: [
					headline({ text: "Loved by thousands", y: 0.06 }, scene.height),
				],
			};
		},
		description: "Big testimonial quote with stars over the device",
		id: "social-proof",
		name: "Social proof",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				annotations: [
					{
						bg: "#000000",
						color: "#fde68a",
						fontSize: Math.round(scene.height * 0.03),
						id: "tpl-laurel",
						text: "App of the Day",
						textBottom: "Editor's Choice",
						textTop: "2026",
						type: "laurel",
						weight: 800,
						x: 0.5,
						y: 0.115,
					},
				],
				background: {
					gradient: { angle: 0, from: "#1e1b4b", to: "#6d28d9" },
					gradientType: "radial",
					type: "gradient",
					value: "#1e1b4b",
				},
				device: {
					...scene.device!,
					groundShadow: true,
					offsetY: 0.22,
					rotationY: 10,
					scale: 0.68,
				},
				textLayers: [
					headline({ text: "Award-winning design", y: 0.05 }, scene.height),
				],
			};
		},
		description: "Laurel award badge with a radial premium wash",
		id: "award-laurel",
		name: "Award laurel",
	},
);

SCENE_TEMPLATES.push(
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: {
					pattern: { color: "#facc15", opacity: 0.16, scale: 1.5, type: "topo" },
					type: "color",
					value: "#1c1917",
				},
				device: {
					...scene.device!,
					groundShadow: true,
					offsetY: 0.2,
					rotationY: -12,
					scale: 0.7,
				},
				textLayers: [
					headline(
						{
							accentColor: "#facc15",
							accentWords: "further",
							fontSize: Math.round(scene.height * 0.05),
							text: "Go further\nevery day",
							weight: 900,
							y: 0.085,
						},
						scene.height,
					),
				],
			};
		},
		description: "Topographic-map backdrop with bold accent typography",
		id: "ascent-topo",
		name: "Ascent",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: {
					gradient: { angle: 180, from: "#fbd7a1", to: "#c2662d" },
					pattern: { color: "#9a4a1b", opacity: 0.5, scale: 1.6, type: "dunes" },
					type: "gradient",
					value: "#fbd7a1",
				},
				device: {
					...scene.device!,
					clayColor: "#f3e0c7",
					groundShadow: true,
					offsetY: 0.2,
					rotation: -4,
					scale: 0.66,
					style: "clay",
				},
				textLayers: [
					headline(
						{
							color: "#5b2d0e",
							text: "Find your trail",
							weight: 800,
						},
						scene.height,
					),
					headline(
						{
							color: "#7c4a24",
							fontSize: Math.round(scene.height * 0.023),
							id: "subline",
							text: "Offline maps for every adventure",
							weight: 500,
							y: 0.125,
						},
						scene.height,
					),
				],
			};
		},
		description: "Sand-and-terracotta dunes with a warm clay device",
		id: "sahara-dunes",
		name: "Sahara",
	},
);

SCENE_TEMPLATES.push(
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: {
					pattern: { color: "#8a6b48", opacity: 0.08, scale: 0.9, type: "noise" },
					type: "color",
					value: "#f4e9d8",
				},
				device: {
					...scene.device!,
					color: "silver",
					groundShadow: true,
					offsetY: 0.19,
					scale: 0.66,
				},
				textLayers: [
					headline(
						{
							color: "#3f2d1d",
							fontFamily: "Georgia, serif",
							fontSize: Math.round(scene.height * 0.046),
							text: "Chapter one:\nyour best reads",
							weight: 700,
							y: 0.075,
						},
						scene.height,
					),
					headline(
						{
							color: "#7a5c3e",
							fontFamily: "Georgia, serif",
							fontSize: Math.round(scene.height * 0.022),
							id: "subline",
							text: "A library that feels like paper",
							weight: 400,
							y: 0.145,
						},
						scene.height,
					),
				],
			};
		},
		description: "Warm paperback look with serif typography",
		id: "serif-paperback",
		name: "Serif",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				background: {
					gradient: { angle: 0, from: "#111827", to: "#030712" },
					gradientType: "radial",
					type: "gradient",
					value: "#111827",
					via: "#1f2937",
				},
				device: {
					...scene.device!,
					color: "black",
					glare: true,
					groundShadow: true,
					offsetY: 0.2,
					rotationY: 8,
					scale: 0.7,
				},
				textLayers: [
					headline(
						{
							gradient: { from: "#f9fafb", to: "#9ca3af" },
							text: "After hours,\nin style",
							weight: 800,
						},
						scene.height,
					),
				],
			};
		},
		description: "Premium dark look with glass glare and silver text",
		id: "midnight-premium",
		name: "Midnight",
	},
	{
		build: (displayType) => {
			const scene = createDefaultScene(displayType);
			return {
				...scene,
				annotations: [
					{
						bg: "#0c4a6e",
						color: "#e0f2fe",
						fontFamily: '"Courier New", monospace',
						fontSize: Math.round(scene.height * 0.02),
						id: "tpl-spec",
						showBackground: true,
						text: "fig. 01 — main view",
						type: "label",
						weight: 600,
						x: 0.5,
						y: 0.155,
					},
				],
				background: {
					pattern: { color: "#7dd3fc", opacity: 0.16, scale: 0.75, type: "grid" },
					type: "color",
					value: "#0c4a6e",
				},
				device: {
					...scene.device!,
					offsetY: 0.21,
					scale: 0.66,
				},
				textLayers: [
					headline(
						{
							color: "#e0f2fe",
							fontFamily: '"Courier New", monospace',
							fontSize: Math.round(scene.height * 0.04),
							text: "Engineered for focus",
							weight: 700,
							y: 0.08,
						},
						scene.height,
					),
				],
			};
		},
		description: "Technical blueprint grid with monospace labels",
		id: "blueprint-grid",
		name: "Blueprint",
	},
);

SCENE_TEMPLATES.push({
	build: (displayType) => {
		const scene = createDefaultScene(displayType);
		return {
			...scene,
			annotations: [
				{
					bg: "#16a34a",
					color: "#ffffff",
					fontSize: Math.round(scene.height * 0.024),
					id: "tpl-level",
					text: "LEVEL UP",
					type: "badge",
					weight: 800,
					x: 0.24,
					y: 0.165,
				},
				{
					...createShapeAnnotation("tpl-star1", "star", scene),
					color: "#f59e0b",
					width: 0.06,
					x: 0.82,
					y: 0.14,
				},
				{
					...createShapeAnnotation("tpl-star2", "star", scene),
					color: "#f59e0b",
					width: 0.04,
					x: 0.9,
					y: 0.19,
				},
			],
			background: {
				pattern: { color: "#0f766e", opacity: 0.1, scale: 0.9, type: "dots" },
				type: "color",
				value: "#ecfdf5",
			},
			device: {
				...scene.device!,
				clayColor: "#99f6e4",
				groundShadow: true,
				offsetY: 0.21,
				rotation: 3,
				scale: 0.66,
				style: "clay",
			},
			textLayers: [
				headline(
					{
						accentColor: "#16a34a",
						accentWords: "smarter",
						color: "#134e4a",
						fontSize: Math.round(scene.height * 0.046),
						text: "Learn smarter,\nnot longer",
						weight: 900,
						y: 0.075,
					},
					scene.height,
				),
			],
		};
	},
	description: "Clean gamified learning look with badge and stars",
	id: "all-the-wiser",
	name: "All The Wiser",
});

SCENE_TEMPLATES.push({
	build: (displayType) => {
		const scene = createDefaultScene(displayType);
		return {
			...scene,
			annotations: [
				{
					...createShapeAnnotation("tpl-spark-a", "sparkle", scene),
					color: "#fff7ed",
					width: 0.06,
					x: 0.14,
					y: 0.2,
				},
				{
					...createShapeAnnotation("tpl-spark-b", "sparkle", scene),
					color: "#fde68a",
					width: 0.045,
					x: 0.87,
					y: 0.1,
				},
			],
			background: {
				gradient: { angle: 170, from: "#f472b6", to: "#7c3aed" },
				pattern: { color: "#ffffff", opacity: 0.05, scale: 0.9, type: "noise" },
				type: "gradient",
				value: "#f472b6",
				via: "#fb923c",
			},
			device: {
				...scene.device!,
				glare: true,
				groundShadow: true,
				offsetY: 0.19,
				rotation: -6,
				rotationY: 16,
				scale: 0.7,
			},
			textLayers: [
				headline(
					{
						fontSize: Math.round(scene.height * 0.05),
						shadowBlur: Math.round(scene.height * 0.01),
						shadowColor: "#7c2d12",
						shadowOffsetX: 0,
						shadowOffsetY: Math.round(scene.height * 0.004),
						text: "Own the night",
						weight: 900,
						y: 0.08,
					},
					scene.height,
				),
			],
		};
	},
	description: "Vibrant sunset wash with glare and sparkles",
	id: "sunset-blvd",
	name: "Sunset Blvd",
});

SCENE_TEMPLATES.push({
	build: (displayType) => {
		const scene = createDefaultScene(displayType);
		return {
			...scene,
			background: {
				gradient: { angle: 180, from: "#ece3d6", to: "#cdbba4" },
				type: "gradient",
				value: "#ece3d6",
			},
			device: {
				...scene.device!,
				clayColor: "#d8c6ae",
				groundShadow: true,
				offsetY: 0.2,
				scale: 0.66,
				style: "clay",
			},
			textLayers: [
				headline(
					{
						color: "#4a3b2c",
						fontFamily: "Georgia, serif",
						fontSize: Math.round(scene.height * 0.044),
						text: "Breathe in.\nBreathe out.",
						weight: 400,
						y: 0.08,
					},
					scene.height,
				),
				headline(
					{
						color: "#7d6a52",
						fontFamily: "Georgia, serif",
						fontSize: Math.round(scene.height * 0.021),
						id: "subline",
						text: "Guided calm, five minutes a day",
						weight: 400,
						y: 0.15,
					},
					scene.height,
				),
			],
		};
	},
	description: "Calming earthtones with a clay device and serif type",
	id: "ethereal-calm",
	name: "Ethereal",
});

SCENE_TEMPLATES.push({
	build: (displayType) => {
		const scene = createDefaultScene(displayType);
		return {
			...scene,
			annotations: [
				{
					bg: "#14532d",
					color: "#dcfce7",
					fontSize: Math.round(scene.height * 0.022),
					id: "tpl-pine-badge",
					text: "OFFLINE READY",
					type: "badge",
					weight: 700,
					x: 0.5,
					y: 0.155,
				},
			],
			background: {
				gradient: { angle: 180, from: "#1a2e1a", to: "#0b150d" },
				pattern: { color: "#4ade80", opacity: 0.07, scale: 1.8, type: "topo" },
				type: "gradient",
				value: "#1a2e1a",
			},
			device: {
				...scene.device!,
				clayColor: "#2f4a33",
				groundShadow: true,
				offsetY: 0.21,
				rotationY: -8,
				scale: 0.66,
				style: "clay",
			},
			textLayers: [
				headline(
					{
						color: "#ecfdf5",
						fontSize: Math.round(scene.height * 0.046),
						text: "Into the woods",
						weight: 800,
						y: 0.08,
					},
					scene.height,
				),
			],
		};
	},
	description: "Deep forest greens with topo contours and a clay device",
	id: "pinecrest-forest",
	name: "Pinecrest",
});

/**
 * Apply a template while preserving the parts of the current scene the user
 * already invested in: the device screenshot and any loaded fonts.
 */
export function applyTemplate(
	template: SceneTemplate,
	current: SceneData,
	displayType: string,
): SceneData {
	const built = template.build(displayType);
	const [width] = getTargetDimensions(displayType);
	return {
		...built,
		customFonts: current.customFonts,
		googleFonts: current.googleFonts,
		screenshot: current.screenshot,
		// Safety: template width must stay a multiple of the target width.
		width: built.width || width,
	};
}
