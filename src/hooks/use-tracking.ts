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
export function useTrackingBoard(appId: string, country?: string) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.tracking.board(appId, { country }),
		queryKey: [...trackingKey(appId), "board", country ?? ""],
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
 * hundred keywords takes minutes) and refreshes the tracker once it ends.
 */
export function useRankCheckStatus(appId: string) {
	const queryClient = useQueryClient();
	return useQuery({
		enabled: !!appId,
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
			query.state.data?.status === "running" ? RANK_CHECK_POLL_MS : false,
	});
}

export function useRunRankCheck(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.tracking.check(appId),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Rank check failed"),
		onSuccess: ({ alreadyRunning, run }) => {
			toast.success(
				alreadyRunning
					? "A rank check is already running"
					: `Rank check started for ${run.total} keyword(s)`,
			);
			queryClient.setQueryData(rankCheckKey(appId), run);
		},
	});
}

export function useAddKeywordsBulk(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (items: Array<{ country: string; keywords: string[] }>) =>
			api.tracking.addKeywordsBulk(appId, items),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to add keywords"),
		onSuccess: (result) => {
			const { added, rejected, skipped } = result.totals;
			const parts = [`Added ${added}`];
			if (skipped) parts.push(`${skipped} already tracked`);
			if (rejected) parts.push(`${rejected} over the per-market limit`);
			(rejected ? toast.warning : toast.success)(parts.join(", "));
			queryClient.invalidateQueries({ queryKey: trackingKey(appId) });
		},
	});
}
