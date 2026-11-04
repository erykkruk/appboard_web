import type {
	ByVersionCell,
	ByVersionColumn,
	ListingTextField,
} from "@/lib/types";

/** Columns shown before "Show all versions"; older versions sit behind it. */
export const VERSIONS_SHOWN_BY_DEFAULT = 6;

export const LISTING_TEXT_FIELDS: readonly ListingTextField[] = [
	"title",
	"subtitle",
	"keywords",
];

const IOS_PLATFORM = "ios";

export function versionLabel(column: ByVersionColumn): string {
	return column.versionString ?? "Unknown version";
}

/** The second line is a subtitle on the App Store, a short description on Play. */
export function listingFieldLabel(
	field: ListingTextField,
	platform?: string | null,
): string {
	if (field === "title") return "Title";
	if (field === "keywords") return "Keyword field";
	return platform === IOS_PLATFORM ? "Subtitle" : "Short description";
}

export function formatVersionDay(iso: string | null): string {
	if (!iso) return "-";
	return new Date(iso).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

/** Newest first, capped unless every version is wanted. */
export function visibleVersions(
	versions: ByVersionColumn[],
	showAll: boolean,
): ByVersionColumn[] {
	return showAll ? versions : versions.slice(0, VERSIONS_SHOWN_BY_DEFAULT);
}

export type VersionEntry = "entered" | "dropped";

/**
 * Coming into or falling out of the scanned results between two versions.
 * A number cannot say it: "not in the top 50" is not a position.
 */
export function versionEntry(
	previous: ByVersionCell | undefined,
	current: ByVersionCell | undefined,
): VersionEntry | null {
	if (!previous || !current) return null;
	if (previous.last === null && current.last !== null) return "entered";
	if (previous.last !== null && current.last === null) return "dropped";
	return null;
}

/**
 * For each version key, the keyword's cell under the closest OLDER version it
 * was measured in (the same pairing the server's delta uses).
 */
export function previousCells(
	cells: Record<string, ByVersionCell>,
	versionsNewestFirst: ByVersionColumn[],
): Record<string, ByVersionCell | undefined> {
	const previous: Record<string, ByVersionCell | undefined> = {};
	let older: ByVersionCell | undefined;
	for (const column of [...versionsNewestFirst].reverse()) {
		const cell = cells[column.key];
		if (!cell) continue;
		previous[column.key] = older;
		older = cell;
	}
	return previous;
}
