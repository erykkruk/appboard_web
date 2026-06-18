"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { SceneData } from "@/lib/types";

const scenesKey = (appId: string) => ["screenshot-scenes", appId] as const;

export function useScreenshotScenes(appId: string) {
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.screenshotScenes.list(appId),
		queryKey: scenesKey(appId),
	});
}

export function useScreenshotScene(appId: string, sceneId: string) {
	return useQuery({
		enabled: !!appId && !!sceneId,
		queryFn: () => api.screenshotScenes.get(appId, sceneId),
		queryKey: ["screenshot-scenes", appId, sceneId],
	});
}

export function useCreateScreenshotScene(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			language: string;
			displayType: string;
			name: string;
			scene: SceneData;
			sortOrder?: number;
		}) => api.screenshotScenes.create(appId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scenesKey(appId) });
		},
	});
}

export function useUpdateScreenshotScene(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			sceneId,
			data,
		}: {
			sceneId: string;
			data: Partial<{
				name: string;
				scene: SceneData;
				sortOrder: number;
				assetId: string | null;
			}>;
		}) => api.screenshotScenes.update(appId, sceneId, data),
		onSuccess: (_result, { sceneId }) => {
			queryClient.invalidateQueries({ queryKey: scenesKey(appId) });
			queryClient.invalidateQueries({
				queryKey: ["screenshot-scenes", appId, sceneId],
			});
		},
	});
}

export function useDeleteScreenshotScene(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (sceneId: string) =>
			api.screenshotScenes.delete(appId, sceneId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: scenesKey(appId) });
		},
	});
}
