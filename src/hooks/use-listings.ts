"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

/** Draft listing patch, kept in sync with the API client signature. */
type UpdateListingData = Parameters<typeof api.listings.update>[2];

/** Every listing the app has, draft and remote, across languages. */
export function useListingList(appId: string) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.listings.list(appId),
		queryKey: ["listings", appId, "list"],
	});
}

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

export function useUpdateListing(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			language,
			data,
		}: {
			language: string;
			data: UpdateListingData;
		}) => api.listings.update(appId, language, data),
		onSuccess: (_result, { language }) => {
			queryClient.invalidateQueries({
				queryKey: ["listings", appId, language],
			});
			queryClient.invalidateQueries({ queryKey: ["listings", appId, "diffs"] });
		},
	});
}
