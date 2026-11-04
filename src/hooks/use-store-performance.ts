"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { STORE_PERFORMANCE_MONTHS } from "@/lib/store-performance";
import type { StorePerformanceResponse } from "@/lib/types";

/** Play rewrites the reports at most daily and the server caches 6 h; no need to refetch often. */
const STORE_PERFORMANCE_STALE_MS = 30 * 60 * 1000;

function storePerformanceKey(appId: string) {
  return ["apps", appId, "store-performance", STORE_PERFORMANCE_MONTHS];
}

export function useStorePerformance(appId: string) {
  return useQuery<StorePerformanceResponse>({
    enabled: !!appId,
    queryFn: () =>
      api.storePerformance.get(appId, { months: STORE_PERFORMANCE_MONTHS }),
    queryKey: storePerformanceKey(appId),
    staleTime: STORE_PERFORMANCE_STALE_MS,
  });
}

/** Read the bucket again, skipping the server cache (e.g. after granting access). */
export function useRefreshStorePerformance(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.storePerformance.get(appId, {
        months: STORE_PERFORMANCE_MONTHS,
        refresh: true,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(storePerformanceKey(appId), data);
    },
  });
}

export function useSetPlayReportsBucket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bucket, storeId }: { bucket: string | null; storeId: string }) =>
      api.stores.setPlayReportsBucket(storeId, bucket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[2] === "store-performance",
      });
    },
  });
}
