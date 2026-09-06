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
		onSuccess: () => {
			// Prefix match: the per-language row, the whole-app list (a new
			// language must appear as a tab right away) and the publish diffs.
			queryClient.invalidateQueries({ queryKey: ["listings", appId] });
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
		onSuccess: () => {
			// Prefix match: the language list, every per-language read and the
			// Publish diff all change when one draft is written. A brand-new
			// app depends on the list refetch to show its first language at all.
			queryClient.invalidateQueries({ queryKey: ["listings", appId] });
			queryClient.invalidateQueries({ queryKey: ["listing-diffs", appId] });
		},
	});
}

/**
 * The way out for an app without a store API: after the text is pasted into
 * the store by hand, this closes the drafts and records the change, so the
 * diff empties, History fills, the rank chart gets its marker and the draft
 * reminder stops.
 */
export function useMarkPublished(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.listings.markPublished(appId),
		onSuccess: () => {
			for (const key of ["listings", "listing-diffs", "history"]) {
				queryClient.invalidateQueries({ queryKey: [key, appId] });
			}
			// Rank chart annotations live under the tracking prefix.
			queryClient.invalidateQueries({ queryKey: ["apps", appId, "tracking"] });
		},
	});
}
