"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

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

/**
 * Predicate for gating navigation entries by feature flag. Fail-open on
 * purpose: while the flags are still loading nothing may disappear from the
 * UI, and an unknown key defaults to enabled.
 */
export function useFeatureFilter(): (key?: FeatureKey) => boolean {
	const { data } = useFeatures();
	const features = data?.features;

	return useCallback(
		(key?: FeatureKey) => {
			if (!key) return true;
			if (!features) return true;
			return features[key] ?? true;
		},
		[features],
	);
}

export function useIsFeatureEnabled(key: FeatureKey): boolean {
	const { data } = useFeatures();
	if (!data) return true;
	return data.features[key] ?? true;
}
