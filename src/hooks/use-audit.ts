"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { api } from "@/lib/api";
import type {
  AppAuditResponse,
  AuditHistory,
  SuggestionsResponse,
} from "@/lib/types";

/** How often to re-ask while a measurement is running in the background. */
const MEASURING_POLL_MS = 3000;
/** Auto-tracking runs right after the report is stored; give it a moment. */
const AUTO_TRACK_SETTLE_MS = 2500;

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
  const queryClient = useQueryClient();
  const query = useQuery<AppAuditResponse>({
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

  // A finished measurement also tracks the best terms and changes the text
  // proposals, and both were fetched while the report was still empty. Bump
  // them when the poll sees the work end, once more after auto-tracking had
  // time to write its rows.
  const busy =
    query.data?.status === "measuring" || query.data?.refreshing === true;
  const wasBusy = useRef(busy);
  useEffect(() => {
    const finished = wasBusy.current && !busy && query.data?.status === "ready";
    wasBusy.current = busy;
    if (!finished) return;
    const bump = () => {
      queryClient.invalidateQueries({ queryKey: ["apps", appId, "tracking"] });
      queryClient.invalidateQueries({
        queryKey: ["app-audit", appId, "suggestions"],
      });
    };
    bump();
    const late = setTimeout(bump, AUTO_TRACK_SETTLE_MS);
    return () => clearTimeout(late);
  }, [appId, busy, query.data?.status, queryClient]);

  return query;
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

/**
 * The listing score over time. The series starts at the first measurement
 * recorded for this app - there is no backfill, so a fresh app shows one point
 * and says so rather than drawing an invented curve.
 */
export function useAuditHistory(appId: string, country?: string) {
  return useQuery<AuditHistory>({
    enabled: !!appId,
    queryFn: () => api.audit.history(appId, country),
    queryKey: ["app-audit", appId, "history", country ?? "default"],
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
