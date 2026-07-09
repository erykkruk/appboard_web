"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ConnectStoreData, StoreType } from "@/lib/types";

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

export function useAddStorePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, packageName }: { id: string; packageName: string }) =>
      api.stores.addPackage(id, packageName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    },
  });
}

export function useResyncStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.stores.resync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.invalidateQueries({ queryKey: ["app-groups"] });
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

export function useStoreCapabilityCatalog() {
  return useQuery({
    queryKey: ["store-capability-catalog"],
    queryFn: () => api.stores.capabilityCatalog(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useStoreCapabilities(id: string | null) {
  return useQuery({
    queryKey: ["stores", id, "capabilities"],
    queryFn: () => api.stores.getCapabilities(id as string),
    enabled: !!id,
  });
}

export function useUpdateStoreCapabilities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, capabilities }: { id: string; capabilities: string[] }) =>
      api.stores.updateCapabilities(id, capabilities),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}

export function useVerifyStoreAccess() {
  return useMutation({
    mutationFn: (data: {
      type: StoreType;
      credentials: Record<string, string | boolean>;
    }) => api.stores.verifyAccess(data),
  });
}

export function useVerifyStoredAccess() {
  return useMutation({
    mutationFn: (id: string) => api.stores.verifyStoredAccess(id),
  });
}
