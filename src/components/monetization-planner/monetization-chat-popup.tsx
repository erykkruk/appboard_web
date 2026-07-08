"use client";

import { useCallback, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ChatPopup, ChatPopupTrigger } from "@/components/chat-popup";
import { useMonetizationChat } from "@/hooks/use-monetization-chat";
import { useSettings } from "@/hooks/use-settings";
import { api } from "@/lib/api";

import { MonetizationMessage } from "./monetization-message";
import { TerritorySelector } from "./territory-selector";

interface MonetizationChatPopupProps {
	appId: string;
}

export function MonetizationChatPopup({ appId }: MonetizationChatPopupProps) {
	const [open, setOpen] = useState(false);
	const { data: settings } = useSettings();
	const primaryTerritory = settings?.primary_territory || "US";

	const [territoryMode, setTerritoryMode] = useState<"all" | "custom">("all");
	const [selectedTerritoryCodes, setSelectedTerritoryCodes] = useState<
		string[] | null
	>(null);

	const { data: territories = [] } = useQuery({
		queryFn: () => api.ai.territories(),
		queryKey: ["territories"],
		staleTime: Number.POSITIVE_INFINITY,
	});

	const allCodes = useMemo(
		() => territories.map((t) => t.code),
		[territories],
	);

	const resolvedSelectedCodes = selectedTerritoryCodes ?? allCodes;

	const effectiveTerritories = useMemo(
		() =>
			territoryMode === "all" ? undefined : resolvedSelectedCodes,
		[territoryMode, resolvedSelectedCodes],
	);

	const {
		clearMessages,
		executePlan,
		isLoadingHistory,
		isStreaming,
		maxMessages,
		messages,
		sendMessage,
		stopStreaming,
	} = useMonetizationChat(appId, effectiveTerritories);

	const [executedPlans, setExecutedPlans] = useState<Set<string>>(new Set());

	const handleExecutePlan = useCallback(
		(plan: Parameters<typeof executePlan.mutate>[0]) => {
			const planKey = JSON.stringify(plan);
			executePlan.mutate(plan, {
				onError: (error) => {
					toast.error(
						error instanceof Error
							? error.message
							: "Failed to execute plan",
					);
				},
				onSuccess: () => {
					setExecutedPlans((prev) => new Set(prev).add(planKey));
					toast.success("Monetization plan executed");
				},
			});
		},
		[executePlan],
	);

	const handleClear = useCallback(() => {
		clearMessages();
		setExecutedPlans(new Set());
	}, [clearMessages]);

	const messageRenderer = useCallback(
		(msg: { role: "user" | "assistant"; content: string }, index: number) => (
			<MonetizationMessage
				key={index}
				content={msg.content}
				role={msg.role}
				onExecutePlan={handleExecutePlan}
				isExecuting={executePlan.isPending}
				primaryTerritory={primaryTerritory}
				planExecuted={executedPlans.has(
					JSON.stringify(
						(() => {
							const match = msg.content.match(
								/```monetization_plan\s*\n([\s\S]*?)\n```/,
							);
							if (!match) return null;
							try {
								return JSON.parse(match[1]);
							} catch {
								return null;
							}
						})(),
					),
				)}
			/>
		),
		[handleExecutePlan, executePlan.isPending, primaryTerritory, executedPlans],
	);

	return (
		<>
			{!open && (
				<ChatPopupTrigger
					onClick={() => setOpen(true)}
					icon={<Sparkles className="size-5" />}
					label="Monetization Planner"
				/>
			)}
			<ChatPopup
				open={open}
				onOpenChange={setOpen}
				title="Monetization Planner"
				description="AI-powered monetization strategy"
				icon={<Sparkles className="h-4 w-4 text-primary" />}
				headerExtra={
					territories.length > 0 ? (
						<TerritorySelector
							territories={territories}
							selectedCodes={resolvedSelectedCodes}
							mode={territoryMode}
							onModeChange={setTerritoryMode}
							onSelectionChange={setSelectedTerritoryCodes}
						/>
					) : undefined
				}
				messages={messages}
				isStreaming={isStreaming}
				isLoadingHistory={isLoadingHistory}
				maxMessages={maxMessages}
				onSend={sendMessage}
				onStop={stopStreaming}
				onClear={handleClear}
				messageRenderer={messageRenderer}
				inputPlaceholder="Describe your monetization plan..."
			/>
		</>
	);
}
