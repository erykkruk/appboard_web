"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

/** Server-side keyword score history: latest snapshot per keyword+country. */
export function useScoreHistory(filters?: {
	country?: string;
	keyword?: string;
}) {
	return useQuery({
		queryFn: () => api.research.keywordScoresHistory(filters),
		queryKey: ["keyword-scores", "history", filters ?? {}],
	});
}

export function useScoreSnapshot(snapshotId: string | null) {
	return useQuery({
		enabled: snapshotId !== null,
		queryFn: () => api.research.keywordScoreSnapshot(snapshotId as string),
		queryKey: ["keyword-scores", "snapshot", snapshotId],
	});
}

export function useScoreTrend(
	keyword: string | null,
	country: string | null,
	days?: number,
) {
	return useQuery({
		enabled: keyword !== null && country !== null,
		queryFn: () =>
			api.research.keywordScoresTrend(
				keyword as string,
				country as string,
				days,
			),
		queryKey: ["keyword-scores", "trend", keyword, country, days ?? 90],
	});
}

export function useScoreSummary() {
	return useQuery({
		queryFn: () => api.research.keywordScoresSummary(),
		queryKey: ["keyword-scores", "summary"],
	});
}

export function useDeleteScoreSnapshot() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (snapshotId: string) =>
			api.research.deleteKeywordScoreSnapshot(snapshotId),
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete snapshot",
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["keyword-scores"] });
		},
	});
}
