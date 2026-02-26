"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PrivacyDeclarationInput } from "@/lib/types";

export function usePrivacyTemplates(platform?: "ios" | "android") {
  return useQuery({
    queryKey: ["privacy-templates", platform],
    queryFn: () => api.privacyDeclaration.templates(platform),
  });
}

export function usePrivacyDeclaration(appId: string) {
  return useQuery({
    queryKey: ["privacy-declaration", appId],
    queryFn: () => api.privacyDeclaration.get(appId),
    enabled: !!appId,
  });
}

export function useUpdatePrivacyDeclaration(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PrivacyDeclarationInput) =>
      api.privacyDeclaration.update(appId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["privacy-declaration", appId],
      });
    },
  });
}
