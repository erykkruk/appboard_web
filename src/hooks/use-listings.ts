"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";

export function useListings(appId: string) {
  return useQuery({
    queryKey: ["listings", appId],
    queryFn: () => api.listings.list(appId),
    enabled: !!appId,
  });
}

export function useListing(appId: string, language: string) {
  return useQuery({
    queryKey: ["listings", appId, language],
    queryFn: () => api.listings.get(appId, language),
    enabled: !!appId && !!language,
  });
}

export function useUpdateListing(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      language,
      data,
    }: {
      language: string;
      data: Partial<Listing>;
    }) => api.listings.update(appId, language, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings", appId] });
    },
  });
}

export function usePublishListings(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.listings.publish(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings", appId] });
    },
  });
}

export function useSyncListings(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.listings.sync(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings", appId] });
    },
  });
}
