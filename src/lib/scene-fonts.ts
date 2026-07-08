import type { SceneCustomFont, SceneData } from "@/lib/types";

/**
 * Derive a CSS font-family name from an uploaded font file name: strips the
 * extension, replaces unsafe characters and collapses whitespace. Pure.
 */
export function sanitizeFontFamilyName(fileName: string): string {
	const base = fileName.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, "");
	const cleaned = base
		.replace(/[^a-zA-Z0-9 _-]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return cleaned || "Custom Font";
}

/**
 * Return `base` or `base 2`/`base 3`… so the family name never collides with
 * an already-registered family (case-insensitive). Pure.
 */
export function dedupeFontFamily(base: string, existing: string[]): string {
	const taken = new Set(existing.map((f) => f.toLowerCase()));
	if (!taken.has(base.toLowerCase())) return base;
	let i = 2;
	while (taken.has(`${base.toLowerCase()} ${i}`)) i++;
	return `${base} ${i}`;
}

// Families already registered on document.fonts in this session, so repeated
// renders/exports never re-add or re-load the same FontFace.
const registeredFamilies = new Set<string>();

/**
 * Register a single custom font on `document.fonts` and wait for it to load.
 * Idempotent per family — subsequent calls resolve immediately.
 */
export async function registerCustomFont(font: SceneCustomFont): Promise<void> {
	if (typeof FontFace === "undefined" || typeof document === "undefined") {
		return;
	}
	if (registeredFamilies.has(font.family)) return;
	try {
		const face = new FontFace(font.family, `url(${font.dataUrl})`);
		await face.load();
		document.fonts.add(face);
		registeredFamilies.add(font.family);
	} catch {
		// Invalid/corrupt font file — canvas falls back to the default family.
	}
}

/**
 * Ensure every custom font referenced by a scene is registered and loaded
 * before the canvas renders or exports, so PNGs use the real glyphs instead
 * of a fallback. Idempotent and safe to call on scenes without custom fonts.
 */
export async function ensureCustomFontsLoaded(scene: SceneData): Promise<void> {
	const fonts = scene.customFonts ?? [];
	if (fonts.length === 0) return;
	await Promise.all(fonts.map((font) => registerCustomFont(font)));
}
