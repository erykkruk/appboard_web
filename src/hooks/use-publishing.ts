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

export function useVersions(appId: string) {
  return useQuery({
    queryKey: ["publishing", appId, "versions"],
    queryFn: () => api.publishing.versions(appId),
    enabled: !!appId,
  });
}

export function useVersionDetail(appId: string, versionId: string) {
  return useQuery({
    queryKey: ["publishing", appId, "versions", versionId],
    queryFn: () => api.publishing.versionDetail(appId, versionId),
    enabled: !!appId && !!versionId,
  });
}

export function useVersionScreenshots(appId: string, versionId: string) {
  return useQuery({
    queryKey: ["publishing", appId, "versions", versionId, "screenshots"],
    queryFn: () => api.publishing.versionScreenshots(appId, versionId),
    enabled: !!appId && !!versionId,
  });
}

export function useUploadScreenshot(appId: string, versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      language,
      displayType,
      file,
    }: {
      language: string;
      displayType: string;
      file: File;
    }) =>
      api.publishing.uploadScreenshot(
        appId,
        versionId,
        language,
        displayType,
        file,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["publishing", appId, "versions", versionId, "screenshots"],
      });
    },
  });
}

export function useDeleteScreenshot(appId: string, versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (screenshotId: string) =>
      api.publishing.deleteScreenshot(appId, screenshotId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["publishing", appId, "versions", versionId, "screenshots"],
      });
    },
  });
}

export function useReorderScreenshots(appId: string, versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      screenshotSetId,
      screenshotIds,
    }: {
      screenshotSetId: string;
      screenshotIds: string[];
    }) => api.publishing.reorderScreenshots(appId, screenshotSetId, screenshotIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["publishing", appId, "versions", versionId, "screenshots"],
      });
    },
  });
}

export function useDeleteAllScreenshots(appId: string, versionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (screenshotSetId: string) =>
      api.publishing.deleteAllScreenshots(appId, screenshotSetId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["publishing", appId, "versions", versionId, "screenshots"],
      });
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
