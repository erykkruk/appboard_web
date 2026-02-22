"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AsoProfileInput } from "@/lib/types";

export function useAsoProfile(appId: string) {
  return useQuery({
    queryKey: ["aso-profile", appId],
    queryFn: () => api.asoProfile.get(appId),
    enabled: !!appId,
  });
}

export function useUpdateAsoProfile(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AsoProfileInput) => api.asoProfile.update(appId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aso-profile", appId] });
    },
  });
}
