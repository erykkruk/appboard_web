"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useAssets(
  appId: string,
  params?: { language?: string; deviceType?: string; assetType?: string },
) {
  return useQuery({
    queryKey: ["assets", appId, params],
    queryFn: () => api.assets.list(appId, params),
    enabled: !!appId,
  });
}

export function useUploadAsset(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.assets.upload(appId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", appId] });
    },
  });
}

export function useDeleteAsset(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => api.assets.delete(appId, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", appId] });
    },
  });
}

export function useReorderAssets(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetIds: string[]) => api.assets.reorder(appId, { assetIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", appId] });
    },
  });
}

export function useSyncAssets(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.assets.sync(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", appId] });
    },
  });
}
