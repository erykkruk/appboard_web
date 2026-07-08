import { describe, expect, test } from "bun:test";

import type { VersionLocalization } from "@/lib/types";

import {
  exportListingsCsv,
  exportListingsJson,
  generateTemplate,
  parseListingsFile,
} from "./listings-csv";

// --- Fixtures ---

const LOC_EN: VersionLocalization = {
  localizationId: "loc-1",
  language: "en-US",
  title: "My App",
  subtitle: "Best app ever",
  description: "A great app for everyone.",
  keywords: "app,great,best",
  whatsNew: "Bug fixes",
  promotionalText: "Try it now!",
  marketingUrl: "https://example.com",
  supportUrl: "https://example.com/support",
};

const LOC_PL: VersionLocalization = {
  localizationId: "loc-2",
  language: "pl",
  title: "My App",
  subtitle: "The best app",
  description: "Great app.",
  keywords: "app,great",
  whatsNew: "Fixes",
  promotionalText: "Check it out!",
  marketingUrl: "",
  supportUrl: "",
};

const LOC_SPECIAL: VersionLocalization = {
  localizationId: "loc-3",
  language: "de-DE",
  title: 'App "Pro"',
  subtitle: "Best, ever",
  description: "Line one\nLine two",
  keywords: "key1,key2",
};

const HEADER =
  "language,title,subtitle,description,keywords,whatsNew,promotionalText,marketingUrl,supportUrl";

// --- Export CSV ---

describe("exportListingsCsv", () => {
  test("generates header + data rows", () => {
    const csv = exportListingsCsv([LOC_EN]);
    const lines = csv.split("\n");

    expect(lines[0]).toBe(HEADER);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("en-US");
    expect(lines[1]).toContain("My App");
  });

  test("multiple localizations produce multiple rows", () => {
    const csv = exportListingsCsv([LOC_EN, LOC_PL]);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("en-US");
    expect(lines[2]).toContain("pl");
  });

  test("empty array produces header only", () => {
    const csv = exportListingsCsv([]);
    expect(csv).toBe(HEADER);
  });

  test("escapes commas in fields", () => {
    const csv = exportListingsCsv([LOC_SPECIAL]);
    expect(csv).toContain('"Best, ever"');
  });

  test("escapes double quotes in fields", () => {
    const csv = exportListingsCsv([LOC_SPECIAL]);
    expect(csv).toContain('"App ""Pro"""');
  });

  test("escapes newlines in fields", () => {
    const csv = exportListingsCsv([LOC_SPECIAL]);
    expect(csv).toContain('"Line one\nLine two"');
  });

  test("handles undefined optional fields", () => {
    const csv = exportListingsCsv([LOC_SPECIAL]);
    // Re-parse to verify undefined fields became empty strings
    const { rows } = parseListingsFile(csv, "test.csv");
    expect(rows[0].whatsNew).toBe("");
    expect(rows[0].promotionalText).toBe("");
    expect(rows[0].marketingUrl).toBe("");
    expect(rows[0].supportUrl).toBe("");
  });
});

// --- Export JSON ---

describe("exportListingsJson", () => {
  test("generates valid JSON array", () => {
    const json = exportListingsJson([LOC_EN]);
    const parsed = JSON.parse(json);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].language).toBe("en-US");
    expect(parsed[0].title).toBe("My App");
  });

  test("includes all columns", () => {
    const json = exportListingsJson([LOC_EN]);
    const parsed = JSON.parse(json);
    const keys = Object.keys(parsed[0]);

    expect(keys).toContain("language");
    expect(keys).toContain("title");
    expect(keys).toContain("subtitle");
    expect(keys).toContain("description");
    expect(keys).toContain("keywords");
    expect(keys).toContain("whatsNew");
    expect(keys).toContain("promotionalText");
    expect(keys).toContain("marketingUrl");
    expect(keys).toContain("supportUrl");
  });

  test("does not include localizationId", () => {
    const json = exportListingsJson([LOC_EN]);
    const parsed = JSON.parse(json);
    expect(parsed[0].localizationId).toBeUndefined();
  });

  test("undefined fields become empty strings", () => {
    const json = exportListingsJson([LOC_SPECIAL]);
    const parsed = JSON.parse(json);
    expect(parsed[0].whatsNew).toBe("");
    expect(parsed[0].promotionalText).toBe("");
  });
});

