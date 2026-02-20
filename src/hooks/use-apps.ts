"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useApps(params?: { platform?: string; storeId?: string }) {
  return useQuery({
    queryKey: ["apps", params],
    queryFn: () => api.apps.list(params),
  });
}

export function useApp(appId: string) {
  return useQuery({
    queryKey: ["apps", appId],
    queryFn: () => api.apps.get(appId),
    enabled: !!appId,
  });
}
