"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePublishSettings(appId: string) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.publishing.publishSettings(appId),
		queryKey: ["publishing", appId, "settings"],
	});
}

export function useUpdatePublishSettings(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { publishMode: string; publishScheduledAt?: string }) =>
			api.publishing.updatePublishSettings(appId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "settings"],
			});
		},
	});
}

export function usePushPreview(appId: string, enabled: boolean) {
	return useQuery({
		enabled: !!appId && enabled,
		queryFn: () => api.publishing.pushPreview(appId),
		queryKey: ["publishing", appId, "push-preview"],
		staleTime: 0,
	});
}

export function usePublishingOverview(appId: string) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.publishing.overview(appId),
		queryKey: ["publishing", appId, "overview"],
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
		enabled: !!appId,
		queryFn: () => api.publishing.version(appId),
		queryKey: ["publishing", appId, "version"],
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
		enabled: !!appId,
		queryFn: () => api.publishing.versions(appId),
		queryKey: ["publishing", appId, "versions"],
	});
}

export function useVersionDetail(appId: string, versionId: string) {
	return useQuery({
		enabled: !!appId && !!versionId,
		queryFn: () => api.publishing.versionDetail(appId, versionId),
		queryKey: ["publishing", appId, "versions", versionId],
	});
}

export function useVersionScreenshots(appId: string, versionId: string) {
	return useQuery({
		enabled: !!appId && !!versionId,
		queryFn: () => api.publishing.versionScreenshots(appId, versionId),
		queryKey: ["publishing", appId, "versions", versionId, "screenshots"],
	});
}

export function useUploadScreenshot(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			language,
			displayType,
			file,
			crop,
		}: {
			language: string;
			displayType: string;
			file: File;
			crop?: { x: number; y: number; width: number; height: number };
		}) =>
			api.publishing.uploadScreenshot(
				appId,
				versionId,
				language,
				displayType,
				file,
				crop,
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
		}) =>
			api.publishing.reorderScreenshots(appId, screenshotSetId, screenshotIds),
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

export function useAddLocalization(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			locale,
			copyScreenshotsFrom,
		}: {
			locale: string;
			copyScreenshotsFrom?: string;
		}) =>
			api.publishing.addLocalization(
				appId,
				versionId,
				locale,
				copyScreenshotsFrom,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId],
			});
		},
	});
}

export function useAddLocalizationWithTranslation(
	appId: string,
	versionId: string,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			locale,
			sourceLocale,
			copyScreenshotsFrom,
		}: {
			locale: string;
			sourceLocale: string;
			copyScreenshotsFrom?: string;
		}) =>
			api.publishing.addLocalizationWithTranslation(
				appId,
				versionId,
				locale,
				sourceLocale,
				copyScreenshotsFrom,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId],
			});
		},
	});
}

export function useUpdateLocalization(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			localizationId,
			data,
		}: {
			localizationId: string;
			data: Partial<{
				title: string;
				subtitle: string;
				description: string;
				keywords: string;
				whatsNew: string;
				promotionalText: string;
				marketingUrl: string;
				supportUrl: string;
				shortDescription: string;
				fullDescription: string;
			}>;
		}) =>
			api.publishing.updateLocalization(appId, versionId, localizationId, data),
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId],
			});
			return result;
		},
	});
}

export function useDeleteLocalization(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (localizationId: string) =>
			api.publishing.deleteLocalization(appId, versionId, localizationId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId],
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

export function useUpdateCopyright(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (copyright: string) =>
			api.publishing.updateCopyright(appId, versionId, copyright),
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId],
			});
			return result;
		},
	});
}

export function useSyncVersions(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.publishing.syncVersions(appId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["publishing", appId] });
		},
	});
}

export function usePublishLocalizations(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.publishing.publishLocalizations(appId, versionId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId],
			});
		},
	});
}

export function useReviewDetail(appId: string, versionId: string) {
	return useQuery({
		enabled: !!appId && !!versionId,
		queryFn: () => api.publishing.reviewDetail(appId, versionId),
		queryKey: ["publishing", appId, "versions", versionId, "review-detail"],
	});
}

export function useUpdateReviewDetail(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (
			data: Partial<{
				contactFirstName: string;
				contactLastName: string;
				contactPhone: string;
				contactEmail: string;
				demoAccountName: string;
				demoAccountPassword: string;
				demoAccountRequired: boolean;
				notes: string;
			}>,
		) => api.publishing.updateReviewDetail(appId, versionId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId, "review-detail"],
			});
		},
	});
}

export function useUploadReviewAttachment(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (file: File) =>
			api.publishing.uploadReviewAttachment(appId, versionId, file),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId, "review-detail"],
			});
		},
	});
}

export function useSplitPreview(appId: string) {
	return useMutation({
		mutationFn: ({
			displayType,
			file,
			parts,
			targetHeight,
			targetWidth,
		}: {
			displayType: string;
			file: File;
			parts: number;
			targetHeight?: number;
			targetWidth?: number;
		}) =>
			api.publishing.splitPreview(
				appId,
				displayType,
				file,
				parts,
				targetWidth,
				targetHeight,
			),
	});
}

export function useSplitUploadScreenshots(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			language,
			displayType,
			file,
			parts,
			insertAt,
			targetHeight,
			targetWidth,
			crop,
		}: {
			language: string;
			displayType: string;
			file: File;
			parts: number;
			insertAt?: number;
			targetHeight?: number;
			targetWidth?: number;
			crop?: { x: number; y: number; width: number; height: number };
		}) =>
			api.publishing.splitUploadScreenshots(
				appId,
				versionId,
				language,
				displayType,
				file,
				parts,
				insertAt,
				targetWidth,
				targetHeight,
				crop,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId, "screenshots"],
			});
		},
	});
}

export function useCopyScreenshots(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			sourceLanguage,
			targetLanguage,
			displayType,
			copyLocalizations,
		}: {
			sourceLanguage: string;
			targetLanguage: string;
			displayType?: string;
			copyLocalizations?: boolean;
		}) =>
			api.publishing.copyScreenshots(
				appId,
				versionId,
				sourceLanguage,
				targetLanguage,
				displayType,
				copyLocalizations,
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId, "screenshots"],
			});
			// Copying text localizations updates the target language draft, so the
			// version detail (titles/descriptions/keywords) must refetch too.
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId],
			});
		},
	});
}

export function useDeleteReviewAttachment(appId: string, versionId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (attachmentId: string) =>
			api.publishing.deleteReviewAttachment(appId, attachmentId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["publishing", appId, "versions", versionId, "review-detail"],
			});
		},
	});
}
