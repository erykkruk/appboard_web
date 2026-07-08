import type {
	ScreenshotDimensionErrorData,
	ScreenshotValidationResult,
} from "@/lib/types";

const MULTIPLICATION_SIGN = "×"; // ×

/** Format a list of [w, h] pairs as "1290×2796 or 2796×1290". */
export function formatSupportedDimensions(
	supportedDimensions: [number, number][],
): string {
	return supportedDimensions
		.map(([w, h]) => `${w}${MULTIPLICATION_SIGN}${h}`)
		.join(" or ");
}

/** Format a single [w, h] pair as "1000×2000". */
export function formatDimensions([w, h]: [number, number]): string {
	return `${w}${MULTIPLICATION_SIGN}${h}`;
}

/**
 * Build a clear, actionable message from the structured dimension error data
 * the backend returns on a failed upload (or from the pre-upload /validate
 * response when invalid). Prefers the backend-provided `suggestion` (accurate
 * per platform — e.g. the flexible Android size rule); otherwise falls back to
 * an English message naming the device, the provided size and the accepted
 * sizes so the user knows exactly what to fix.
 */
export function buildDimensionMessage(
	data: Pick<
		ScreenshotDimensionErrorData,
		"displayTypeName" | "providedDimensions" | "supportedDimensions"
	> & { suggestion?: string },
): string {
	if (data.suggestion) return data.suggestion;
	const provided = formatDimensions(data.providedDimensions);
	const supported = formatSupportedDimensions(data.supportedDimensions);
	return `Invalid dimensions for ${data.displayTypeName}: provided ${provided}px, expected ${supported}px.`;
}

/**
 * Build a pre-upload warning from the /validate response. Returns `null` when
 * the dimensions are valid (no warning needed).
 */
export function buildValidationWarning(
	result: ScreenshotValidationResult,
): string | null {
	if (result.valid) return null;
	return buildDimensionMessage(result);
}
