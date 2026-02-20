"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useHistory(
  appId: string,
  params?: { language?: string; field?: string },
) {
  return useQuery({
    queryKey: ["history", appId, params],
    queryFn: () => api.history.list(appId, params),
    enabled: !!appId,
  });
}

export function useRollback(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (historyId: string) => api.history.rollback(appId, historyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history", appId] });
      queryClient.invalidateQueries({ queryKey: ["listings", appId] });
    },
  });
}
