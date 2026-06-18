"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useListing(appId: string, language: string) {
	return useQuery({
		enabled: !!appId && !!language,
		queryFn: () => api.listings.get(appId, language),
		queryKey: ["listings", appId, language],
	});
}

export function useUpdateListingTranslationSettings(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			language,
			doNotTranslateFields,
			translationInstructions,
		}: {
			language: string;
			doNotTranslateFields: string[];
			translationInstructions: string;
		}) =>
			api.listings.update(appId, language, {
				doNotTranslateFields,
				translationInstructions,
			}),
		onSuccess: (_result, { language }) => {
			queryClient.invalidateQueries({
				queryKey: ["listings", appId, language],
			});
			queryClient.invalidateQueries({ queryKey: ["listings", appId, "diffs"] });
		},
	});
}
