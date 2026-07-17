import {
	createDefaultScene,
	createShapeAnnotation,
} from "@/lib/screenshot-editor";
import type {
	SceneAnnotation,
	SceneBackground,
	SceneData,
	SceneDevice,
	SceneTextLayer,
} from "@/lib/types";

// Full store-listing sets: one click creates a COMPLETE set of 7 scenes
// (intro → features → social proof → award → call-to-action) sharing one
// visual theme, so a whole App Store / Google Play listing ships in minutes.
// Each screen is a normal scene — fully editable after creation.

export interface SceneSetScreen {
	/** Scene name shown in the gallery ("1. Intro" …). */
	name: string;
	build: (displayType: string) => SceneData;
}

export interface SceneSetTemplate {
	id: string;
	name: string;
	description: string;
	screens: SceneSetScreen[];
}

/** Visual theme shared by every screen of a set. */
interface SetTheme {
	background: SceneBackground;
	/** Optional alternate background for even screens (subtle variety). */
	backgroundAlt?: SceneBackground;
	headlineColor: string;
	subColor: string;
	accentColor: string;
	badgeBg: string;
	badgeColor: string;
	device: Partial<SceneDevice>;
	headlineWeight?: number;
	fontFamily?: string;
}

const HEADLINE_Y = 0.075;
const SUB_Y = 0.14;

function themedHeadline(
	theme: SetTheme,
	height: number,
	text: string,
	overrides: Partial<SceneTextLayer> = {},
): SceneTextLayer {
	return {
		align: "center",
		color: theme.headlineColor,
		fontFamily: theme.fontFamily ?? "Inter, system-ui, sans-serif",
		fontSize: Math.round(height * 0.045),
		id: "headline",
		text,
		weight: theme.headlineWeight ?? 800,
		x: 0.5,
		y: HEADLINE_Y,
		...overrides,
	};
}

function themedSub(
	theme: SetTheme,
	height: number,
	text: string,
	overrides: Partial<SceneTextLayer> = {},
): SceneTextLayer {
	return {
		align: "center",
		color: theme.subColor,
		fontFamily: theme.fontFamily ?? "Inter, system-ui, sans-serif",
		fontSize: Math.round(height * 0.022),
		id: "subline",
		text,
		weight: 500,
		x: 0.5,
		y: SUB_Y,
		...overrides,
	};
}

function themedScene(
	theme: SetTheme,
	displayType: string,
	alt: boolean,
	device: Partial<SceneDevice>,
	textLayers: (scene: SceneData) => SceneTextLayer[],
	annotations?: (scene: SceneData) => SceneAnnotation[],
): SceneData {
	const scene = createDefaultScene(displayType);
	return {
		...scene,
		annotations: annotations ? annotations(scene) : undefined,
		background:
			alt && theme.backgroundAlt ? theme.backgroundAlt : theme.background,
		device: {
			...scene.device!,
			groundShadow: true,
			...theme.device,
			...device,
		},
		textLayers: textLayers(scene),
	};
}

