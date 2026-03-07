"use client";

import { useMemo, useState } from "react";
import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Loader2,
	Package,
	Pencil,
	Repeat,
	Sparkles,
	Trash2,
	User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractPlan } from "@/hooks/use-monetization-chat";
import { cn } from "@/lib/utils";

interface MonetizationMessageProps {
	content: string;
	isExecuting: boolean;
	onExecutePlan: (plan: NonNullable<ReturnType<typeof extractPlan>>) => void;
	planExecuted: boolean;
	role: "assistant" | "user";
}

function PriceList({
	prices,
}: { prices: Array<{ currency: string; price: string; territory: string }> }) {
	if (prices.length === 0) return null;
	return (
		<div className="space-y-0.5">
			<span className="text-xs font-medium text-foreground/70">Prices</span>
			<div className="flex flex-wrap gap-1.5">
				{prices.map((p) => (
					<span
						key={p.territory}
						className="rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums"
					>
						{p.territory}: {p.price} {p.currency}
					</span>
				))}
			</div>
		</div>
	);
}

function LocalizationList({
	localizations,
}: {
	localizations: Array<{
		description?: string;
		language: string;
		name?: string;
	}>;
}) {
	if (localizations.length === 0) return null;
	return (
		<div className="space-y-0.5">
			<span className="text-xs font-medium text-foreground/70">
				Localizations
			</span>
			<div className="space-y-1">
				{localizations.map((l) => (
					<div key={l.language} className="text-xs">
						<span className="rounded bg-muted px-1.5 py-0.5 font-medium">
							{l.language}
						</span>
						{l.name && (
							<span className="ml-1.5 text-muted-foreground">{l.name}</span>
						)}
						{l.description && (
							<span className="ml-1.5 text-muted-foreground/70">
								— {l.description}
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function ExpandableItem({
	children,
	details,
	icon,
	label,
	labelClassName,
	rightContent,
}: {
	children?: React.ReactNode;
	details: React.ReactNode;
	icon: React.ReactNode;
	label: string;
	labelClassName?: string;
	rightContent?: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const hasDetails = details !== null;

	if (!hasDetails) {
		return (
			<div
				className={cn(
					"flex items-center gap-2 text-muted-foreground",
					labelClassName,
				)}
			>
				{icon}
				<span className="truncate">{label}</span>
				{rightContent}
			</div>
		);
	}

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-1 -mx-1 py-0.5 hover:bg-muted/50 transition-colors">
				<span className="text-muted-foreground/50">
					{open ? (
						<ChevronDown className="h-3 w-3" />
					) : (
						<ChevronRight className="h-3 w-3" />
					)}
				</span>
				<span className={cn("text-muted-foreground", labelClassName)}>
					{icon}
				</span>
				<span
					className={cn(
						"truncate text-left text-muted-foreground",
						labelClassName,
					)}
				>
					{label}
				</span>
				{rightContent}
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="ml-[1.625rem] mt-1 space-y-1.5 border-l border-border/50 pl-3 pb-1">
					{details}
					{children}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
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

			<div className="space-y-1.5 text-sm">
				{plan.groups?.map((group) => (
					<ExpandableItem
						key={group.name}
						icon={<Repeat className="h-3.5 w-3.5 shrink-0" />}
						label={`Group: ${group.name}`}
						labelClassName="font-medium"
						details={
							group.subscriptions.length > 0 ? (
								<div className="space-y-2">
									{group.subscriptions.map((sub) => (
										<ExpandableItem
											key={sub.productId}
											icon={<Repeat className="h-3 w-3 shrink-0" />}
											label={sub.name}
											rightContent={
												sub.prices?.[0] && (
													<span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
														{sub.prices[0].price} {sub.prices[0].currency}
													</span>
												)
											}
											details={
												(sub.prices && sub.prices.length > 0) ||
												(sub.localizations && sub.localizations.length > 0) ? (
													<>
														<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
															<span className="rounded bg-muted px-1.5 py-0.5">
																{sub.productId}
															</span>
															<span>{sub.duration}</span>
														</div>
														{sub.prices && sub.prices.length > 0 && (
															<PriceList prices={sub.prices} />
														)}
														{sub.localizations &&
															sub.localizations.length > 0 && (
																<LocalizationList
																	localizations={sub.localizations}
																/>
															)}
													</>
												) : (
													<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
														<span className="rounded bg-muted px-1.5 py-0.5">
															{sub.productId}
														</span>
														<span>{sub.duration}</span>
													</div>
												)
											}
										/>
									))}
								</div>
							) : null
						}
					/>
				))}

				{plan.purchases?.map((p) => (
					<ExpandableItem
						key={p.productId}
						icon={<Package className="h-3.5 w-3.5 shrink-0" />}
						label={p.name}
						labelClassName="font-medium"
						rightContent={
							p.prices?.[0] && (
								<span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
									{p.prices[0].price} {p.prices[0].currency}
								</span>
							)
						}
						details={
							<>
								<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<span className="rounded bg-muted px-1.5 py-0.5">
										{p.productId}
									</span>
									<span>{p.productType}</span>
								</div>
								{p.prices && p.prices.length > 0 && (
									<PriceList prices={p.prices} />
								)}
								{p.localizations && p.localizations.length > 0 && (
									<LocalizationList localizations={p.localizations} />
								)}
							</>
						}
					/>
				))}

				{plan.edits?.map((e) => (
					<ExpandableItem
						key={e.purchaseId}
						icon={<Pencil className="h-3.5 w-3.5 shrink-0" />}
						label={`Edit: ${e.name ?? e.purchaseId}`}
						details={
							(e.prices && e.prices.length > 0) ||
							(e.localizations && e.localizations.length > 0) ||
							e.name ? (
								<>
									{e.name && (
										<div className="text-xs text-muted-foreground">
											<span className="font-medium text-foreground/70">
												Name:
											</span>{" "}
											{e.name}
										</div>
									)}
									{e.prices && e.prices.length > 0 && (
										<PriceList prices={e.prices} />
									)}
									{e.localizations && e.localizations.length > 0 && (
										<LocalizationList localizations={e.localizations} />
									)}
								</>
							) : null
						}
					/>
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
