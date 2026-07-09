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

// Weights the editor's weight picker offers; each is requested from Google
// Fonts individually so families that lack a weight (e.g. display fonts that
// only ship 400) still load — the missing-weight requests just 404 and the
// canvas synthesizes the weight instead.
const GOOGLE_FONT_WEIGHTS = [400, 500, 600, 700, 900] as const;

/**
 * Build the fonts.googleapis.com CSS2 URL for a family, optionally pinned to
 * a single weight. Pure — unit-tested without a DOM.
 */
export function googleFontCssUrl(family: string, weight?: number): string {
	const name = encodeURIComponent(family.trim()).replace(/%20/g, "+");
	const axis = weight ? `:wght@${weight}` : "";
	return `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`;
}

/** Inject a stylesheet link and resolve when it loads (false on error). */
function injectStylesheet(href: string): Promise<boolean> {
	return new Promise((resolve) => {
		const existing = document.querySelector(`link[href="${href}"]`);
		if (existing) {
			resolve(true);
			return;
		}
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = href;
		link.onload = () => resolve(true);
		link.onerror = () => {
			link.remove();
			resolve(false);
		};
		document.head.appendChild(link);
	});
}

/**
 * Load a Google Fonts family into the document so canvas text can use it.
 * Requests the base family plus each editor weight (missing weights are
 * ignored). Resolves `true` once the regular face is usable, `false` when the
 * family doesn't exist on Google Fonts. Idempotent per family.
 */
export async function loadGoogleFont(family: string): Promise<boolean> {
	if (typeof document === "undefined") return false;
	const name = family.trim();
	if (!name) return false;
	if (registeredFamilies.has(name)) return true;

	const baseLoaded = await injectStylesheet(googleFontCssUrl(name));
	if (!baseLoaded) return false;
	// Extra weights are best-effort — a 400 response just removes the link.
	await Promise.all(
		GOOGLE_FONT_WEIGHTS.filter((w) => w !== 400).map((w) =>
			injectStylesheet(googleFontCssUrl(name, w)),
		),
	);

	try {
		await document.fonts.load(`400 16px "${name}"`, "AaBb");
		if (!document.fonts.check(`400 16px "${name}"`)) return false;
	} catch {
		return false;
	}
	registeredFamilies.add(name);
	return true;
}

/**
 * Ensure every font a scene references — uploaded AND Google Fonts — is
 * loaded before the canvas renders or exports. Supersedes
 * {@link ensureCustomFontsLoaded} at the render/export call-sites.
 */
export async function ensureSceneFontsLoaded(scene: SceneData): Promise<void> {
	await Promise.all([
		ensureCustomFontsLoaded(scene),
		...(scene.googleFonts ?? []).map((family) => loadGoogleFont(family)),
	]);
}
