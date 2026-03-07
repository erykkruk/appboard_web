"use client";

import { useMemo } from "react";
import {
	CheckCircle2,
	Loader2,
	Package,
	Pencil,
	Repeat,
	Sparkles,
	Trash2,
	User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { extractPlan } from "@/hooks/use-monetization-chat";
import { cn } from "@/lib/utils";

interface MonetizationMessageProps {
	content: string;
	isExecuting: boolean;
	onExecutePlan: (plan: NonNullable<ReturnType<typeof extractPlan>>) => void;
	planExecuted: boolean;
	role: "assistant" | "user";
}

function PlanPreview({
	plan,
	onExecute,
	isExecuting,
	planExecuted,
}: {
	plan: NonNullable<ReturnType<typeof extractPlan>>;
	onExecute: () => void;
	isExecuting: boolean;
	planExecuted: boolean;
}) {
	const totalGroups = plan.groups?.length ?? 0;
	const totalSubs =
		plan.groups?.reduce((acc, g) => acc + g.subscriptions.length, 0) ?? 0;
	const totalPurchases = plan.purchases?.length ?? 0;
	const totalEdits = plan.edits?.length ?? 0;
	const totalDeletes = plan.deletes?.length ?? 0;

	return (
		<div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
			<div className="flex items-center gap-2 text-sm font-medium text-primary">
				<Sparkles className="h-4 w-4 shrink-0" />
				Monetization Plan
			</div>

			<div className="space-y-2.5 text-sm">
				{plan.groups?.map((group) => (
					<div key={group.name} className="space-y-1.5">
						<div className="flex items-center gap-2 font-medium">
							<Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							<span className="truncate">Group: {group.name}</span>
						</div>
						{group.subscriptions.map((sub) => (
							<div
								key={sub.productId}
								className="ml-6 space-y-0.5 text-muted-foreground"
							>
								<div className="flex items-baseline justify-between gap-2">
									<span className="min-w-0 truncate font-medium">
										{sub.name}
									</span>
									{sub.prices?.[0] && (
										<span className="shrink-0 text-xs tabular-nums">
											{sub.prices[0].price} {sub.prices[0].currency}
										</span>
									)}
								</div>
								<div className="flex items-center gap-1.5">
									<span className="truncate rounded bg-muted px-1.5 py-0.5 text-xs">
										{sub.productId}
									</span>
									<span className="shrink-0 text-xs">{sub.duration}</span>
								</div>
							</div>
						))}
					</div>
				))}

				{plan.purchases?.map((p) => (
					<div key={p.productId} className="space-y-0.5">
						<div className="flex items-baseline justify-between gap-2">
							<div className="flex min-w-0 items-center gap-2">
								<Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
								<span className="truncate font-medium">{p.name}</span>
							</div>
							{p.prices?.[0] && (
								<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
									{p.prices[0].price} {p.prices[0].currency}
								</span>
							)}
						</div>
						<div className="ml-6 flex items-center gap-1.5">
							<span className="truncate rounded bg-muted px-1.5 py-0.5 text-xs">
								{p.productId}
							</span>
							<span className="shrink-0 text-xs text-muted-foreground">
								{p.productType}
							</span>
						</div>
					</div>
				))}

				{plan.edits?.map((e) => (
					<div
						key={e.purchaseId}
						className="flex items-center gap-2 text-muted-foreground"
					>
						<Pencil className="h-3.5 w-3.5 shrink-0" />
						<span className="truncate">
							Edit: {e.name ?? e.purchaseId}
						</span>
					</div>
				))}

				{plan.deletes?.map((id) => (
					<div
						key={id}
						className="flex items-center gap-2 text-destructive"
					>
						<Trash2 className="h-3.5 w-3.5 shrink-0" />
						<span className="truncate">Delete: {id}</span>
					</div>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
				{totalGroups > 0 && <span>{totalGroups} groups</span>}
				{totalSubs > 0 && <span>{totalSubs} subscriptions</span>}
				{totalPurchases > 0 && <span>{totalPurchases} IAPs</span>}
				{totalEdits > 0 && <span>{totalEdits} edits</span>}
				{totalDeletes > 0 && <span>{totalDeletes} deletes</span>}
			</div>

			{planExecuted ? (
				<div className="flex items-center gap-2 text-sm text-green-500">
					<CheckCircle2 className="h-4 w-4" />
					Plan executed
				</div>
			) : (
				<Button
					size="sm"
					onClick={onExecute}
					disabled={isExecuting}
					className="relative z-10"
				>
					{isExecuting ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Sparkles className="mr-2 h-4 w-4" />
					)}
					Execute Plan
				</Button>
			)}
		</div>
	);
}

export function MonetizationMessage({
	content,
	role,
	onExecutePlan,
	isExecuting,
	planExecuted,
}: MonetizationMessageProps) {
	const plan = useMemo(() => extractPlan(content), [content]);

	// Strip the plan block from display content
	const displayContent = useMemo(
		() =>
			content
				.replace(/```monetization_plan\s*\n[\s\S]*?\n```/g, "")
				.trim(),
		[content],
	);

	return (
		<div
			className={cn(
				"flex gap-3",
				role === "user" ? "flex-row-reverse" : "flex-row",
			)}
		>
			<div
				className={cn(
					"flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
					role === "user"
						? "bg-primary text-primary-foreground"
						: "bg-muted",
				)}
			>
				{role === "user" ? (
					<User className="h-4 w-4" />
				) : (
					<Sparkles className="h-4 w-4" />
				)}
			</div>

			<div
				className={cn(
					"min-w-0 max-w-[85%] rounded-lg px-4 py-3 text-sm",
					role === "user"
						? "bg-primary text-primary-foreground"
						: "bg-muted",
				)}
			>
				{displayContent && (
					<div className="whitespace-pre-wrap">{displayContent}</div>
				)}
				{plan && (
					<PlanPreview
						plan={plan}
						onExecute={() => onExecutePlan(plan)}
						isExecuting={isExecuting}
						planExecuted={planExecuted}
					/>
				)}
			</div>
		</div>
	);
}
