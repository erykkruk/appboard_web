"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

/** Create an app that is not published in any store yet. */
export function useCreateLocalApp() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: {
			bundleId?: string;
			name: string;
			platform: "ios" | "android";
		}) => api.apps.createLocal(body),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["apps"] });
		},
	});
}
