import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useMonetizationPrompts() {
	return useQuery({
		queryKey: ["monetization-prompts"],
		queryFn: () => api.settings.getMonetizationPrompts(),
	});
}

export function usePurchasePrompts() {
	return useQuery({
		queryKey: ["purchase-prompts"],
		queryFn: () => api.settings.getPurchasePrompts(),
	});
}

export function useSetMonetizationPrompt() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ field, prompt }: { field: string; prompt: string }) =>
			api.settings.setMonetizationPrompt(field, prompt),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["monetization-prompts"] });
		},
	});
}

export function useDeleteMonetizationPrompt() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ field }: { field: string }) =>
			api.settings.deleteMonetizationPrompt(field),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["monetization-prompts"] });
		},
	});
}

export function useSetPurchasePrompt() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			mode,
			field,
			prompt,
		}: { mode: string; field: string; prompt: string }) =>
			api.settings.setPurchasePrompt(mode, field, prompt),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchase-prompts"] });
		},
	});
}

export function useDeletePurchasePrompt() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ mode, field }: { mode: string; field: string }) =>
			api.settings.deletePurchasePrompt(mode, field),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["purchase-prompts"] });
		},
	});
}

export function useMonetizationGuide() {
	return useQuery({
		queryKey: ["monetization-guide"],
		queryFn: () => api.settings.getMonetizationGuide(),
	});
}
