"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  DraftReplyRequest,
  GenerateDescriptionRequest,
  GeneratePurchaseFieldRequest,
  GenerateReleaseNotesRequest,
  SuggestKeywordsRequest,
  TranslateLocalizationRequest,
  TranslateRequest,
} from "@/lib/types";

export function useTranslate() {
  return useMutation({
    mutationFn: (data: TranslateRequest) => api.ai.translate(data),
  });
}

export function useTranslateLocalization() {
  return useMutation({
    mutationFn: (data: TranslateLocalizationRequest) =>
      api.ai.translateLocalization(data),
  });
}

export function useGenerateDescription() {
  return useMutation({
    mutationFn: (data: GenerateDescriptionRequest) =>
      api.ai.generateDescription(data),
  });
}

export function useSuggestKeywords() {
  return useMutation({
    mutationFn: (data: SuggestKeywordsRequest) => api.ai.suggestKeywords(data),
  });
}

export function useDraftReply() {
  return useMutation({
    mutationFn: (data: DraftReplyRequest) => api.ai.draftReply(data),
  });
}

export function useGenerateReleaseNotes() {
  return useMutation({
    mutationFn: (data: GenerateReleaseNotesRequest) =>
      api.ai.generateReleaseNotes(data),
  });
}

export function useGeneratePurchaseField() {
  return useMutation({
    mutationFn: (data: GeneratePurchaseFieldRequest) =>
      api.ai.generatePurchaseField(data),
  });
}

/**
 * Whether AI can run at all for this workspace. Screens use it to show what a
 * key unlocks up front instead of letting a button fail on click.
 */
export function useAiStatus() {
	return useQuery({
		queryFn: () => api.ai.status(),
		queryKey: ["ai", "status"],
		staleTime: 60_000,
	});
}
