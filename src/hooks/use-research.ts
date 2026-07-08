"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import {
	EMPTY_HEURISTICS,
	MAX_KEYWORDS_PER_CHECK,
	RESEARCH_LIST_STORAGE_KEY,
	researchAppKey,
	type ResearchListedApp,
} from "@/lib/research";
import type {
	ResearchAnalysis,
	ResearchAppMeta,
	ResearchHeuristics,
	ResearchKeywordPosition,
	ResearchReview,
	ResearchSearchScope,
	ResearchStoreKind,
	ResearchSuggestion,
} from "@/lib/types";

// ============ App list (persisted in localStorage) ============

const EMPTY_APP_LIST: ResearchListedApp[] = [];
const appListListeners = new Set<() => void>();
let appListRawCache: string | null = null;
let appListCache: ResearchListedApp[] = EMPTY_APP_LIST;

function readAppList(): ResearchListedApp[] {
	const raw = localStorage.getItem(RESEARCH_LIST_STORAGE_KEY);
	if (raw !== appListRawCache) {
		appListRawCache = raw;
		try {
			const parsed = JSON.parse(raw ?? "[]");
			appListCache = Array.isArray(parsed)
				? (parsed as ResearchListedApp[])
				: EMPTY_APP_LIST;
		} catch {
			// Corrupted storage — start with an empty list.
			appListCache = EMPTY_APP_LIST;
		}
	}
	return appListCache;
}

function writeAppList(apps: ResearchListedApp[]): void {
	localStorage.setItem(RESEARCH_LIST_STORAGE_KEY, JSON.stringify(apps));
	for (const listener of appListListeners) listener();
}

function subscribeAppList(listener: () => void): () => void {
	appListListeners.add(listener);
	return () => appListListeners.delete(listener);
}

function getServerAppList(): ResearchListedApp[] {
	return EMPTY_APP_LIST;
}

export function useResearchAppList() {
	const apps = useSyncExternalStore(
		subscribeAppList,
		readAppList,
		getServerAppList,
	);

	const add = useCallback((suggestion: ResearchSuggestion) => {
		const current = readAppList();
		if (current.some((a) => researchAppKey(a) === researchAppKey(suggestion))) {
			return;
		}
		writeAppList([...current, { ...suggestion, checked: true }]);
	}, []);

	const remove = useCallback((key: string) => {
		writeAppList(readAppList().filter((a) => researchAppKey(a) !== key));
	}, []);

	const toggle = useCallback((key: string) => {
		writeAppList(
			readAppList().map((a) =>
				researchAppKey(a) === key ? { ...a, checked: !a.checked } : a,
			),
		);
	}, []);

	return { add, apps, remove, toggle };
}

// ============ Typeahead search ============

export function useResearchSearch(
	term: string,
	country: string,
	scope: ResearchSearchScope,
) {
	return useQuery({
		enabled: term.trim().length >= 2,
		queryFn: () => api.research.search({ country, scope, term: term.trim() }),
		queryKey: ["research", "search", term.trim(), country, scope],
		staleTime: 60_000,
	});
}

// ============ Report mutations ============

export function useResearchKeywords() {
	return useMutation({
		mutationFn: (body: {
			appstoreId?: string;
			country: string;
			keywords: string[];
			playstoreId?: string;
		}) =>
			api.research.keywords({
				...body,
				keywords: body.keywords.slice(0, MAX_KEYWORDS_PER_CHECK),
			}),
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Failed to check keywords",
			);
		},
	});
}

export function useResearchMarkets() {
	return useMutation({
		mutationFn: (body: {
			id: string;
			markets?: string[];
			store: ResearchStoreKind;
		}) => api.research.markets(body),
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Failed to compare markets",
			);
		},
	});
}

export function useResearchVisual() {
	const notifyMissingKey = useMissingKeyToast();
	return useMutation({
		mutationFn: (body: { meta: ResearchAppMeta; model?: string }) =>
			api.research.visual(body),
		onError: (err) => {
			if (!notifyMissingKey(err)) {
				toast.error(
					err instanceof Error ? err.message : "Visual analysis failed",
				);
			}
		},
	});
}

export function useResearchCompetitors() {
	return useMutation({
		mutationFn: (body: {
			country: string;
			developer?: string;
			genre?: string;
			id: string;
			store: ResearchStoreKind;
			title: string;
		}) => api.research.competitors(body),
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Failed to find competitors",
			);
		},
	});
}

