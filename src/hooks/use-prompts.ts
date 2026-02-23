import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useGlobalPrompts() {
	return useQuery({
		queryKey: ["global-prompts"],
		queryFn: () => api.settings.getPrompts(),
	});
}

export function usePromptDefaults() {
	return useQuery({
		queryKey: ["prompt-defaults"],
		queryFn: () => api.settings.getPromptDefaults(),
	});
}

export function useSetGlobalPrompt() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			mode,
			field,
			prompt,
		}: { mode: string; field: string; prompt: string }) =>
			api.settings.setPrompt(mode, field, prompt),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["global-prompts"] });
		},
	});
}

export function useDeleteGlobalPrompt() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ mode, field }: { mode: string; field: string }) =>
			api.settings.deletePrompt(mode, field),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["global-prompts"] });
		},
	});
}
