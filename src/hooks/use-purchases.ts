"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function usePurchases(appId: string) {
	return useQuery({
		queryKey: ["purchases", appId],
		queryFn: () => api.purchases.list(appId),
		enabled: !!appId,
	});
}

export function usePurchase(appId: string, purchaseId: string) {
	return useQuery({
		queryKey: ["purchases", appId, purchaseId],
		queryFn: () => api.purchases.get(appId, purchaseId),
		enabled: !!appId && !!purchaseId,
	});
}

export function useSubscriptionGroups(appId: string) {
	return useQuery({
		queryKey: ["purchases", appId, "subscription-groups"],
		queryFn: () => api.purchases.subscriptionGroups(appId),
		enabled: !!appId,
	});
}

export function useSubscriptionGroup(appId: string, groupId: string) {
	return useQuery({
		queryKey: ["purchases", appId, "subscription-groups", groupId],
		queryFn: () => api.purchases.subscriptionGroup(appId, groupId),
		enabled: !!appId && !!groupId,
	});
}

export function useSyncPurchases(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.purchases.sync(appId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}