// --- Generate Template ---

describe("generateTemplate", () => {
  test("has header and one empty row", () => {
    const tmpl = generateTemplate();
    const lines = tmpl.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(HEADER);
  });

  test("empty row has correct number of commas", () => {
    const tmpl = generateTemplate();
    const lines = tmpl.split("\n");
    const commaCount = (lines[1].match(/,/g) || []).length;

    // 9 columns = 8 commas
    expect(commaCount).toBe(8);
  });
});

// --- Parse CSV ---

describe("parseListingsFile (CSV)", () => {
  test("parses basic CSV", () => {
    const csv = `${HEADER}\nen-US,My App,Best,Description,keys,,,,`;
    const { rows, errors } = parseListingsFile(csv, "test.csv");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].language).toBe("en-US");
    expect(rows[0].title).toBe("My App");
    expect(rows[0].subtitle).toBe("Best");
    expect(rows[0].description).toBe("Description");
  });

  test("parses multiple rows", () => {
    const csv = `${HEADER}\nen-US,App,Sub,Desc,k,,,,\npl,My App,Sub,Desc,k,,,,`;
    const { rows, errors } = parseListingsFile(csv, "test.csv");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].language).toBe("en-US");
    expect(rows[1].language).toBe("pl");
  });

  test("handles quoted fields with commas", () => {
    const csv = `${HEADER}\nen-US,"Title, with comma",Sub,Desc,k,,,,`;
    const { rows } = parseListingsFile(csv, "test.csv");

    expect(rows[0].title).toBe("Title, with comma");
  });

  test("handles escaped double quotes", () => {
    const csv = `${HEADER}\nen-US,"App ""Pro""",Sub,Desc,k,,,,`;
    const { rows } = parseListingsFile(csv, "test.csv");

    expect(rows[0].title).toBe('App "Pro"');
  });

  test("handles newlines inside quoted fields", () => {
    const csv = `${HEADER}\nen-US,Title,Sub,"Line1\nLine2",k,,,,`;
    const { rows } = parseListingsFile(csv, "test.csv");

    expect(rows[0].description).toBe("Line1\nLine2");
  });

  test("handles CRLF line endings", () => {
    const csv = `${HEADER}\r\nen-US,App,Sub,Desc,k,,,,\r\npl,My App,Sub,Desc,k,,,,`;
    const { rows, errors } = parseListingsFile(csv, "test.csv");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
  });

  test("returns error for empty file", () => {
    const { rows, errors } = parseListingsFile("", "test.csv");

    expect(rows).toHaveLength(0);
    expect(errors).toContain("File is empty");
  });

  test("returns error for missing columns", () => {
    const csv = "language,title\nen-US,App";
    const { rows, errors } = parseListingsFile(csv, "test.csv");

    expect(rows).toHaveLength(0);
    expect(errors[0]).toContain("Missing columns");
    expect(errors[0]).toContain("subtitle");
  });

  test("returns error for row missing language", () => {
    const csv = `${HEADER}\n,App,Sub,Desc,k,,,,`;
    const { rows, errors } = parseListingsFile(csv, "test.csv");

    expect(rows).toHaveLength(0);
    expect(errors[0]).toContain("Row 2: missing language");
  });

  test("skips empty lines", () => {
    const csv = `${HEADER}\n\nen-US,App,Sub,Desc,k,,,,\n\n`;
    const { rows, errors } = parseListingsFile(csv, "test.csv");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });
});

// --- Parse JSON ---

