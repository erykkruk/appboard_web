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

export function useUpdateGroup(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			groupId,
			data,
		}: {
			groupId: string;
			data: { name?: string };
		}) => api.purchases.updateGroup(appId, groupId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}

export function useDeleteGroup(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (groupId: string) =>
			api.purchases.deleteGroup(appId, groupId),
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

// Group localizations
export function useGroupLocalizations(appId: string, groupId: string) {
	return useQuery({
		enabled: !!appId && !!groupId,
		queryFn: () => api.purchases.groupLocalizations(appId, groupId),
		queryKey: ["group-localizations", appId, groupId],
	});
}

export function useUpsertGroupLocalizations(appId: string, groupId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (localizations: Array<{ language: string; name?: string | null; description?: string | null }>) =>
			api.purchases.upsertGroupLocalizations(appId, groupId, localizations),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["group-localizations", appId, groupId] });
			qc.invalidateQueries({ queryKey: ["purchases", appId, "subscription-groups", groupId] });
		},
	});
}

export function useDeleteGroupLocalization(appId: string, groupId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (language: string) =>
			api.purchases.deleteGroupLocalization(appId, groupId, language),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["group-localizations", appId, groupId] });
			qc.invalidateQueries({ queryKey: ["purchases", appId, "subscription-groups", groupId] });
		},
	});
}

// Group availability
export function useGroupAvailability(appId: string, groupId: string) {
	return useQuery({
		enabled: !!appId && !!groupId,
		queryFn: () => api.purchases.groupAvailability(appId, groupId),
		queryKey: ["group-availability", appId, groupId],
	});
}

export function useUpdateGroupAvailability(appId: string, groupId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (territories: string[]) =>
			api.purchases.updateGroupAvailability(appId, groupId, territories),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["group-availability", appId, groupId] });
			qc.invalidateQueries({ queryKey: ["purchases", appId, "subscription-groups", groupId] });
		},
	});
}

// Group review info
export function useGroupReviewInfo(appId: string, groupId: string) {
	return useQuery({
		enabled: !!appId && !!groupId,
		queryFn: () => api.purchases.groupReviewInfo(appId, groupId),
		queryKey: ["group-review-info", appId, groupId],
	});
}

export function useUpdateGroupReviewInfo(appId: string, groupId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { reviewNotes?: string | null; screenshotUrl?: string | null }) =>
			api.purchases.updateGroupReviewInfo(appId, groupId, data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["group-review-info", appId, groupId] });
			qc.invalidateQueries({ queryKey: ["purchases", appId, "subscription-groups", groupId] });
		},
	});
}

// Purchase availability
export function usePurchaseAvailability(appId: string, purchaseId: string) {
	return useQuery({
		enabled: !!appId && !!purchaseId,
		queryFn: () => api.purchases.purchaseAvailability(appId, purchaseId),
		queryKey: ["purchase-availability", appId, purchaseId],
	});
}

export function useUpdatePurchaseAvailability(appId: string, purchaseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (territories: string[] | null) =>
			api.purchases.updatePurchaseAvailability(appId, purchaseId, territories),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["purchase-availability", appId, purchaseId] });
			qc.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}

// Purchase review info
export function usePurchaseReviewInfo(appId: string, purchaseId: string) {
	return useQuery({
		enabled: !!appId && !!purchaseId,
		queryFn: () => api.purchases.purchaseReviewInfo(appId, purchaseId),
		queryKey: ["purchase-review-info", appId, purchaseId],
	});
}

export function useUpdatePurchaseReviewInfo(appId: string, purchaseId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { reviewNotes?: string | null; screenshotUrl?: string | null; useGroupDefault?: boolean }) =>
			api.purchases.updatePurchaseReviewInfo(appId, purchaseId, data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["purchase-review-info", appId, purchaseId] });
			qc.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}

// Family sharing
export function useUpdateFamilySharing(appId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ purchaseId, familySharable }: { purchaseId: string; familySharable: boolean }) =>
			api.purchases.updateFamilySharing(appId, purchaseId, familySharable),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["purchases", appId] });
		},
	});
}
