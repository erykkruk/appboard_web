"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { FeatureKey, FeaturesResponse } from "@/lib/types";

export function useFeatures() {
	return useQuery<FeaturesResponse>({
		queryKey: ["features"],
		queryFn: () => api.features.get(),
	});
}

export function useUpdateFeatures() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, boolean>) => api.features.update(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["features"] }),
	});
}

export function useIsFeatureEnabled(key: FeatureKey): boolean {
	const { data } = useFeatures();
	if (!data) return true;
	return data.features[key] ?? true;
}
