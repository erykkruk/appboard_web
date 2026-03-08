"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AiChatMessage } from "@/lib/types";

export function useChatHistory(appId: string, chatType: string) {
	const queryClient = useQueryClient();
	const queryKey = ["chat-history", appId, chatType];

	const query = useQuery({
		enabled: !!appId,
		queryFn: () => api.ai.chatHistory(appId, chatType),
		queryKey,
	});

	const addMessage = useMutation({
		mutationFn: (data: {
			content: string;
			role: "assistant" | "user";
		}) =>
			api.ai.addChatMessage({
				appId,
				chatType,
				content: data.content,
				role: data.role,
			}),
		onSuccess: (newMessage) => {
			queryClient.setQueryData<AiChatMessage[]>(queryKey, (old) =>
				old ? [...old, newMessage] : [newMessage],
			);
		},
	});

	const clearHistory = useMutation({
		mutationFn: () => api.ai.clearChatHistory(appId, chatType),
		onSuccess: () => {
			queryClient.setQueryData<AiChatMessage[]>(queryKey, []);
		},
	});

	return {
		addMessage,
		clearHistory,
		isLoading: query.isLoading,
		messages: query.data ?? [],
	};
}
