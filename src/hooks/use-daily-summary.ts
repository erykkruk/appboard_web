"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

const dailySummaryKey = ["tracking", "daily-summary"] as const;

/** The workspace's morning summary email (one for every tracked app). */
export function useDailySummary() {
	return useQuery({
		queryFn: () => api.tracking.dailySummary(),
		queryKey: dailySummaryKey,
	});
}

export function useUpdateDailySummary() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: { email?: string | null; enabled?: boolean }) =>
			api.tracking.updateDailySummary(body),
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Failed to update the daily summary",
			),
		onSuccess: (settings) => {
			queryClient.setQueryData(dailySummaryKey, settings);
		},
	});
}

export function useSendTestDailySummary() {
	return useMutation({
		mutationFn: () => api.tracking.sendTestDailySummary(),
		onError: (err) =>
			toast.error(
				err instanceof Error ? err.message : "Could not send the test summary",
			),
		onSuccess: (result) => {
			toast.success(
				result.to ? `Test summary sent to ${result.to}` : "Test summary sent",
			);
		},
	});
}
