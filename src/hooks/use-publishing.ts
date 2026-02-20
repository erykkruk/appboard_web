"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePublishingOverview(appId: string) {
  return useQuery({
    queryKey: ["publishing", appId, "overview"],
    queryFn: () => api.publishing.overview(appId),
    enabled: !!appId,
  });
}

export function usePublish(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submitForReview?: boolean) =>
      api.publishing.publish(appId, submitForReview),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishing", appId] });
      queryClient.invalidateQueries({ queryKey: ["listings", appId] });
      queryClient.invalidateQueries({ queryKey: ["assets", appId] });
    },
  });
}

export function useVersionInfo(appId: string) {
  return useQuery({
    queryKey: ["publishing", appId, "version"],
    queryFn: () => api.publishing.version(appId),
    enabled: !!appId,
  });
}

export function useCreateVersion(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionString: string) =>
      api.publishing.createVersion(appId, versionString),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishing", appId] });
    },
  });
}

export function useSubmitForReview(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.publishing.submitReview(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishing", appId] });
    },
  });
}