describe("parseListingsFile (JSON)", () => {
  test("parses valid JSON array", () => {
    const json = JSON.stringify([
      { language: "en-US", title: "App", subtitle: "Sub", description: "Desc", keywords: "k" },
    ]);
    const { rows, errors } = parseListingsFile(json, "test.json");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].language).toBe("en-US");
    expect(rows[0].title).toBe("App");
  });

  test("handles missing optional fields", () => {
    const json = JSON.stringify([{ language: "en-US" }]);
    const { rows } = parseListingsFile(json, "test.json");

    expect(rows[0].title).toBe("");
    expect(rows[0].whatsNew).toBe("");
    expect(rows[0].marketingUrl).toBe("");
  });

  test("returns error for invalid JSON", () => {
    const { rows, errors } = parseListingsFile("not json{", "test.json");

    expect(rows).toHaveLength(0);
    expect(errors).toContain("Invalid JSON");
  });

  test("returns error for non-array JSON", () => {
    const { rows, errors } = parseListingsFile('{"language":"en"}', "test.json");

    expect(rows).toHaveLength(0);
    expect(errors).toContain("JSON must be an array of objects");
  });

  test("returns error for item missing language", () => {
    const json = JSON.stringify([{ title: "App" }]);
    const { rows, errors } = parseListingsFile(json, "test.json");

    expect(rows).toHaveLength(0);
    expect(errors[0]).toContain("Item 1: missing language");
  });

  test("parses multiple items", () => {
    const json = JSON.stringify([
      { language: "en-US", title: "English" },
      { language: "pl", title: "Polish" },
    ]);
    const { rows } = parseListingsFile(json, "test.json");

    expect(rows).toHaveLength(2);
    expect(rows[1].language).toBe("pl");
  });
});

// --- Roundtrip ---

describe("roundtrip: export then import", () => {
  test("CSV roundtrip preserves data", () => {
    const locs = [LOC_EN, LOC_PL];
    const csv = exportListingsCsv(locs);
    const { rows, errors } = parseListingsFile(csv, "test.csv");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].language).toBe("en-US");
    expect(rows[0].title).toBe("My App");
    expect(rows[0].description).toBe("A great app for everyone.");
    expect(rows[0].whatsNew).toBe("Bug fixes");
    expect(rows[0].marketingUrl).toBe("https://example.com");
    expect(rows[1].language).toBe("pl");
    expect(rows[1].title).toBe("My App");
  });

  test("CSV roundtrip preserves special characters", () => {
    const csv = exportListingsCsv([LOC_SPECIAL]);
    const { rows, errors } = parseListingsFile(csv, "test.csv");

    expect(errors).toHaveLength(0);
    expect(rows[0].title).toBe('App "Pro"');
    expect(rows[0].subtitle).toBe("Best, ever");
    expect(rows[0].description).toBe("Line one\nLine two");
  });

  test("JSON roundtrip preserves data", () => {
    const locs = [LOC_EN, LOC_PL];
    const json = exportListingsJson(locs);
    const { rows, errors } = parseListingsFile(json, "test.json");

    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].language).toBe("en-US");
    expect(rows[0].title).toBe("My App");
    expect(rows[1].language).toBe("pl");
    expect(rows[1].title).toBe("My App");
  });
});

// --- File extension detection ---

describe("parseListingsFile extension detection", () => {
  test("treats .json as JSON", () => {
    const json = JSON.stringify([{ language: "en-US" }]);
    const { rows } = parseListingsFile(json, "listings.json");
    expect(rows).toHaveLength(1);
  });

  test("treats .csv as CSV", () => {
    const csv = `${HEADER}\nen-US,App,Sub,Desc,k,,,,`;
    const { rows } = parseListingsFile(csv, "listings.csv");
    expect(rows).toHaveLength(1);
  });

  test("treats unknown extension as CSV", () => {
    const csv = `${HEADER}\nen-US,App,Sub,Desc,k,,,,`;
    const { rows } = parseListingsFile(csv, "listings.txt");
    expect(rows).toHaveLength(1);
  });
});
