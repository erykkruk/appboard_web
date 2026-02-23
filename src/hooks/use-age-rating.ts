"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AgeRatingInput } from "@/lib/types";

export function useAgeRatingPresets() {
  return useQuery({
    queryKey: ["age-rating-presets"],
    queryFn: () => api.ageRating.presets(),
  });
}

export function useAgeRating(appId: string) {
  return useQuery({
    queryKey: ["age-rating", appId],
    queryFn: () => api.ageRating.get(appId),
    enabled: !!appId,
  });
}

export function useUpdateAgeRating(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AgeRatingInput) => api.ageRating.update(appId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["age-rating", appId] });
    },
  });
}
