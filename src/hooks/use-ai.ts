"use client";

import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  DraftReplyRequest,
  GenerateDescriptionRequest,
  GenerateReleaseNotesRequest,
  SuggestKeywordsRequest,
  TranslateRequest,
} from "@/lib/types";

export function useTranslate() {
  return useMutation({
    mutationFn: (data: TranslateRequest) => api.ai.translate(data),
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
