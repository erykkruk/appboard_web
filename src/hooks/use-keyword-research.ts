"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import {
	KEYWORD_HISTORY_LIMIT,
	KEYWORD_HISTORY_STORAGE_KEY,
	type KeywordHistoryEntry,
	KEYWORDS_PER_SCORING_CALL,
	MAX_KEYWORDS_PER_SCORING,
} from "@/lib/keyword-research";
import type { KeywordScore } from "@/lib/types";

// ============ Keyword scoring (batched) ============

export interface KeywordScoresInput {
	appstoreId?: string;
	country: string;
	keywords: string[];
}

/**
 * Score up to 20 keywords: the backend caps a call at 10, so longer lists run
 * as sequential batches and the results are concatenated in input order.
 */
export function useKeywordScores() {
	return useMutation({
		mutationFn: async (input: KeywordScoresInput): Promise<KeywordScore[]> => {
			const keywords = input.keywords.slice(0, MAX_KEYWORDS_PER_SCORING);
			const scores: KeywordScore[] = [];
			for (
				let start = 0;
				start < keywords.length;
				start += KEYWORDS_PER_SCORING_CALL
			) {
				const batch = keywords.slice(start, start + KEYWORDS_PER_SCORING_CALL);
				const result = await api.research.keywordScores({
					country: input.country,
					keywords: batch,
					...(input.appstoreId ? { appstoreId: input.appstoreId } : {}),
				});
				scores.push(...result);
			}
			return scores;
		},
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Keyword scoring failed",
			);
		},
	});
}

// ============ Country Opportunity Finder ============

export interface CountryOpportunityResult {
	country: string;
	score: KeywordScore;
}

export interface CountryOpportunityProgress {
	current: string;
	done: number;
	total: number;
}

/**
 * Score one keyword across many storefronts, one sequential call per country
 * (the backend paces iTunes calls per request). Results come back ranked by
 * opportunity, best country first.
 */
export function useCountryOpportunity() {
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<CountryOpportunityProgress | null>(
		null,
	);
	const [results, setResults] = useState<CountryOpportunityResult[]>([]);
	const cancelled = useRef(false);

	const run = useCallback(
		async (keyword: string, countries: string[], appstoreId?: string) => {
			cancelled.current = false;
			setRunning(true);
			setResults([]);
			const collected: CountryOpportunityResult[] = [];
			try {
				for (let i = 0; i < countries.length; i++) {
					if (cancelled.current) break;
					const country = countries[i];
					setProgress({ current: country, done: i, total: countries.length });
					try {
						const [score] = await api.research.keywordScores({
							country,
							keywords: [keyword],
							...(appstoreId ? { appstoreId } : {}),
						});
						if (score) collected.push({ country, score });
					} catch {
						// One storefront failing must not kill the whole scan.
					}
					collected.sort(
						(a, b) => b.score.opportunity - a.score.opportunity,
					);
					setResults([...collected]);
				}
				if (!cancelled.current && collected.length === 0) {
					toast.error("No country returned data for this keyword");
				}
			} finally {
				setProgress(null);
				setRunning(false);
			}
		},
		[],
	);

	const cancel = useCallback(() => {
		cancelled.current = true;
	}, []);

	return { cancel, progress, results, run, running };
}

// ============ Search history (localStorage) ============

const EMPTY_HISTORY: KeywordHistoryEntry[] = [];
const historyListeners = new Set<() => void>();
let historyRawCache: string | null = null;
let historyCache: KeywordHistoryEntry[] = EMPTY_HISTORY;

function readHistory(): KeywordHistoryEntry[] {
	const raw = localStorage.getItem(KEYWORD_HISTORY_STORAGE_KEY);
	if (raw !== historyRawCache) {
		historyRawCache = raw;
		try {
			const parsed = JSON.parse(raw ?? "[]");
			historyCache = Array.isArray(parsed)
				? (parsed as KeywordHistoryEntry[])
				: EMPTY_HISTORY;
		} catch {
			// Corrupted storage - start fresh.
			historyCache = EMPTY_HISTORY;
		}
	}
	return historyCache;
}

function writeHistory(entries: KeywordHistoryEntry[]): void {
	const raw = JSON.stringify(entries);
	try {
		localStorage.setItem(KEYWORD_HISTORY_STORAGE_KEY, raw);
	} catch {
		// Storage full - drop the oldest half and retry once.
		try {
			localStorage.setItem(
				KEYWORD_HISTORY_STORAGE_KEY,
				JSON.stringify(entries.slice(0, Math.ceil(entries.length / 2))),
			);
		} catch {
			return;
		}
	}
	historyRawCache = null;
	for (const listener of historyListeners) listener();
}

function subscribeHistory(listener: () => void): () => void {
	historyListeners.add(listener);
	return () => historyListeners.delete(listener);
}

function getServerHistory(): KeywordHistoryEntry[] {
	return EMPTY_HISTORY;
}

/** Past keyword searches, kept per browser (newest first, capped). */
export function useKeywordHistory() {
	const entries = useSyncExternalStore(
		subscribeHistory,
		readHistory,
		getServerHistory,
	);

	const add = useCallback(
		(entry: Omit<KeywordHistoryEntry, "id" | "date">) => {
			const full: KeywordHistoryEntry = {
				...entry,
				date: new Date().toISOString(),
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			};
			writeHistory([full, ...readHistory()].slice(0, KEYWORD_HISTORY_LIMIT));
		},
		[],
	);

	const remove = useCallback((id: string) => {
		writeHistory(readHistory().filter((e) => e.id !== id));
	}, []);

	const clear = useCallback(() => {
		writeHistory([]);
	}, []);

	return { add, clear, entries, remove };
}
