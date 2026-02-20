"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useReviews(
  appId: string,
  params?: {
    rating?: string;
    language?: string;
    storeType?: string;
    hasReply?: string;
  },
) {
  return useQuery({
    queryKey: ["reviews", appId, params],
    queryFn: () => api.reviews.list(appId, params),
    enabled: !!appId,
  });
}

export function useReviewStats(appId: string) {
  return useQuery({
    queryKey: ["reviews", appId, "stats"],
    queryFn: () => api.reviews.stats(appId),
    enabled: !!appId,
  });
}

export function useReplyToReview(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) =>
      api.reviews.reply(appId, reviewId, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", appId] });
    },
  });
}

export function useSyncReviews(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.reviews.sync(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", appId] });
    },
  });
}
