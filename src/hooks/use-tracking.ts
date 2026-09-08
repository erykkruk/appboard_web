"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { AutoResearchFrequency } from "@/lib/types";

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
 * Dashboard summary — the backend auto-imports ASO-profile keywords and runs a
 * first rank check on this call, so the first load can take a few seconds.
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

export function useRunRankCheck(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.tracking.check(appId),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Rank check failed"),
		onSuccess: (result) => {
			toast.success(`Checked ${result.checked} keyword(s)`);
			queryClient.invalidateQueries({ queryKey: trackingKey(appId) });
			queryClient.invalidateQueries({ queryKey: historyKey(appId) });
		},
	});
}
