/**
 * Google Play data for the free ASO check-up. Play has no CORS-friendly
 * public API, so these calls go through our thin public proxy (rate-limited,
 * cached per keyword+country server-side). Scoring still happens in the
 * visitor's browser with the shared engine.
 */
import type { KeywordCompetitor } from "@/lib/aso-engine/scoring-types";
import type { AppSuggestion, CheckedApp } from "./itunes";

async function proxyPost<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(path, {
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
	if (!res.ok) {
		const detail = (await res.json().catch(() => null)) as {
			data?: { info?: string };
		} | null;
		throw new Error(
			detail?.data?.info ?? `Google Play request failed (HTTP ${res.status})`,
		);
	}
	return (await res.json()) as T;
}

export async function lookupPlayApp(
	appId: string,
	country: string,
): Promise<CheckedApp | null> {
	try {
		return await proxyPost<CheckedApp>("/api/public/play/lookup", {
			appId,
			country,
		});
	} catch (err) {
		if (err instanceof Error && err.message.includes("not found")) {
			return null;
		}
		throw err;
	}
}

export async function playKeywordData(
	keyword: string,
	country: string,
	appId?: string,
): Promise<{ competitors: KeywordCompetitor[]; rank: number | null }> {
	// Omit appId entirely for keyword-only checks - an empty string fails
	// the endpoint's validation.
	return proxyPost("/api/public/play/keyword-data", {
		country,
		keyword,
		...(appId ? { appId } : {}),
	});
}

/** App-name typeahead against Google Play (via the public proxy). */
export async function searchPlayApps(
	term: string,
	country: string,
): Promise<AppSuggestion[]> {
	const { suggestions } = await proxyPost<{
		suggestions: Array<{
			appId: string;
			title: string;
			developer: string;
			icon?: string;
			rating?: number;
		}>;
	}>("/api/public/play/search", { country, term });
	return suggestions.map((s) => ({ ...s, store: "playstore" as const }));
}
