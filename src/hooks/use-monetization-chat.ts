"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface ChatMessage {
	content: string;
	role: "assistant" | "user";
}

interface MonetizationPlan {
	deletes?: string[];
	edits?: Array<{
		localizations?: Array<{
			description?: string;
			language: string;
			name?: string;
		}>;
		name?: string;
		prices?: Array<{ currency: string; price: string; territory: string }>;
		purchaseId: string;
	}>;
	groups?: Array<{
		name: string;
		subscriptions: Array<{
			duration: string;
			localizations?: Array<{
				description?: string;
				language: string;
				name?: string;
			}>;
			name: string;
			prices?: Array<{ currency: string; price: string; territory: string }>;
			productId: string;
		}>;
	}>;
	purchases?: Array<{
		localizations?: Array<{
			description?: string;
			language: string;
			name?: string;
		}>;
		name: string;
		prices?: Array<{ currency: string; price: string; territory: string }>;
		productId: string;
		productType: string;
	}>;
}

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

export function useMonetizationChat(appId: string) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const abortRef = useRef<AbortController | null>(null);
	const queryClient = useQueryClient();

	const sendMessage = useCallback(
		async (content: string) => {
			const userMessage: ChatMessage = { content, role: "user" };
			const updatedMessages = [...messages, userMessage];
			setMessages(updatedMessages);
			setIsStreaming(true);

			const controller = new AbortController();
			abortRef.current = controller;

			try {
				const response = await fetch("/api/ai/monetization-chat", {
					body: JSON.stringify({
						appId,
						messages: updatedMessages,
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
					setMessages((prev) => [
						...prev,
						{ content: `Error: ${info}`, role: "assistant" },
					]);
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
			} catch (err) {
				if ((err as Error).name !== "AbortError") {
					setMessages((prev) => [
						...prev.filter((m) => m.content !== ""),
						{
							content: "Connection error. Please try again.",
							role: "assistant",
						},
					]);
				}
			} finally {
				setIsStreaming(false);
				abortRef.current = null;
			}
		},
		[appId, messages],
	);

	const executePlan = useMutation({
		mutationFn: (plan: MonetizationPlan) =>
			api.ai.monetizationExecute(appId, plan),
		onSuccess: (results) => {
			queryClient.invalidateQueries({
				queryKey: ["purchases", appId],
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

			setMessages((prev) => [
				...prev,
				{
					content: `Plan executed: ${summary}.${
						results.failed.length > 0
							? `\n\nFailed items:\n${results.failed.map((f) => `- ${f.item}: ${f.error}`).join("\n")}`
							: ""
					}`,
					role: "assistant",
				},
			]);
		},
	});

	const stopStreaming = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	return {
		clearMessages,
		executePlan,
		isStreaming,
		messages,
		sendMessage,
		stopStreaming,
	};
}
