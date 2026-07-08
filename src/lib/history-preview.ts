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

export function getEntryTimestamp(entry: HistoryEntry): Date {
	return new Date(entry.publishedAt ?? entry.createdAt);
}

export function formatPreviewDay(date: Date): string {
	return date.toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function formatPreviewDate(entry: HistoryEntry): string {
	const date = getEntryTimestamp(entry);
	const timeStr = date.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${formatPreviewDay(date)} · ${timeStr}`;
}

export interface HistoryChangeDate {
	/** Local midnight of the day the changes happened. */
	date: Date;
	count: number;
}

/**
 * Distinct local calendar days on which anything changed, newest first,
 * with the number of history entries per day.
 */
export function listChangeDates(entries: HistoryEntry[]): HistoryChangeDate[] {
	const byDay = new Map<number, HistoryChangeDate>();
	for (const entry of entries) {
		const ts = getEntryTimestamp(entry);
		const day = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate());
		const key = day.getTime();
		const existing = byDay.get(key);
		if (existing) {
			existing.count += 1;
		} else {
			byDay.set(key, { count: 1, date: day });
		}
	}
	return Array.from(byDay.values()).sort(
		(a, b) => b.date.getTime() - a.date.getTime(),
	);
}

export interface ChangeSinceDate {
	field: string;
	language: string;
	thenValue: string;
	todayValue: string;
}

/**
 * Compute "what changed between sinceDate and today" per (language, field)
 * pair. The value "as of" the date is the oldValue of the OLDEST history
 * entry at/after sinceDate (i.e. the state before the first change after
 * that date). Pairs with no entries after the date are unchanged and
 * skipped; pairs whose value then equals the value today (changed back and
 * forth) are skipped too.
 *
 * `getTodayValue` supplies the current editor value; returning null falls
 * back to the pair's most recent history newValue (for fields without a
 * form input, e.g. "privacyUrl").
 */
export function computeChangesSinceDate(
	entries: HistoryEntry[],
	sinceDate: Date,
	getTodayValue: (language: string, field: string) => string | null,
): ChangeSinceDate[] {
	const oldestSince = new Map<string, HistoryEntry>();
	const latestOverall = new Map<string, HistoryEntry>();

	for (const entry of entries) {
		const key = `${entry.language}:${entry.field}`;
		const ts = getEntryTimestamp(entry).getTime();

		const latest = latestOverall.get(key);
		if (!latest || ts > getEntryTimestamp(latest).getTime()) {
			latestOverall.set(key, entry);
		}

		if (ts >= sinceDate.getTime()) {
			const oldest = oldestSince.get(key);
			if (!oldest || ts < getEntryTimestamp(oldest).getTime()) {
				oldestSince.set(key, entry);
			}
		}
	}

	const changes: ChangeSinceDate[] = [];
	for (const [key, entry] of oldestSince) {
		const thenValue = entry.oldValue ?? "";
		const todayValue =
			getTodayValue(entry.language, entry.field) ??
			latestOverall.get(key)?.newValue ??
			"";
		if (thenValue === todayValue) continue;
		changes.push({
			field: entry.field,
			language: entry.language,
			thenValue,
			todayValue,
		});
	}

	return changes.sort(
		(a, b) =>
			a.language.localeCompare(b.language) || a.field.localeCompare(b.field),
	);
}
