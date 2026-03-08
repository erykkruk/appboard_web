"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { MonetizationPlan } from "@/lib/types";

import { useChatHistory } from "./use-chat-history";

export type { MonetizationPlan };

interface ChatMessage {
	content: string;
	role: "assistant" | "user";
}

const MAX_MESSAGES = 10;

export function extractPlan(content: string): MonetizationPlan | null {
	const match = content.match(
		/```monetization_plan\s*\n([\s\S]*?)\n```/,
	);
	if (!match) return null;

	try {
		return JSON.parse(match[1]) as MonetizationPlan;
	} catch {
		return null;
	}
}

export function useMonetizationChat(
	appId: string,
	territories?: string[],
) {
	const {
		addMessage: persistMessage,
		clearHistory,
		isLoading: isLoadingHistory,
		messages: persistedMessages,
	} = useChatHistory(appId, "monetization");

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const abortRef = useRef<AbortController | null>(null);
	const queryClient = useQueryClient();
	const initializedRef = useRef(false);

	// Initialize messages from persisted history
	useEffect(() => {
		if (!isLoadingHistory && persistedMessages.length > 0 && !initializedRef.current) {
			initializedRef.current = true;
			setMessages(
				persistedMessages.map((m) => ({
					content: m.content,
					role: m.role,
				})),
			);
		}
		if (!isLoadingHistory && persistedMessages.length === 0 && !initializedRef.current) {
			initializedRef.current = true;
		}
	}, [isLoadingHistory, persistedMessages]);

	const sendMessage = useCallback(
		async (content: string) => {
			if (messages.length >= MAX_MESSAGES) return;

			const userMessage: ChatMessage = { content, role: "user" };
			const updatedMessages = [...messages, userMessage];
			setMessages(updatedMessages);
			setIsStreaming(true);

			// Persist user message
			persistMessage.mutate({ content, role: "user" });

			const controller = new AbortController();
			abortRef.current = controller;

			try {
				const response = await fetch("/api/ai/monetization-chat", {
					body: JSON.stringify({
						appId,
						messages: updatedMessages,
						...(territories ? { territories } : {}),
					}),
					headers: { "Content-Type": "application/json" },
					method: "POST",
					signal: controller.signal,
				});

				if (!response.ok) {
					const error = await response.json().catch(() => ({
						data: { info: "Unknown error" },
					}));
					const info =
						error.data?.info ?? `Error: ${response.status}`;
					const errorContent = `Error: ${info}`;
					setMessages((prev) => [
						...prev,
						{ content: errorContent, role: "assistant" },
					]);
					persistMessage.mutate({ content: errorContent, role: "assistant" });
					setIsStreaming(false);
					return;
				}

				const reader = response.body?.getReader();
				if (!reader) {
					setIsStreaming(false);
					return;
				}

				const decoder = new TextDecoder();
				let assistantContent = "";
				let buffer = "";

				setMessages((prev) => [
					...prev,
					{ content: "", role: "assistant" },
				]);

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() ?? "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed.startsWith("data: ")) continue;

						const data = trimmed.slice(6);
						if (data === "[DONE]") break;

						try {
							const parsed = JSON.parse(data) as {
								content?: string;
							};
							if (parsed.content) {
								assistantContent += parsed.content;
								setMessages((prev) => {
									const updated = [...prev];
									updated[updated.length - 1] = {
										content: assistantContent,
										role: "assistant",
									};
									return updated;
								});
							}
						} catch {
							// skip malformed chunks
						}
					}
				}

				// Persist assistant message after stream completes
				if (assistantContent) {
					persistMessage.mutate({ content: assistantContent, role: "assistant" });
				}
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					const errorContent = "Connection error. Please try again.";
					setMessages((prev) => [
						...prev.filter((m) => m.content !== ""),
						{ content: errorContent, role: "assistant" },
					]);
					persistMessage.mutate({ content: errorContent, role: "assistant" });
				}
			} finally {
				setIsStreaming(false);
				abortRef.current = null;
			}
		},
		[appId, messages, territories, persistMessage],
	);

	const executePlan = useMutation({
		mutationFn: (plan: MonetizationPlan) =>
			api.ai.monetizationExecute(appId, plan),
		onError: (error) => {
			const message =
				error instanceof Error ? error.message : "Unknown error";
			const errorContent = `Failed to execute plan: ${message}`;
			setMessages((prev) => [
				...prev,
				{ content: errorContent, role: "assistant" },
			]);
			persistMessage.mutate({ content: errorContent, role: "assistant" });
		},
		onSuccess: (results) => {
			queryClient.invalidateQueries({
				queryKey: ["purchases", appId],
			});
			queryClient.invalidateQueries({
				queryKey: ["group-localizations"],
			});
			queryClient.invalidateQueries({
				queryKey: ["group-availability"],
			});
			queryClient.invalidateQueries({
				queryKey: ["group-review-info"],
			});

			const parts: string[] = [];
			if (results.created.length > 0)
				parts.push(`${results.created.length} created`);
			if (results.edited.length > 0)
				parts.push(`${results.edited.length} edited`);
			if (results.deleted.length > 0)
				parts.push(`${results.deleted.length} deleted`);
			if (results.failed.length > 0)
				parts.push(`${results.failed.length} failed`);

			const summary = parts.length > 0 ? parts.join(", ") : "No changes";

			const hasFailures = results.failed.length > 0;
			const prefix = hasFailures
				? "Plan executed with errors"
				: "Plan executed";

			const resultContent = `${prefix}: ${summary}.${
				hasFailures
					? `\n\nFailed items:\n${results.failed.map((f) => `- ${f.item}: ${f.error}`).join("\n")}`
					: ""
			}`;

			setMessages((prev) => [
				...prev,
				{ content: resultContent, role: "assistant" },
			]);
			persistMessage.mutate({ content: resultContent, role: "assistant" });
		},
	});

	const stopStreaming = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
		initializedRef.current = true;
		clearHistory.mutate();
	}, [clearHistory]);

	return {
		clearMessages,
		executePlan,
		isLoadingHistory,
		isStreaming,
		maxMessages: MAX_MESSAGES,
		messages,
		sendMessage,
		stopStreaming,
	};
}
