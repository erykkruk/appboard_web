"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AppAuditResponse, SuggestionsResponse } from "@/lib/types";

/** How often to re-ask while a measurement is running in the background. */
const MEASURING_POLL_MS = 3000;

function auditKey(appId: string, country?: string) {
  return ["app-audit", appId, country ?? "default"];
}

/**
 * The app's listing audit. The endpoint answers instantly and computes in the
 * background, so this polls while `status` is "measuring" and stops as soon as
 * a report lands - the UI shows "measuring", never a fake zero.
 */
export function useAudit(
  appId: string,
  options: { country?: string; enabled?: boolean } = {},
) {
  const { country, enabled = true } = options;
  return useQuery<AppAuditResponse>({
    enabled: enabled && !!appId,
    queryFn: () => api.audit.get(appId, { country }),
    queryKey: auditKey(appId, country),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === "measuring" || data.refreshing
        ? MEASURING_POLL_MS
        : false;
    },
  });
}

/**
 * Force a fresh measurement. A plain refetch would return the stored report
 * unchanged - the score only moves when the server is told to recompute, so
 * "Re-check" has to pass `refresh` and then let the poll pick the result up.
 */
export function useRecheckAudit(appId: string, country?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.audit.get(appId, { country, refresh: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(auditKey(appId, country), data);
      queryClient.invalidateQueries({ queryKey: auditKey(appId, country) });
    },
  });
}

/** Text proposals derived from the stored audit, for one language. */
export function useSuggestions(appId: string, language?: string) {
  return useQuery<SuggestionsResponse>({
    enabled: !!appId,
    queryFn: () => api.audit.suggestions(appId, language),
    queryKey: ["app-audit", appId, "suggestions", language ?? "default"],
  });
}
