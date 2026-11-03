import { KEYWORD_COUNTRIES } from "@/lib/keyword-research";

/**
 * Every App Store storefront (ISO 3166-1 alpha-2, lowercase). Rank tracking
 * accepts any of them; the research tools only sample the first 30 in
 * KEYWORD_COUNTRIES, which is why the tracker cannot reuse that list.
 */
export const TRACKING_MARKETS: readonly string[] = [
	"ae", "ag", "ai", "al", "am", "ao", "ar", "at", "au", "az", "ba", "bb",
	"bd", "be", "bf", "bg", "bh", "bj", "bm", "bn", "bo", "br", "bs", "bt",
	"bw", "by", "bz", "ca", "cd", "cg", "ch", "ci", "cl", "cm", "cn", "co",
	"cr", "cv", "cy", "cz", "de", "dk", "dm", "do", "dz", "ec", "ee", "eg",
	"es", "fi", "fj", "fm", "fr", "ga", "gb", "gd", "ge", "gh", "gm", "gr",
	"gt", "gw", "gy", "hk", "hn", "hr", "hu", "id", "ie", "il", "in", "iq",
	"is", "it", "jm", "jo", "jp", "ke", "kg", "kh", "kn", "kr", "kw", "ky",
	"kz", "la", "lb", "lc", "lk", "lr", "lt", "lu", "lv", "ly", "ma", "md",
	"me", "mg", "mk", "ml", "mm", "mn", "mo", "mr", "ms", "mt", "mu", "mv",
	"mw", "mx", "my", "mz", "na", "ne", "ng", "ni", "nl", "no", "np", "nr",
	"nz", "om", "pa", "pe", "pg", "ph", "pk", "pl", "pt", "pw", "py", "qa",
	"ro", "rs", "ru", "rw", "sa", "sb", "sc", "se", "sg", "si", "sk", "sl",
	"sn", "sr", "st", "sv", "sz", "tc", "td", "th", "tj", "tm", "tn", "to",
	"tr", "tt", "tw", "tz", "ua", "ug", "us", "uy", "uz", "vc", "ve", "vg",
	"vn", "vu", "xk", "ye", "za", "zm", "zw",
];

const REGION_NAMES: Intl.DisplayNames | null = (() => {
	try {
		return new Intl.DisplayNames(["en"], { type: "region" });
	} catch {
		return null;
	}
})();

/** "pl" -> "Poland"; unknown codes fall back to the upper-case code. */
export function marketLabel(code: string): string {
	const known = KEYWORD_COUNTRIES.find((c) => c.code === code)?.label;
	if (known) return known;
	try {
		return REGION_NAMES?.of(code.toUpperCase()) ?? code.toUpperCase();
	} catch {
		return code.toUpperCase();
	}
}

/**
 * Options for a market picker: markets already in use first (so the ones you
 * work with are at the top), then every other storefront by name.
 */
export function marketOptions(inUse: readonly string[]): string[] {
	const used = [...new Set(inUse.map((c) => c.toLowerCase()))].sort();
	const rest = TRACKING_MARKETS.filter((c) => !used.includes(c)).sort((a, b) =>
		marketLabel(a).localeCompare(marketLabel(b)),
	);
	return [...used, ...rest];
}
