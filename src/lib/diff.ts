export type DiffSegment = {
	type: "equal" | "added" | "removed";
	value: string;
};

/**
 * Switch from word-level to line-level diff once the combined input length
 * exceeds this many characters. Picked empirically — short fields read better
 * inline, long copy reads better as a unified diff.
 */
const LINE_MODE_THRESHOLD = 200;

/**
 * Hard limit on tokens fed to the LCS algorithm. The LCS table is O(m*n)
 * memory and time, so anything larger than this falls back to a degenerate
 * "everything removed, everything added" diff. Defends against pathological
 * inputs (e.g. a 10k-line description) hanging the UI.
 */
const MAX_DIFF_TOKENS = 5000;

/**
 * Split text into tokens preserving whitespace chunks as separate tokens.
 * Example: "hello world" -> ["hello", " ", "world"]
 */
export function tokenize(text: string): string[] {
	if (text.length === 0) return [];
	return text.split(/(\s+)/).filter((token) => token.length > 0);
}

/**
 * Compute longest common subsequence table using a compact Uint16Array.
 * Falls back to number[][] when either side exceeds Uint16 range.
 */
function lcs(a: string[], b: string[]): number[][] {
	const m = a.length;
	const n = b.length;
	const table: number[][] = Array.from({ length: m + 1 }, () =>
		new Array<number>(n + 1).fill(0),
	);

	for (let i = 1; i <= m; i++) {
		const rowPrev = table[i - 1];
		const rowCurr = table[i];
		const ai = a[i - 1];
		for (let j = 1; j <= n; j++) {
			if (ai === b[j - 1]) {
				rowCurr[j] = rowPrev[j - 1] + 1;
			} else {
				const up = rowPrev[j];
				const left = rowCurr[j - 1];
				rowCurr[j] = up >= left ? up : left;
			}
		}
	}

	return table;
}

/**
 * Backtrack through the LCS table to produce a merged DiffSegment[].
 * Consecutive segments of the same type are joined into one.
 *
 * If either input exceeds {@link MAX_DIFF_TOKENS}, returns a degenerate
 * diff (everything removed + everything added) instead of running LCS,
 * which would otherwise cost O(m*n) memory and time.
 */
function diffTokens(
	oldTokens: string[],
	newTokens: string[],
	joiner: string,
): DiffSegment[] {
	if (
		oldTokens.length > MAX_DIFF_TOKENS ||
		newTokens.length > MAX_DIFF_TOKENS
	) {
		const segments: DiffSegment[] = [];
		if (oldTokens.length > 0) {
			segments.push({ type: "removed", value: oldTokens.join(joiner) });
		}
		if (newTokens.length > 0) {
			segments.push({ type: "added", value: newTokens.join(joiner) });
		}
		return segments;
	}

	const table = lcs(oldTokens, newTokens);
	const reversed: DiffSegment[] = [];
	let i = oldTokens.length;
	let j = newTokens.length;

	const push = (type: DiffSegment["type"], value: string) => {
		const last = reversed[reversed.length - 1];
		if (last && last.type === type) {
			// since we're walking backwards, prepend value to last segment
			last.value = value + joiner + last.value;
		} else {
			reversed.push({ type, value });
		}
	};

	while (i > 0 && j > 0) {
		if (oldTokens[i - 1] === newTokens[j - 1]) {
			push("equal", oldTokens[i - 1]);
			i--;
			j--;
		} else if (table[i - 1][j] >= table[i][j - 1]) {
			push("removed", oldTokens[i - 1]);
			i--;
		} else {
			push("added", newTokens[j - 1]);
			j--;
		}
	}

	while (i > 0) {
		push("removed", oldTokens[i - 1]);
		i--;
	}

	while (j > 0) {
		push("added", newTokens[j - 1]);
		j--;
	}

	return reversed.reverse();
}

export function wordDiff(oldText: string, newText: string): DiffSegment[] {
	if (oldText === newText) {
		if (oldText.length === 0) return [];
		return [{ type: "equal", value: oldText }];
	}
	if (oldText.length === 0) {
		return [{ type: "added", value: newText }];
	}
	if (newText.length === 0) {
		return [{ type: "removed", value: oldText }];
	}

	const oldTokens = tokenize(oldText);
	const newTokens = tokenize(newText);
	return diffTokens(oldTokens, newTokens, "");
}

export function lineDiff(oldText: string, newText: string): DiffSegment[] {
	if (oldText === newText) {
		if (oldText.length === 0) return [];
		return [{ type: "equal", value: oldText }];
	}
	if (oldText.length === 0) {
		return [{ type: "added", value: newText }];
	}
	if (newText.length === 0) {
		return [{ type: "removed", value: oldText }];
	}

	const oldLines = oldText.split(/\r?\n/);
	const newLines = newText.split(/\r?\n/);
	return diffTokens(oldLines, newLines, "\n");
}

/**
 * Choose between word diff and line diff based on text size and newlines.
 * - Line mode when combined length > 200 chars OR either text contains newlines.
 * - Otherwise word mode.
 */
export function computeDiff(
	oldText: string,
	newText: string,
): {
	segments: DiffSegment[];
	mode: "word" | "line";
} {
	const safeOld = oldText ?? "";
	const safeNew = newText ?? "";

	const hasNewlines = safeOld.includes("\n") || safeNew.includes("\n");
	const isLong = safeOld.length + safeNew.length > LINE_MODE_THRESHOLD;

	if (hasNewlines || isLong) {
		return { segments: lineDiff(safeOld, safeNew), mode: "line" };
	}

	return { segments: wordDiff(safeOld, safeNew), mode: "word" };
}