/** The 7-screen story arc every set follows. */
function buildScreens(
	theme: SetTheme,
	copy: {
		intro: string;
		introSub: string;
		featureA: string;
		featureACallout: string;
		review: string;
		reviewAuthor: string;
		featureB: string;
		award: string;
		featureC: string;
		cta: string;
		ctaSub: string;
	},
): SceneSetScreen[] {
	return [
		{
			build: (d) =>
				themedScene(
					theme,
					d,
					false,
					{ offsetY: 0.16, rotationX: 14, rotationY: 20, scale: 0.76 },
					(s) => [
						themedHeadline(theme, s.height, copy.intro, {
							fontSize: Math.round(s.height * 0.052),
						}),
						themedSub(theme, s.height, copy.introSub, { y: 0.155 }),
					],
				),
			name: "1. Intro",
		},
		{
			build: (d) =>
				themedScene(
					theme,
					d,
					true,
					{ offsetX: 0.05, offsetY: 0.2, rotationY: -16, scale: 0.72 },
					(s) => [themedHeadline(theme, s.height, copy.featureA)],
					(s) => [
						{
							bg: theme.badgeBg,
							color: theme.badgeColor,
							fontSize: Math.round(s.height * 0.026),
							id: "set-callout",
							targetX: 0.55,
							targetY: 0.55,
							text: copy.featureACallout,
							type: "callout",
							weight: 600,
							x: 0.3,
							y: 0.3,
						},
					],
				),
			name: "2. Feature A",
		},
		{
			build: (d) =>
				themedScene(
					theme,
					d,
					false,
					{ offsetY: 0.3, scale: 0.56 },
					(s) => [themedHeadline(theme, s.height, "Loved by users")],
					(s) => [
						{
							author: copy.reviewAuthor,
							bg: theme.badgeBg,
							color: theme.headlineColor,
							fontSize: Math.round(s.height * 0.026),
							id: "set-review",
							showBackground: false,
							showQuoteMark: true,
							stars: 5,
							text: copy.review,
							type: "review",
							weight: 600,
							x: 0.5,
							y: 0.235,
						},
					],
				),
			name: "3. Reviews",
		},
		{
			build: (d) =>
				themedScene(
					theme,
					d,
					true,
					{ offsetX: -0.05, offsetY: 0.2, rotationY: 16, scale: 0.72 },
					(s) => [
						themedHeadline(theme, s.height, copy.featureB, {
							accentColor: theme.accentColor,
							accentWords: copy.featureB.split(/\s+/).slice(-1)[0],
						}),
					],
					(s) => [
						{
							...createShapeAnnotation("set-underline", "underline", s),
							color: theme.accentColor,
							width: 0.34,
							x: 0.5,
							y: 0.125,
						},
					],
				),
			name: "4. Feature B",
		},
		{
			build: (d) =>
				themedScene(
					theme,
					d,
					false,
					{ offsetY: 0.24, rotationY: 8, scale: 0.62 },
					(s) => [themedHeadline(theme, s.height, copy.award)],
					(s) => [
						{
							bg: theme.badgeBg,
							color: theme.accentColor,
							fontSize: Math.round(s.height * 0.028),
							id: "set-laurel",
							text: "App of the Day",
							textBottom: "Editor's Choice",
							textTop: "2026",
							type: "laurel",
							weight: 800,
							x: 0.5,
							y: 0.16,
						},
					],
				),
			name: "5. Award",
		},
		{
			build: (d) =>
				themedScene(
					theme,
					d,
					true,
					{ offsetY: 0.2, scale: 0.7 },
					(s) => [themedHeadline(theme, s.height, copy.featureC)],
					(s) => [
						{
							bg: theme.badgeBg,
							color: theme.badgeColor,
							fontSize: Math.round(s.height * 0.022),
							id: "set-badge",
							text: "NEW",
							type: "badge",
							weight: 800,
							x: 0.78,
							y: 0.16,
						},
					],
				),
			name: "6. Feature C",
		},
		{
			build: (d) =>
				themedScene(
					theme,
					d,
					false,
					{ offsetY: 0.32, rotationX: -10, scale: 0.6 },
					(s) => [
						themedHeadline(theme, s.height, copy.cta, {
							fontSize: Math.round(s.height * 0.052),
							y: 0.09,
						}),
						themedSub(theme, s.height, copy.ctaSub, { y: 0.165 }),
					],
					(s) => [
						{
							...createShapeAnnotation("set-spark", "sparkle", s),
							color: theme.accentColor,
							width: 0.06,
							x: 0.85,
							y: 0.06,
						},
					],
				),
			name: "7. Get the app",
		},
	];
}

