import type { AsoProfileInput } from "@/lib/types";

const STRING_FIELDS = [
	"category",
	"differentiator",
	"mainBenefit",
	"oneLiner",
	"problem",
	"targetAudience",
	"userLanguage",
	"competitiveAdvantage",
	"positioning",
	"brandVoiceExample",
	"tone",
	"downloadCount",
	"price",
	"pricingModel",
] as const;

const ARRAY_FIELDS = [
	"keyFeatures",
	"painPoints",
	"competitors",
	"wordsToAvoid",
	"wordsToInclude",
	"awards",
	"pressQuotes",
	"testimonials",
	"freeFeatures",
	"premiumFeatures",
	"excludeKeywords",
	"longTailKeywords",
	"mustIncludeKeywords",
] as const;

const ALL_FIELDS = [...STRING_FIELDS, ...ARRAY_FIELDS] as const;
type ProfileField = (typeof ALL_FIELDS)[number];

const ARRAY_SEPARATOR = " | ";

// --- CSV generation (RFC 4180) ---

function escapeCsvField(value: string): string {
	if (
		value.includes(",") ||
		value.includes('"') ||
		value.includes("\n") ||
		value.includes("\r")
	) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function fieldValue(profile: AsoProfileInput, field: ProfileField): string {
	const val = profile[field];
	if (val === null || val === undefined) return "";
	if (Array.isArray(val)) return val.join(ARRAY_SEPARATOR);
	return String(val);
}

export function exportProfileCsv(profile: AsoProfileInput): string {
	const header = ALL_FIELDS.join(",");
	const row = ALL_FIELDS.map((f) =>
		escapeCsvField(fieldValue(profile, f)),
	).join(",");
	return `${header}\n${row}`;
}

export function exportProfileJson(profile: AsoProfileInput): string {
	const data: Record<string, string | string[] | null> = {};
	for (const field of STRING_FIELDS) {
		data[field] = profile[field] as string | null;
	}
	for (const field of ARRAY_FIELDS) {
		data[field] = profile[field] as string[] | null;
	}
	return JSON.stringify(data, null, 2);
}

export function generateProfileTemplate(): string {
	const header = ALL_FIELDS.join(",");
	const empty = ALL_FIELDS.map(() => "").join(",");
	return `${header}\n${empty}`;
}

// --- CSV parsing (RFC 4180) ---

function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let i = 0;
	let field = "";
	let inQuotes = false;

	while (i < line.length) {
		const ch = line[i];

		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					field += '"';
					i += 2;
				} else {
					inQuotes = false;
					i++;
				}
			} else {
				field += ch;
				i++;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
				i++;
			} else if (ch === ",") {
				fields.push(field);
				field = "";
				i++;
			} else {
				field += ch;
				i++;
			}
		}
	}

	fields.push(field);
	return fields;
}

function splitCsvRows(text: string): string[] {
	const rows: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];

		if (ch === '"') {
			inQuotes = !inQuotes;
			current += ch;
		} else if (!inQuotes && (ch === "\n" || ch === "\r")) {
			if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
				i++;
			}
			if (current.trim()) {
				rows.push(current);
			}
			current = "";
		} else {
			current += ch;
		}
	}

	if (current.trim()) {
		rows.push(current);
	}

	return rows;
}

const ARRAY_FIELDS_SET = new Set<string>(ARRAY_FIELDS);

function parseValue(
	field: string,
	raw: string,
): string | string[] | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	if (ARRAY_FIELDS_SET.has(field)) {
		return trimmed.split(/\s*\|\s*/).filter(Boolean);
	}
	return trimmed;
}

export interface ProfileParseResult {
	profile: Partial<AsoProfileInput> | null;
	errors: string[];
}

function parseCsv(text: string): ProfileParseResult {
	const lines = splitCsvRows(text);
	if (lines.length === 0) {
		return { profile: null, errors: ["File is empty"] };
	}

	const headerFields = parseCsvLine(lines[0]).map((h) => h.trim());
	const allFieldsSet = new Set<string>(ALL_FIELDS);

	const recognized = headerFields.filter((h) => allFieldsSet.has(h));
	if (recognized.length === 0) {
		return {
			profile: null,
			errors: ["No recognized columns found. Expected: " + ALL_FIELDS.slice(0, 5).join(", ") + "..."],
		};
	}

	if (lines.length < 2) {
		return { profile: null, errors: ["No data rows found"] };
	}

	const colIndex = new Map<string, number>();
	for (const field of recognized) {
		colIndex.set(field, headerFields.indexOf(field));
	}

	const fields = parseCsvLine(lines[1]);
	const profile: Record<string, string | string[] | null> = {};

	for (const [field, idx] of colIndex.entries()) {
		const raw = fields[idx] ?? "";
		profile[field] = parseValue(field, raw);
	}

	return { profile: profile as Partial<AsoProfileInput>, errors: [] };
}

function parseJson(text: string): ProfileParseResult {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return { profile: null, errors: ["Invalid JSON"] };
	}

	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		return { profile: null, errors: ["JSON must be an object"] };
	}

	const obj = data as Record<string, unknown>;
	const profile: Record<string, string | string[] | null> = {};

	for (const field of STRING_FIELDS) {
		const val = obj[field];
		if (val === null || val === undefined) {
			profile[field] = null;
		} else {
			profile[field] = String(val);
		}
	}

	for (const field of ARRAY_FIELDS) {
		const val = obj[field];
		if (val === null || val === undefined) {
			profile[field] = null;
		} else if (Array.isArray(val)) {
			profile[field] = val.map(String);
		} else {
			profile[field] = String(val)
				.split(/\s*\|\s*/)
				.filter(Boolean);
		}
	}

	return { profile: profile as Partial<AsoProfileInput>, errors: [] };
}

export function parseProfileFile(
	content: string,
	fileName: string,
): ProfileParseResult {
	const ext = fileName.split(".").pop()?.toLowerCase();

	if (ext === "json") {
		return parseJson(content);
	}

	return parseCsv(content);
}
