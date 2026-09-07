/** Test doubles shared by the check-up suites: a listing rich enough to yield more keyword candidates than the all-markets cap, and rivals the scoring engine accepts. */
import type { KeywordCompetitor } from "@/lib/aso-engine/scoring-types";
import type { CheckedApp } from "./itunes";

const PHRASES =
	"habit tracker daily routine streak counter goal planner water reminder sleep log mood diary focus timer budget planner";

export function fakeApp(country: string): CheckedApp {
	return {
		country,
		description: `${PHRASES}. ${PHRASES}. ${PHRASES}.`,
		developer: "Habit Labs",
		genre: "Health & Fitness",
		genres: ["Health & Fitness"],
		icon: "https://is1-ssl.mzstatic.com/image/thumb/icon.png",
		name: "Habitly - Habit Tracker",
		rating: 4.6,
		ratingsCount: 1200,
		screenshots: 6,
		screenshotUrls: ["https://is1-ssl.mzstatic.com/image/thumb/shot1.png"],
		trackId: "123456",
		updated: new Date().toISOString(),
		url: "https://apps.apple.com/us/app/habitly/id123456",
	};
}

export function fakeCompetitors(keyword: string): KeywordCompetitor[] {
	return Array.from({ length: 8 }, (_, i) => ({
		developer: `Dev ${i}`,
		genre: "Health & Fitness",
		icon: "https://is1-ssl.mzstatic.com/image/thumb/rival.png",
		rating: 4.2,
		ratingsCount: 500 * (i + 1),
		released: "2021-03-01T00:00:00Z",
		title: `${keyword} app ${i}`,
		trackId: `rival-${i}`,
		url: `https://apps.apple.com/us/app/rival/id${i}`,
	}));
}