export const SCENE_SET_TEMPLATES: SceneSetTemplate[] = [
	{
		description: "Violet mesh wash, white type, yellow accents — 7 screens",
		id: "set-aurora",
		name: "Aurora set",
		screens: buildScreens(
			{
				accentColor: "#fde047",
				background: {
					gradient: { angle: 0, from: "#4c1d95", to: "#8b5cf6" },
					gradientType: "mesh",
					mesh: ["#8b5cf6", "#ec4899", "#312e81", "#7c3aed"],
					type: "gradient",
					value: "#4c1d95",
				},
				backgroundAlt: {
					gradient: { angle: 150, from: "#5b21b6", to: "#1e1b4b" },
					type: "gradient",
					value: "#5b21b6",
				},
				badgeBg: "#1e1b4b",
				badgeColor: "#e9d5ff",
				device: {},
				headlineColor: "#ffffff",
				subColor: "#ddd6fe",
			},
			{
				award: "Award-winning design",
				cta: "Start today",
				ctaSub: "Free to try — no card needed",
				featureA: "Everything in one place",
				featureACallout: "One tap does it all",
				featureB: "Built for speed",
				featureC: "Always in sync",
				intro: "Meet your new\nfavorite app",
				introSub: "Simple. Fast. Yours.",
				review: "This solves so many\nof my problems.",
				reviewAuthor: "Mark — App Reviewer",
			},
		),
	},
	{
		description: "Dark dotted look with cyan accents — 7 screens",
		id: "set-midnight",
		name: "Midnight set",
		screens: buildScreens(
			{
				accentColor: "#22d3ee",
				background: {
					pattern: { color: "#ffffff", opacity: 0.08, scale: 0.8, type: "dots" },
					type: "color",
					value: "#0b1120",
				},
				backgroundAlt: {
					gradient: { angle: 0, from: "#111827", to: "#030712" },
					gradientType: "radial",
					type: "gradient",
					value: "#111827",
				},
				badgeBg: "#164e63",
				badgeColor: "#cffafe",
				device: { color: "black", glare: true },
				headlineColor: "#f9fafb",
				subColor: "#9ca3af",
			},
			{
				award: "Rated by the press",
				cta: "Join the night shift",
				ctaSub: "Free 7-day trial",
				featureA: "Focus without noise",
				featureACallout: "Distraction-free mode",
				featureB: "Dark mode native",
				featureC: "Private by default",
				intro: "Work in\ndark mode",
				introSub: "Designed for late hours",
				review: "Best software purchase\nI made this year.",
				reviewAuthor: "Franklin B. — developer",
			},
		),
	},
	{
		description: "Sand-and-terracotta dunes with clay devices — 7 screens",
		id: "set-sahara",
		name: "Sahara set",
		screens: buildScreens(
			{
				accentColor: "#9a3412",
				background: {
					gradient: { angle: 180, from: "#fbd7a1", to: "#c2662d" },
					pattern: { color: "#9a4a1b", opacity: 0.45, scale: 1.6, type: "dunes" },
					type: "gradient",
					value: "#fbd7a1",
				},
				backgroundAlt: {
					gradient: { angle: 180, from: "#f6e3c5", to: "#d99a55" },
					type: "gradient",
					value: "#f6e3c5",
				},
				badgeBg: "#7c2d12",
				badgeColor: "#ffedd5",
				device: { clayColor: "#f3e0c7", style: "clay" },
				headlineColor: "#5b2d0e",
				subColor: "#7c4a24",
			},
			{
				award: "Trusted on the trail",
				cta: "Pack it along",
				ctaSub: "Works fully offline",
				featureA: "Maps that never quit",
				featureACallout: "Offline maps built in",
				featureB: "Find your trail",
				featureC: "Track every step",
				intro: "Adventure\nstarts here",
				introSub: "Offline maps for every trip",
				review: "My kids love it and improve\ntheir vocabulary — a win-win!",
				reviewAuthor: "Sug — parent",
			},
		),
	},
];

export function getSceneSetTemplate(id: string): SceneSetTemplate | undefined {
	return SCENE_SET_TEMPLATES.find((s) => s.id === id);
}
