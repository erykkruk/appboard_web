"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import type { Platform } from "@/lib/types";
import {
	errorMessage,
	extractGeneratedText,
	parseSuggestedKeywords,
} from "@/lib/write-with-ai";

/** What the backend's suggest-keywords route actually reads. */
export interface SuggestTargetKeywordsInput {
	appName: string;
	category?: string;
	currentKeywords?: string[];
	description?: string;
}

export interface WriteDescriptionInput {
	appName: string;
	keywords: string[];
	platform: Platform;
	prompt: string;
}

// The typed client still describes an older request shape for both AI
// routes, so the bodies go through as the backend reads them. Deriving the
// target type keeps this compiling when the client catches up.
type SuggestKeywordsBody = Parameters<typeof api.ai.suggestKeywords>[0];
type GenerateDescriptionBody = Parameters<typeof api.ai.generateDescription>[0];

/** Keyword ideas for the description, parsed whatever shape they come in. */
export function useSuggestTargetKeywords() {
	return useMutation({
		mutationFn: async (input: SuggestTargetKeywordsInput): Promise<string[]> => {
			const body: SuggestTargetKeywordsInput = { appName: input.appName };
			if (input.description) body.description = input.description;
			if (input.category) body.category = input.category;
			if (input.currentKeywords?.length) {
				body.currentKeywords = input.currentKeywords;
			}
			const raw = await api.ai.suggestKeywords(
				body as unknown as SuggestKeywordsBody,
			);
			return parseSuggestedKeywords(raw);
		},
	});
}

export function useWriteDescription() {
	return useMutation({
		mutationFn: async (input: WriteDescriptionInput): Promise<string> => {
			const raw = await api.ai.generateDescription(
				input as unknown as GenerateDescriptionBody,
			);
			const text = extractGeneratedText(raw);
			if (!text) {
				throw new Error("The AI returned an empty description. Try again.");
			}
			return text;
		},
	});
}

/**
 * Saves the new text as the draft for one language. Nothing goes to the
 * store; the listing and audit views are refreshed so the change shows up
 * everywhere at once.
 */
export function useApplyWrittenDescription(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ fullDesc, language }: { fullDesc: string; language: string }) =>
			api.listings.update(appId, language, { fullDesc }),
		onError: (err) => {
			toast.error(errorMessage(err, "Could not save the draft."));
		},
		onSuccess: () => {
			toast.success("Saved as a draft. Nothing was sent to the store.");
			queryClient.invalidateQueries({ queryKey: ["listings", appId] });
			queryClient.invalidateQueries({ queryKey: ["listing-diffs", appId] });
			queryClient.invalidateQueries({ queryKey: ["app-audit", appId] });
		},
	});
}
