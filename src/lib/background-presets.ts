import type { SceneBackground } from "@/lib/types";

// Curated background gallery for the screenshot editor. Each preset is a plain
// `SceneBackground` the editor applies verbatim, so presets survive round-trips
// through the opaque scene JSON with no special casing.

export interface BackgroundPreset {
	name: string;
	background: SceneBackground;
}

const linear = (
	name: string,
	from: string,
	to: string,
	angle = 135,
	via?: string,
): BackgroundPreset => ({
	background: { gradient: { angle, from, to }, type: "gradient", value: from, via },
	name,
});

const radial = (
	name: string,
	from: string,
	to: string,
	via?: string,
): BackgroundPreset => ({
	background: {
		gradient: { angle: 0, from, to },
		gradientType: "radial",
		type: "gradient",
		value: from,
		via,
	},
	name,
});

const mesh = (
	name: string,
	base: string,
	colors: string[],
): BackgroundPreset => ({
	background: {
		gradient: { angle: 0, from: base, to: colors[0] ?? base },
		gradientType: "mesh",
		mesh: colors,
		type: "gradient",
		value: base,
	},
	name,
});

const patterned = (
	name: string,
	background: SceneBackground,
): BackgroundPreset => ({ background, name });

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
	// Linear gradients.
	linear("Indigo", "#6366f1", "#8b5cf6"),
	linear("Sunset", "#f97316", "#ec4899"),
	linear("Ocean", "#0ea5e9", "#2563eb"),
	linear("Candy", "#f472b6", "#a78bfa", 120),
	linear("Forest", "#059669", "#14532d"),
	linear("Midnight", "#0f172a", "#334155"),
	linear("Peach", "#fdba74", "#fb7185", 160),
	linear("Lime", "#a3e635", "#059669"),
	linear("Gold", "#fbbf24", "#d97706", 150),
	linear("Berry", "#c026d3", "#4c1d95"),
	linear("Steel", "#94a3b8", "#334155", 165),
	linear("Aurora", "#22d3ee", "#a78bfa", 135, "#6366f1"),
	linear("Flamingo", "#fb7185", "#fbbf24", 135, "#f97316"),
	linear("Deep sea", "#155e75", "#1e1b4b", 145, "#1d4ed8"),
	// Radial washes.
	radial("Halo", "#a5b4fc", "#312e81"),
	radial("Sunrise", "#fde68a", "#ea580c", "#fb923c"),
	radial("Mint glow", "#a7f3d0", "#065f46"),
	radial("Rose glow", "#fecdd3", "#9f1239"),
	// Mesh washes.
	mesh("Mesh violet", "#4c1d95", ["#8b5cf6", "#ec4899", "#312e81", "#7c3aed"]),
	mesh("Mesh pastel", "#fdf2f8", ["#bfdbfe", "#fbcfe8", "#ddd6fe", "#bbf7d0"]),
	mesh("Mesh sunset", "#7c2d12", ["#f97316", "#ec4899", "#facc15", "#be123c"]),
	mesh("Mesh ocean", "#0c4a6e", ["#22d3ee", "#3b82f6", "#0f766e", "#6366f1"]),
	// Solid + pattern combos.
	patterned("Dots dark", {
		pattern: { color: "#ffffff", opacity: 0.12, scale: 0.8, type: "dots" },
		type: "color",
		value: "#111827",
	}),
	patterned("Grid indigo", {
		gradient: { angle: 135, from: "#4338ca", to: "#312e81" },
		pattern: { color: "#ffffff", opacity: 0.1, scale: 1.4, type: "grid" },
		type: "gradient",
		value: "#4338ca",
	}),
	patterned("Waves teal", {
		gradient: { angle: 160, from: "#0d9488", to: "#134e4a" },
		pattern: { color: "#ffffff", opacity: 0.12, scale: 1.2, type: "waves" },
		type: "gradient",
		value: "#0d9488",
	}),
	patterned("Rings plum", {
		gradient: { angle: 0, from: "#701a75", to: "#3b0764" },
		gradientType: "radial",
		pattern: { color: "#f0abfc", opacity: 0.14, scale: 1.6, type: "rings" },
		type: "gradient",
		value: "#701a75",
	}),
	patterned("Diagonal slate", {
		type: "color",
		value: "#1e293b",
		pattern: { color: "#ffffff", opacity: 0.07, scale: 0.7, type: "diagonal" },
	}),
	patterned("Dots cream", {
		type: "color",
		value: "#fef3c7",
		pattern: { color: "#d97706", opacity: 0.25, scale: 0.9, type: "dots" },
	}),
];

/**
 * CSS `background` approximation of a scene background, used for the preset
 * swatch grid (the canvas renderer stays the source of truth for real pixels).
 */
export function cssPreviewForBackground(background: SceneBackground): string {
	if (background.type === "gradient" && background.gradient) {
		const { from, to, angle } = background.gradient;
		const kind = background.gradientType ?? "linear";
		if (kind === "mesh") {
			const blobs = (background.mesh ?? [to]).slice(0, 4);
			const anchors = ["15% 20%", "85% 15%", "80% 85%", "25% 80%"];
			const layers = blobs.map(
				(color, i) =>
					`radial-gradient(circle at ${anchors[i % anchors.length]}, ${color} 0%, transparent 60%)`,
			);
			return `${layers.join(", ")}, ${from}`;
		}
		if (kind === "radial") {
			const stops = background.via
				? `${from}, ${background.via}, ${to}`
				: `${from}, ${to}`;
			return `radial-gradient(circle at 50% 42%, ${stops})`;
		}
		const stops = background.via
			? `${from}, ${background.via}, ${to}`
			: `${from}, ${to}`;
		return `linear-gradient(${angle + 90}deg, ${stops})`;
	}
	return background.value || "#000000";
}
