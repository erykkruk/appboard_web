/**
 * Browser-side iTunes client for the free ASO check-up.
 *
 * Every request goes STRAIGHT from the visitor's browser to Apple - our
 * backend never calls iTunes for anonymous check-ups. Primary transport is
 * fetch (iTunes sends permissive CORS headers); when that fails the client
 * falls back to JSONP, which the iTunes Search API supports via `callback=`.
 */
import type { KeywordCompetitor } from "@/lib/aso-engine/scoring-types";

const SEARCH_URL = "https://itunes.apple.com/search";
const LOOKUP_URL = "https://itunes.apple.com/lookup";
const JSONP_TIMEOUT_MS = 12_000;
const RANK_SEARCH_LIMIT = 200;

interface ItunesResult {
	trackId?: number;
	trackName?: string;
	sellerName?: string;
	artworkUrl60?: string;
	artworkUrl100?: string;
	averageUserRating?: number;
	userRatingCount?: number;
	description?: string;
	releaseDate?: string;
	primaryGenreName?: string;
	genres?: string[];
	formattedPrice?: string;
	trackViewUrl?: string;
	screenshotUrls?: string[];
	languageCodesISO2A?: string[];
	subtitle?: string;
	version?: string;
	currentVersionReleaseDate?: string;
}

interface ItunesPayload {
	results?: ItunesResult[];
}

let jsonpCounter = 0;

/** JSONP fallback: iTunes honors `callback=` on search and lookup. */
function jsonp(url: string): Promise<ItunesPayload> {
	return new Promise((resolve, reject) => {
		const name = `__itunesJsonp${++jsonpCounter}`;
		const script = document.createElement("script");
		const timer = window.setTimeout(() => {
			cleanup();
			reject(new Error("iTunes JSONP timeout"));
		}, JSONP_TIMEOUT_MS);
		function cleanup() {
			window.clearTimeout(timer);
			delete (window as unknown as Record<string, unknown>)[name];
			script.remove();
		}
		(window as unknown as Record<string, unknown>)[name] = (
			payload: ItunesPayload,
		) => {
			cleanup();
			resolve(payload);
		};
		script.onerror = () => {
			cleanup();
			reject(new Error("iTunes JSONP failed"));
		};
		script.src = `${url}&callback=${name}`;
		document.head.appendChild(script);
	});
}

async function itunesGet(url: string): Promise<ItunesPayload> {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
		return (await res.json()) as ItunesPayload;
	} catch {
		return jsonp(url);
	}
}

export interface CheckedApp {
	trackId: string;
	name: string;
	developer: string;
	icon?: string;
	rating?: number;
	ratingsCount?: number;
	description: string;
	genre: string;
	genres: string[];
	screenshots: number;
	released?: string;
	updated?: string;
	price?: string;
	url?: string;
	country: string;
}

export async function lookupApp(
	trackId: string,
	country: string,
): Promise<CheckedApp | null> {
	const data = await itunesGet(
		`${LOOKUP_URL}?id=${encodeURIComponent(trackId)}&country=${encodeURIComponent(country)}`,
	);
	const app = data.results?.[0];
	if (!app?.trackId) return null;
	return {
		country,
		description: app.description ?? "",
		developer: app.sellerName ?? "",
		genre: app.primaryGenreName ?? app.genres?.[0] ?? "",
		genres: app.genres ?? [],
		icon: app.artworkUrl100 ?? app.artworkUrl60,
		name: app.trackName ?? "",
		price: app.formattedPrice,
		rating: app.averageUserRating,
		ratingsCount: app.userRatingCount,
		released: app.releaseDate,
		screenshots: app.screenshotUrls?.length ?? 0,
		trackId: String(app.trackId),
		updated: app.currentVersionReleaseDate,
		url: app.trackViewUrl,
	};
}

function toCompetitor(r: ItunesResult): KeywordCompetitor {
	return {
		developer: r.sellerName ?? "",
		genre: r.primaryGenreName ?? r.genres?.[0],
		icon: r.artworkUrl60 ?? r.artworkUrl100,
		price: r.formattedPrice,
		rating: r.averageUserRating,
		ratingsCount: r.userRatingCount,
		released: r.releaseDate,
		title: r.trackName ?? "",
		trackId: String(r.trackId ?? ""),
		url: r.trackViewUrl,
	};
}

export async function searchCompetitors(
	keyword: string,
	country: string,
	limit = 25,
): Promise<KeywordCompetitor[]> {
	const data = await itunesGet(
		`${SEARCH_URL}?term=${encodeURIComponent(keyword)}&entity=software&country=${encodeURIComponent(country)}&limit=${limit}`,
	);
	return (data.results ?? []).filter((r) => r.trackId).map(toCompetitor);
}

/** Rank of the app in the top 200 results, plus the competitor list reuse. */
export async function searchWithRank(
	keyword: string,
	country: string,
	trackId: string,
): Promise<{ competitors: KeywordCompetitor[]; rank: number | null }> {
	const data = await itunesGet(
		`${SEARCH_URL}?term=${encodeURIComponent(keyword)}&entity=software&country=${encodeURIComponent(country)}&limit=${RANK_SEARCH_LIMIT}`,
	);
	const results = (data.results ?? []).filter((r) => r.trackId);
	const idx = results.findIndex((r) => String(r.trackId) === trackId);
	return {
		competitors: results.slice(0, 25).map(toCompetitor),
		rank: idx >= 0 ? idx + 1 : null,
	};
}
