"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useAppGroups() {
  return useQuery({
    queryKey: ["app-groups"],
    queryFn: () => api.appGroups.list(),
  });
}

export function useCreateAppGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; iconUrl?: string }) =>
      api.appGroups.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
    },
  });
}

export function useUpdateAppGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: { name?: string; iconUrl?: string | null; useSharedProfile?: boolean };
    }) => api.appGroups.update(groupId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
      if (variables.data.useSharedProfile !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ["group-aso-profile", variables.groupId],
        });
      }
    },
  });
}

export function useDeleteAppGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => api.appGroups.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
    },
  });
}

export function useAddGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, appId }: { groupId: string; appId: string }) =>
      api.appGroups.addMember(groupId, appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
    },
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, appId }: { groupId: string; appId: string }) =>
      api.appGroups.removeMember(groupId, appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
    },
  });
}

export function useReorderGroups() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupIds: string[]) => api.appGroups.reorderGroups(groupIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
    },
  });
}

export function useReorderGroupMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, appIds }: { groupId: string; appIds: string[] }) =>
      api.appGroups.reorderMembers(groupId, appIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
    },
  });
}
