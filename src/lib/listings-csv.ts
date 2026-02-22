import type { VersionLocalization } from "@/lib/types";

const CSV_COLUMNS = [
  "language",
  "title",
  "subtitle",
  "description",
  "keywords",
  "whatsNew",
  "promotionalText",
  "marketingUrl",
  "supportUrl",
] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];

export interface ListingRow {
  language: string;
  title: string;
  subtitle: string;
  description: string;
  keywords: string;
  whatsNew: string;
  promotionalText: string;
  marketingUrl: string;
  supportUrl: string;
}

export interface ParseResult {
  rows: ListingRow[];
  errors: string[];
}

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

function locToRow(loc: VersionLocalization): string {
  return CSV_COLUMNS.map((col) => escapeCsvField(String(loc[col] ?? ""))).join(
    ",",
  );
}

export function exportListingsCsv(localizations: VersionLocalization[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = localizations.map(locToRow);
  return [header, ...rows].join("\n");
}

export function exportListingsJson(
  localizations: VersionLocalization[],
): string {
  const data = localizations.map((loc) => {
    const row: Record<string, string> = {};
    for (const col of CSV_COLUMNS) {
      row[col] = String(loc[col] ?? "");
    }
    return row;
  });
  return JSON.stringify(data, null, 2);
}

export function generateTemplate(): string {
  const header = CSV_COLUMNS.join(",");
  const empty = CSV_COLUMNS.map(() => "").join(",");
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

function parseCsv(text: string): ParseResult {
  const lines = splitCsvRows(text);
  if (lines.length === 0) {
    return { rows: [], errors: ["File is empty"] };
  }

  const headerFields = parseCsvLine(lines[0]).map((h) => h.trim());

  // Validate header
  const missingCols = CSV_COLUMNS.filter(
    (col) => !headerFields.includes(col),
  );
  if (missingCols.length > 0) {
    return {
      rows: [],
      errors: [`Missing columns: ${missingCols.join(", ")}`],
    };
  }

  const colIndex = new Map<CsvColumn, number>();
  for (const col of CSV_COLUMNS) {
    colIndex.set(col, headerFields.indexOf(col));
  }

  const rows: ListingRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const lang = fields[colIndex.get("language")!]?.trim();

    if (!lang) {
      errors.push(`Row ${i + 1}: missing language`);
      continue;
    }

    rows.push({
      language: lang,
      title: fields[colIndex.get("title")!] ?? "",
      subtitle: fields[colIndex.get("subtitle")!] ?? "",
      description: fields[colIndex.get("description")!] ?? "",
      keywords: fields[colIndex.get("keywords")!] ?? "",
      whatsNew: fields[colIndex.get("whatsNew")!] ?? "",
      promotionalText: fields[colIndex.get("promotionalText")!] ?? "",
      marketingUrl: fields[colIndex.get("marketingUrl")!] ?? "",
      supportUrl: fields[colIndex.get("supportUrl")!] ?? "",
    });
  }

  return { rows, errors };
}

function parseJson(text: string): ParseResult {
  const errors: string[] = [];

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { rows: [], errors: ["Invalid JSON"] };
  }

  if (!Array.isArray(data)) {
    return { rows: [], errors: ["JSON must be an array of objects"] };
  }

  const rows: ListingRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i] as Record<string, unknown>;
    const lang = String(item.language ?? "").trim();

    if (!lang) {
      errors.push(`Item ${i + 1}: missing language`);
      continue;
    }

    rows.push({
      language: lang,
      title: String(item.title ?? ""),
      subtitle: String(item.subtitle ?? ""),
      description: String(item.description ?? ""),
      keywords: String(item.keywords ?? ""),
      whatsNew: String(item.whatsNew ?? ""),
      promotionalText: String(item.promotionalText ?? ""),
      marketingUrl: String(item.marketingUrl ?? ""),
      supportUrl: String(item.supportUrl ?? ""),
    });
  }

  return { rows, errors };
}

export function parseListingsFile(
  content: string,
  fileName: string,
): ParseResult {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    return parseJson(content);
  }

  return parseCsv(content);
}

export function downloadFile(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
