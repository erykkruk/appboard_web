"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { HistoryEntry } from "@/lib/types";

export function useHistory(
	appId: string,
	filters?: { language?: string; field?: string; enabled?: boolean },
) {
	const enabled = filters?.enabled ?? true;
	const apiFilters = { language: filters?.language, field: filters?.field };
	return useQuery<HistoryEntry[]>({
		queryKey: ["history", appId, filters?.language, filters?.field],
		queryFn: () => api.history.list(appId, apiFilters),
		enabled: !!appId && enabled,
	});
}

export function useRollback(appId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (historyId: string) => api.history.rollback(appId, historyId),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["history", appId] });
			qc.invalidateQueries({ queryKey: ["listings", appId] });
			qc.invalidateQueries({ queryKey: ["listing-diffs", appId] });
		},
	});
}
