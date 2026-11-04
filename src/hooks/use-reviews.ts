"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ReviewScope } from "@/lib/types";

/** While the server refreshes ratings, poll for the new numbers. */
const RATINGS_REFRESH_POLL_MS = 5_000;

export function useReviews(
  appId: string,
  params?: {
    rating?: string;
    language?: string;
    storeType?: string;
    hasReply?: string;
    country?: string;
    scope?: ReviewScope;
  },
) {
  return useQuery({
    queryKey: ["reviews", appId, params],
    queryFn: () => api.reviews.list(appId, params),
    enabled: !!appId,
  });
}

export function useReviewStats(appId: string, scope?: ReviewScope) {
  return useQuery({
    queryKey: ["reviews", appId, "stats", scope ?? "app"],
    queryFn: () => api.reviews.stats(appId, scope),
    enabled: !!appId,
  });
}

export function useRatingsSummary(appId: string, scope?: ReviewScope) {
  return useQuery({
    queryKey: ["reviews", appId, "ratings", scope ?? "app"],
    queryFn: () => api.reviews.ratings(appId, scope),
    enabled: !!appId,
    refetchInterval: (query) =>
      query.state.data?.refreshing ? RATINGS_REFRESH_POLL_MS : false,
  });
}

export function useRefreshRatings(appId: string, scope?: ReviewScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.reviews.refreshRatings(appId, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", appId, "ratings"] });
    },
  });
}

/**
 * `appId` is the app the review belongs to, which in the group view can be
 * another record than the page's app. Every reviews query is invalidated so
 * the group list sees the reply too.
 */
export function useReplyToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      appId,
      reviewId,
      text,
    }: {
      appId: string;
      reviewId: string;
      text: string;
    }) => api.reviews.reply(appId, reviewId, { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

export function useSyncReviews(appId: string, scope?: ReviewScope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.reviews.sync(appId, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}
