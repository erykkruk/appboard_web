"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { GroupAsoProfileInput } from "@/lib/types";

export function useGroupAsoProfile(groupId: string) {
  return useQuery({
    queryKey: ["group-aso-profile", groupId],
    queryFn: () => api.appGroups.getAsoProfile(groupId),
    enabled: !!groupId,
  });
}

export function useUpdateGroupAsoProfile(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GroupAsoProfileInput) =>
      api.appGroups.updateAsoProfile(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["group-aso-profile", groupId],
      });
    },
  });
}

export function useEnableSharedProfile(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceAppId?: string | null) =>
      api.appGroups.enableSharedProfile(groupId, sourceAppId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["group-aso-profile", groupId],
      });
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
    },
  });
}
