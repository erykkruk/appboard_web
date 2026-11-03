"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { AutoResearchFrequency, RankCheckRun } from "@/lib/types";

const trackingKey = (appId: string) => ["apps", appId, "tracking"] as const;
const historyKey = (appId: string) =>
	["apps", appId, "tracking", "history"] as const;

export function useTracking(appId: string) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.tracking.get(appId),
		queryKey: trackingKey(appId),
	});
}

/**
 * Dashboard summary: the backend auto-imports ASO-profile keywords and starts
 * a first rank check in the background (`rankCheck` in the response).
 */
export function useTrackingSummary(appId: string) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.tracking.summary(appId),
		queryKey: [...trackingKey(appId), "summary"],
		retry: false,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Everything the tracker view shows for one market. One call on purpose: the
 * position, the score and our own metadata have to line up per keyword, and
 * three responses cannot be joined on the client without guessing.
 */
export function useTrackingBoard(
	appId: string,
	country?: string,
	options: { enabled?: boolean } = {},
) {
	return useQuery({
		enabled: !!appId && (options.enabled ?? true),
		queryFn: () => api.tracking.board(appId, { country }),
		queryKey: [...trackingKey(appId), "board", country ?? ""],
	});
}

/** Keyword ideas for one market; read from stored scores, never scored here. */
export function useKeywordSuggestions(appId: string, country: string | null) {
	return useQuery({
		enabled: !!appId && !!country,
		queryFn: () => api.tracking.suggestions(appId, country ?? ""),
		queryKey: [...trackingKey(appId), "suggestions", country ?? ""],
	});
}

export function useRankHistory(
	appId: string,
	filters?: { country?: string; keyword?: string },
) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.tracking.history(appId, filters),
		queryKey: [...historyKey(appId), filters?.country ?? "", filters?.keyword ?? ""],
	});
}

export function useUpdateTrackingConfig(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: {
			autoResearchEnabled?: boolean;
			autoResearchFrequency?: AutoResearchFrequency;
			emailRankDigest?: boolean;
			notifyEmail?: string | null;
			rankTrackingEnabled?: boolean;
		}) => api.tracking.updateConfig(appId, body),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to update settings"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trackingKey(appId) });
		},
	});
}

export function useAddKeywords(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: { country: string; keywords: string[] }) =>
			api.tracking.addKeywords(appId, body),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to add keywords"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trackingKey(appId) });
		},
	});
}

export function useRemoveKeyword(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (keywordId: string) =>
			api.tracking.removeKeyword(appId, keywordId),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to remove keyword"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: trackingKey(appId) });
		},
	});
}

/** How often the panel re-reads a running rank check. */
export const RANK_CHECK_POLL_MS = 5_000;

const rankCheckKey = (appId: string) =>
	["apps", appId, "tracking", "check"] as const;

/**
 * Per-market overview: one row per country with tracked keywords. The
 * per-country board is the drill-down.
 */
export function useTrackingMarkets(appId: string) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.tracking.markets(appId),
		queryKey: [...trackingKey(appId), "markets"],
	});
}

/**
 * The latest rank check. Polls while it runs (a throttled check of a few
 * hundred keywords takes minutes) and refreshes the tracker, markets and
 * dashboard summary once it ends. `initialRun` seeds a run the caller already
 * knows is running (the dashboard summary starts one), so its end is noticed
 * even when this is the first read.
 */
export function useRankCheckStatus(
	appId: string,
	options: { initialRun?: RankCheckRun | null; pollMs?: number } = {},
) {
	const queryClient = useQueryClient();
	const pollMs = options.pollMs ?? RANK_CHECK_POLL_MS;
	return useQuery({
		enabled: !!appId,
		initialData: options.initialRun ?? undefined,
		initialDataUpdatedAt: 0,
		queryFn: async () => {
			const previous = queryClient.getQueryData<RankCheckRun | null>(
				rankCheckKey(appId),
			);
			const run = await api.tracking.checkStatus(appId);
			if (previous?.status === "running" && run && run.status !== "running") {
				queryClient.invalidateQueries({
					predicate: (q) =>
						q.queryKey[0] === "apps" &&
						q.queryKey[1] === appId &&
						q.queryKey[2] === "tracking" &&
						q.queryKey[3] !== "check",
				});
			}
			return run;
		},
		queryKey: rankCheckKey(appId),
		refetchInterval: (query) =>
			query.state.data?.status === "running" ? pollMs : false,
	});
}

export function useRunRankCheck(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.tracking.check(appId),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Rank check failed"),
		onSuccess: async ({ alreadyRunning, run }) => {
			toast.success(
				alreadyRunning
					? "A rank check is already running"
					: `Rank check started for ${run.total} keyword(s)`,
			);
			// A status read still in flight from before the start must not
			// overwrite the running run (it would stop the polling).
			await queryClient.cancelQueries({ queryKey: rankCheckKey(appId) });
			queryClient.setQueryData(rankCheckKey(appId), run);
		},
	});
}
