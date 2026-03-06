import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

export function useAssets(
  appId: string,
  params?: { assetType?: string; language?: string; deviceType?: string },
) {
  // Strip empty string values so they don't become filters like language=""
  const cleanParams = useMemo(() => {
    if (!params) return undefined;
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
    );
    return Object.keys(filtered).length > 0 ? filtered : undefined;
  }, [params?.assetType, params?.language, params?.deviceType]);

  return useQuery({
    enabled: !!appId,
    queryFn: () => api.assets.list(appId, cleanParams),
    queryKey: ["assets", appId, cleanParams],
  });
}

export function useUploadAsset(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => api.assets.upload(appId, formData),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", appId] });
      toast.success("Asset uploaded");
    },
  });
}

export function useDeleteAsset(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) => api.assets.delete(appId, assetId),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", appId] });
      toast.success("Asset deleted");
    },
  });
}
