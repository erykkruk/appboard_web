import { describe, expect, test } from "bun:test";

import { computeDiff, lineDiff, tokenize, wordDiff } from "./diff";

describe("tokenize", () => {
	test("splits text preserving whitespace chunks", () => {
		expect(tokenize("hello world")).toEqual(["hello", " ", "world"]);
	});

	test("handles multiple whitespace", () => {
		expect(tokenize("foo   bar")).toEqual(["foo", "   ", "bar"]);
	});

	test("returns empty array for empty string", () => {
		expect(tokenize("")).toEqual([]);
	});

	test("handles leading and trailing whitespace", () => {
		expect(tokenize(" hi ")).toEqual([" ", "hi", " "]);
	});
});

describe("wordDiff", () => {
	test("returns single equal segment for identical strings", () => {
		const segments = wordDiff("hello world", "hello world");
		expect(segments).toEqual([{ type: "equal", value: "hello world" }]);
	});

	test("returns empty array for two empty strings", () => {
		expect(wordDiff("", "")).toEqual([]);
	});

	test("returns all added for empty old string", () => {
		const segments = wordDiff("", "hello");
		expect(segments).toEqual([{ type: "added", value: "hello" }]);
	});

	test("returns all removed for empty new string", () => {
		const segments = wordDiff("hello", "");
		expect(segments).toEqual([{ type: "removed", value: "hello" }]);
	});

	test("detects word replacement", () => {
		const segments = wordDiff("hello world", "hello there");
		// reconstructed old text = equal + removed joined
		const oldReconstructed = segments
			.filter((s) => s.type !== "added")
			.map((s) => s.value)
			.join("");
		const newReconstructed = segments
			.filter((s) => s.type !== "removed")
			.map((s) => s.value)
			.join("");
		expect(oldReconstructed).toBe("hello world");
		expect(newReconstructed).toBe("hello there");
		// must contain an equal segment for "hello"
		expect(segments.some((s) => s.type === "equal" && s.value.includes("hello"))).toBe(
			true,
		);
		// must contain a removed "world" and added "there"
		expect(segments.some((s) => s.type === "removed" && s.value === "world")).toBe(
			true,
		);
		expect(segments.some((s) => s.type === "added" && s.value === "there")).toBe(true);
	});

	test("merges consecutive same-type segments", () => {
		const segments = wordDiff("a b c", "x y z");
		// There should be no two consecutive segments of the same type
		for (let i = 1; i < segments.length; i++) {
			expect(segments[i].type).not.toBe(segments[i - 1].type);
		}
	});
});

describe("lineDiff", () => {
	test("handles multi-line with one changed line", () => {
		const oldText = "line one\nline two\nline three";
		const newText = "line one\nline changed\nline three";
		const segments = lineDiff(oldText, newText);

		const oldReconstructed = segments
			.filter((s) => s.type !== "added")
			.map((s) => s.value)
			.join("\n");
		const newReconstructed = segments
			.filter((s) => s.type !== "removed")
			.map((s) => s.value)
			.join("\n");

		expect(oldReconstructed).toBe(oldText);
		expect(newReconstructed).toBe(newText);
		expect(segments.some((s) => s.type === "removed" && s.value === "line two")).toBe(
			true,
		);
		expect(
			segments.some((s) => s.type === "added" && s.value === "line changed"),
		).toBe(true);
	});

	test("identical multi-line text yields single equal segment", () => {
		const text = "a\nb\nc";
		expect(lineDiff(text, text)).toEqual([{ type: "equal", value: text }]);
	});
});

describe("computeDiff", () => {
	test("uses word mode for short single-line texts", () => {
		const result = computeDiff("hello world", "hello there");
		expect(result.mode).toBe("word");
	});

	test("uses line mode for long texts > 200 chars", () => {
		const longText = "word ".repeat(60); // ~300 chars
		const result = computeDiff(longText, `${longText}extra`);
		expect(result.mode).toBe("line");
	});

	test("uses line mode when either text contains newlines", () => {
		const resultOld = computeDiff("line1\nline2", "line1 line2");
		const resultNew = computeDiff("line1 line2", "line1\nline2");
		expect(resultOld.mode).toBe("line");
		expect(resultNew.mode).toBe("line");
	});

	test("word mode remains for small changes without newlines", () => {
		const result = computeDiff("foo bar", "foo baz");
		expect(result.mode).toBe("word");
		expect(result.segments.length).toBeGreaterThan(0);
	});
});

describe("MAX_DIFF_TOKENS fallback", () => {
	test("falls back to degenerate diff when wordDiff exceeds token limit", () => {
		// 6000 tokens > MAX_DIFF_TOKENS (5000)
		const huge = Array.from({ length: 6000 }, (_, i) => `w${i}`).join(" ");
		const segments = wordDiff(huge, `${huge} extra`);

		// Degenerate fallback: removed + added, no equal segments
		expect(segments.length).toBeLessThanOrEqual(2);
		expect(segments.some((s) => s.type === "removed")).toBe(true);
		expect(segments.some((s) => s.type === "added")).toBe(true);
		expect(segments.some((s) => s.type === "equal")).toBe(false);
	});

	test("falls back to degenerate diff when lineDiff exceeds token limit", () => {
		const hugeLines = Array.from({ length: 6000 }, (_, i) => `line${i}`).join(
			"\n",
		);
		const segments = lineDiff(hugeLines, `${hugeLines}\nextra`);

		expect(segments.length).toBeLessThanOrEqual(2);
		expect(segments.some((s) => s.type === "removed")).toBe(true);
		expect(segments.some((s) => s.type === "added")).toBe(true);
	});

	test("normal-sized input still uses real LCS (has equal segments)", () => {
		const segments = wordDiff(
			"the quick brown fox",
			"the quick brown dog",
		);
		expect(segments.some((s) => s.type === "equal")).toBe(true);
	});
});

describe("segment merging", () => {
	test("no consecutive same-type segments in wordDiff output", () => {
		const segments = wordDiff(
			"the quick brown fox jumps over",
			"the slow brown dog jumps under",
		);
		for (let i = 1; i < segments.length; i++) {
			expect(segments[i].type).not.toBe(segments[i - 1].type);
		}
	});

	test("no consecutive same-type segments in lineDiff output", () => {
		const segments = lineDiff("a\nb\nc\nd", "a\nX\nc\nY");
		for (let i = 1; i < segments.length; i++) {
			expect(segments[i].type).not.toBe(segments[i - 1].type);
		}
	});
});
