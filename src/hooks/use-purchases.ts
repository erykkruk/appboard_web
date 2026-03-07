"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
	CreateGroupInput,
	CreatePurchaseInput,
	CreateSubscriptionInput,
	UpdatePurchaseInput,
} from "@/lib/types";

export function usePurchasesCapabilities(appId: string) {
	return useQuery({
		queryKey: ["purchases", appId, "capabilities"],
		queryFn: () => api.purchases.capabilities(appId),
		enabled: !!appId,
		staleTime: 5 * 60 * 1000,
	});
}

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

export function useCreatePurchase(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreatePurchaseInput) =>
			api.purchases.create(appId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}

export function useUpdatePurchase(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			purchaseId,
			data,
		}: {
			purchaseId: string;
			data: UpdatePurchaseInput;
		}) => api.purchases.update(appId, purchaseId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}

export function useDeletePurchase(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (purchaseId: string) =>
			api.purchases.delete(appId, purchaseId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}

export function useCreateGroup(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateGroupInput) =>
			api.purchases.createGroup(appId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}

export function useCreateSubscription(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			groupId,
			data,
		}: {
			groupId: string;
			data: CreateSubscriptionInput;
		}) => api.purchases.createSubscription(appId, groupId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}
