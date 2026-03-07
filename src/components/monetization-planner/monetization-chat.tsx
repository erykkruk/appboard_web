"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Loader2, Send, Square } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useMonetizationChat } from "@/hooks/use-monetization-chat";
import { api } from "@/lib/api";

import { MonetizationMessage } from "./monetization-message";
import { TerritorySelector } from "./territory-selector";

interface MonetizationChatProps {
	appId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function MonetizationChat({
	appId,
	open,
	onOpenChange,
}: MonetizationChatProps) {
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
		isStreaming,
		messages,
		sendMessage,
		stopStreaming,
	} = useMonetizationChat(appId, effectiveTerritories);

	const [input, setInput] = useState("");
	const [executedPlans, setExecutedPlans] = useState<Set<string>>(new Set());
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	// Focus input when sheet opens
	useEffect(() => {
		if (open) {
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [open]);

	const handleSend = useCallback(() => {
		const trimmed = input.trim();
		if (!trimmed || isStreaming) return;
		setInput("");
		sendMessage(trimmed);
	}, [input, isStreaming, sendMessage]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

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

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col sm:max-w-lg"
				showCloseButton
			>
				<SheetHeader>
					<SheetTitle>Monetization Planner</SheetTitle>
					<SheetDescription>
						Describe how you want to monetize your app. AI will
						propose products and subscriptions.
					</SheetDescription>
				</SheetHeader>

				{territories.length > 0 && (
					<TerritorySelector
						territories={territories}
						selectedCodes={resolvedSelectedCodes}
						mode={territoryMode}
						onModeChange={setTerritoryMode}
						onSelectionChange={setSelectedTerritoryCodes}
					/>
				)}

				{/* Messages */}
				<div
					ref={scrollRef}
					className="flex-1 overflow-y-auto space-y-4 px-1 py-4"
				>
					{messages.length === 0 && (
						<div className="flex h-full items-center justify-center">
							<p className="max-w-[280px] text-center text-sm text-muted-foreground">
								Describe your app&apos;s monetization strategy
								and I&apos;ll help you set up the right
								products and subscriptions.
							</p>
						</div>
					)}

					{messages.map((msg, i) => (
						<MonetizationMessage
							key={i}
							content={msg.content}
							role={msg.role}
							onExecutePlan={handleExecutePlan}
							isExecuting={executePlan.isPending}
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
					))}

					{isStreaming &&
						messages[messages.length - 1]?.content === "" && (
							<div className="flex items-center gap-2 px-10 text-sm text-muted-foreground">
								<Loader2 className="h-4 w-4 animate-spin" />
								Thinking...
							</div>
						)}
				</div>

				{/* Input */}
				<div className="border-t p-4 space-y-2">
					<div className="flex gap-2">
						<textarea
							ref={inputRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Describe your monetization plan..."
							className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							rows={2}
							disabled={isStreaming}
						/>
					</div>

					<div className="flex items-center justify-between">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClear}
							disabled={messages.length === 0 || isStreaming}
						>
							<Eraser className="mr-1.5 h-3.5 w-3.5" />
							Clear
						</Button>

						<div className="flex gap-2">
							{isStreaming && (
								<Button
									variant="outline"
									size="sm"
									onClick={stopStreaming}
								>
									<Square className="mr-1.5 h-3.5 w-3.5" />
									Stop
								</Button>
							)}
							<Button
								size="sm"
								onClick={handleSend}
								disabled={!input.trim() || isStreaming}
							>
								<Send className="mr-1.5 h-3.5 w-3.5" />
								Send
							</Button>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
