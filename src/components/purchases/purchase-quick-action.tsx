"use client";

import { useCallback, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PlanPreview } from "@/components/monetization-planner/monetization-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/use-settings";
import { api } from "@/lib/api";
import type { MonetizationPlan, QuickActionFocusContext } from "@/lib/types";

interface PurchaseQuickActionProps {
	appId: string;
	focusContext: QuickActionFocusContext;
}

export function PurchaseQuickAction({
	appId,
	focusContext,
}: PurchaseQuickActionProps) {
	const { data: settings } = useSettings();
	const primaryTerritory = settings?.primary_territory || "US";

	const [instruction, setInstruction] = useState("");
	const [result, setResult] = useState<{
		explanation: string;
		plan: MonetizationPlan | null;
	} | null>(null);
	const [planExecuted, setPlanExecuted] = useState(false);
	const queryClient = useQueryClient();

	const generatePlan = useMutation({
		mutationFn: (input: string) =>
			api.ai.quickAction({
				appId,
				focusContext,
				instruction: input,
			}),
		onSuccess: (data) => {
			setResult(data);
			setPlanExecuted(false);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Failed to generate plan",
			);
		},
	});

	const executePlan = useMutation({
		mutationFn: (plan: MonetizationPlan) =>
			api.ai.monetizationExecute(appId, plan),
		onSuccess: (results) => {
			setPlanExecuted(true);
			queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
			queryClient.invalidateQueries({ queryKey: ["purchase", appId] });
			queryClient.invalidateQueries({
				queryKey: ["subscription-group", appId],
			});
			queryClient.invalidateQueries({ queryKey: ["group-localizations"] });
			queryClient.invalidateQueries({ queryKey: ["group-availability"] });
			queryClient.invalidateQueries({ queryKey: ["group-review-info"] });

			const parts: string[] = [];
			if (results.created.length > 0)
				parts.push(`${results.created.length} created`);
			if (results.edited.length > 0)
				parts.push(`${results.edited.length} edited`);
			if (results.deleted.length > 0)
				parts.push(`${results.deleted.length} deleted`);
			if (results.failed.length > 0)
				parts.push(`${results.failed.length} failed`);

			const summary = parts.join(", ") || "No changes";

			if (results.failed.length > 0) {
				const failedDetails = results.failed
					.map((f: { item: string; error: string }) => `• ${f.item}: ${f.error}`)
					.join("\n");
				toast.error(`Plan executed with errors: ${summary}`, {
					description: failedDetails,
					duration: 8000,
				});
			} else {
				toast.success(`Plan executed: ${summary}`);
			}
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to execute plan",
			);
		},
	});

	const handleSubmit = useCallback(() => {
		const trimmed = instruction.trim();
		if (!trimmed || generatePlan.isPending) return;
		generatePlan.mutate(trimmed);
	}, [instruction, generatePlan]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	const handleReset = () => {
		setResult(null);
		setInstruction("");
		setPlanExecuted(false);
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Sparkles className="h-4 w-4 text-primary" />
					AI Quick Action
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="flex gap-2">
					<Input
						value={instruction}
						onChange={(e) => setInstruction(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={`e.g. "Set price to $4.99 for US" or "Improve all localization descriptions"`}
						disabled={generatePlan.isPending}
					/>
					<Button
						size="sm"
						onClick={handleSubmit}
						disabled={!instruction.trim() || generatePlan.isPending}
						className="shrink-0"
					>
						{generatePlan.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="h-4 w-4" />
						)}
					</Button>
				</div>

				{result && (
					<div className="space-y-3">
						{result.explanation && (
							<p className="text-sm text-muted-foreground whitespace-pre-wrap">
								{result.explanation}
							</p>
						)}
						{result.plan && (
							<PlanPreview
								plan={result.plan}
								onExecute={() => executePlan.mutate(result.plan!)}
								isExecuting={executePlan.isPending}
								planExecuted={planExecuted}
								primaryTerritory={primaryTerritory}
							/>
						)}
						{planExecuted && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleReset}
								className="text-xs"
							>
								<X className="mr-1 h-3 w-3" />
								Clear
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
