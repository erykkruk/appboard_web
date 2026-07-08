"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ConnectStoreData } from "@/lib/types";

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: () => api.stores.list(),
  });
}

export function useConnectStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConnectStoreData) => api.stores.connect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

export function useDisconnectStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.stores.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

export function useRenameStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.stores.rename(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

export function useSyncStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.stores.sync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

export function useSyncAllStores() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.stores.syncAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}
