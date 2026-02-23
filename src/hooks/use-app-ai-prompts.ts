import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAppAiPrompts(appId: string) {
	return useQuery({
		queryKey: ["app-ai-prompts", appId],
		queryFn: () => api.appAiPrompts.list(appId),
		enabled: !!appId,
	});
}

export function useSetAppAiPrompt(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			mode,
			field,
			prompt,
		}: { mode: string; field: string; prompt: string }) =>
			api.appAiPrompts.set(appId, mode, field, prompt),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["app-ai-prompts", appId],
			});
		},
	});
}

export function useDeleteAppAiPrompt(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ mode, field }: { mode: string; field: string }) =>
			api.appAiPrompts.delete(appId, mode, field),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["app-ai-prompts", appId],
			});
		},
	});
}
