import type { HistoryEntry } from "@/lib/types";

/**
 * History entries store listing DB column names (e.g. "fullDesc"), while the
 * version editor form uses platform capability keys (e.g. "description" on
 * iOS, "fullDescription" on Android). Candidates are ordered — the first key
 * present in the editor's visible fields wins, so the same history field
 * resolves correctly on both platforms.
 */
const HISTORY_FIELD_FORM_CANDIDATES: Record<string, string[]> = {
	fullDesc: ["description", "fullDescription"],
	keywords: ["keywords"],
	marketingUrl: ["marketingUrl"],
	promoText: ["promotionalText"],
	shortDesc: ["subtitle", "shortDescription"],
	supportUrl: ["supportUrl"],
	title: ["title"],
	whatsNew: ["whatsNew"],
};

/**
 * Resolve which editor form field a history entry belongs to. Returns null
 * when the history field has no visible counterpart in the current form
 * (e.g. "privacyUrl", "videoUrl", or a capability-filtered field) — the
 * caller should then fall back to showing the diff outside the form.
 */
export function resolvePreviewFormField(
	historyField: string,
	visibleFieldKeys: readonly string[],
): string | null {
	const candidates = HISTORY_FIELD_FORM_CANDIDATES[historyField] ?? [];
	return candidates.find((key) => visibleFieldKeys.includes(key)) ?? null;
}

export function formatPreviewDate(entry: HistoryEntry): string {
	const date = new Date(entry.publishedAt ?? entry.createdAt);
	const dateStr = date.toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
	const timeStr = date.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${dateStr} · ${timeStr}`;
}