export function useResearchCompare() {
	const notifyMissingKey = useMissingKeyToast();
	return useMutation({
		mutationFn: (body: {
			competitor: { id: string; store: ResearchStoreKind };
			country: string;
			model?: string;
			ourMeta: ResearchAppMeta;
			ourReviews: ResearchReview[];
		}) => api.research.compare(body),
		onError: (err) => {
			if (!notifyMissingKey(err)) {
				toast.error(err instanceof Error ? err.message : "Comparison failed");
			}
		},
	});
}

// ============ Analysis pipeline (scrape -> AI -> keyword positions) ============

export interface ResearchAppResult {
	analysis?: ResearchAnalysis;
	error?: string;
	heuristics: ResearchHeuristics;
	key: string;
	meta: ResearchAppMeta;
	positions: ResearchKeywordPosition[];
	reviews: ResearchReview[];
}

export interface ResearchRunOptions {
	country: string;
	deep: boolean;
}

function isMissingKeyError(err: unknown): err is ApiError {
	return (
		err instanceof ApiError &&
		err.status === 400 &&
		err.message.includes("OpenRouter")
	);
}

function useMissingKeyToast() {
	const router = useRouter();
	return useCallback(
		(err: unknown): boolean => {
			if (!isMissingKeyError(err)) return false;
			toast.error(err.message, {
				action: { label: "Open Settings", onClick: () => router.push("/settings") },
			});
			return true;
		},
		[router],
	);
}

export function useResearchPipeline() {
	const notifyMissingKey = useMissingKeyToast();
	const [results, setResults] = useState<ResearchAppResult[]>([]);
	const [progress, setProgress] = useState<string | null>(null);
	const [running, setRunning] = useState(false);

	const run = useCallback(
		async (targets: ResearchListedApp[], options: ResearchRunOptions) => {
			if (!targets.length || running) return;
			setRunning(true);
			setResults([]);
			let missingKeyNotified = false;

			try {
				const collected: ResearchAppResult[] = [];
				for (let i = 0; i < targets.length; i++) {
					const target = targets[i];
					const label = `${target.title} (${i + 1}/${targets.length})`;
					const key = researchAppKey(target);

					setProgress(
						`Fetching reviews: ${label}${options.deep ? " — deep mode" : ""}`,
					);
					let result: ResearchAppResult;
					try {
						const scrape = await api.research.scrape({
							country: options.country,
							deep: options.deep,
							id: target.id,
							store: target.store,
						});
						result = {
							heuristics: scrape.heuristics,
							key,
							meta: scrape.meta,
							positions: [],
							reviews: scrape.reviews,
						};
					} catch (err) {
						collected.push({
							error:
								err instanceof Error ? err.message : "Failed to fetch app data",
							heuristics: EMPTY_HEURISTICS,
							key,
							meta: {
								country: options.country,
								developer: target.developer,
								id: target.id,
								store: target.store,
								title: target.title,
								url: target.url,
							},
							positions: [],
							reviews: [],
						});
						setResults([...collected]);
						continue;
					}

					if (result.reviews.length) {
						setProgress(`Running AI analysis: ${label}`);
						try {
							const { analysis } = await api.research.analyze({
								deep: options.deep,
								meta: [result.meta],
								reviews: result.reviews,
							});
							result.analysis = analysis;

							const keywords = analysis.asoKeywords
								.map((k) => k.keyword)
								.slice(0, MAX_KEYWORDS_PER_CHECK);
							if (keywords.length) {
								setProgress(`Checking ASO keyword positions: ${label}`);
								try {
									result.positions = await api.research.keywords({
										appstoreId:
											target.store === "appstore" ? target.id : undefined,
										country: options.country,
										keywords,
										playstoreId:
											target.store === "playstore" ? target.id : undefined,
									});
								} catch {
									// Keyword ranking is optional — keep the report without positions.
								}
							}
						} catch (err) {
							if (isMissingKeyError(err)) {
								if (!missingKeyNotified) {
									missingKeyNotified = true;
									notifyMissingKey(err);
								}
							} else {
								result.error =
									err instanceof Error ? err.message : "AI analysis failed";
							}
						}
					}

					collected.push(result);
					setResults([...collected]);
				}
			} finally {
				setRunning(false);
				setProgress(null);
			}
		},
		[notifyMissingKey, running],
	);

	return { progress, results, run, running };
}
