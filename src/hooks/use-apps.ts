"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { AppDevice } from "@/lib/types";

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

/** Set the form factors (phone, tablet, tv) an app's store record serves. */
export function useUpdateAppDevices(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (devices: AppDevice[]) => api.apps.updateDevices(appId, devices),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to save devices"),
		onSuccess: (app) => {
			queryClient.setQueryData(["apps", appId], app);
			queryClient.invalidateQueries({ queryKey: ["apps"] });
			toast.success("Devices saved");
		},
	});
}
