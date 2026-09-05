"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { BulkCopyRequest } from "@/lib/types";

/**
 * A bulk apply rewrites drafts, keywords and prompts on many apps at once, so
 * every per-app cache that shows those values has to be refetched afterwards.
 */
const QUERY_KEYS_STALE_AFTER_APPLY: readonly (readonly string[])[] = [
  ["apps"],
  ["listings"],
  ["app-audit"],
];

export function useBulkPreview() {
  return useMutation({
    mutationFn: (body: BulkCopyRequest) => api.bulk.preview(body),
  });
}

export function useBulkApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkCopyRequest) => api.bulk.apply(body),
    // onSettled rather than onSuccess: a request that fails halfway may still
    // have written some apps, and stale caches would hide that.
    onSettled: () => {
      for (const queryKey of QUERY_KEYS_STALE_AFTER_APPLY) {
        queryClient.invalidateQueries({ queryKey: [...queryKey] });
      }
    },
  });
}
