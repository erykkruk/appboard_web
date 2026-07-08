"use client";

import { ChevronRight, Clock, Loader2, Undo2 } from "lucide-react";
import { useState } from "react";

import { FieldDiffPanel } from "@/components/diff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getListingFieldLabel } from "@/lib/field-labels";
import type { HistoryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const PREVIEW_MAX_LENGTH = 60;

interface HistoryTimelineProps {
	entries: HistoryEntry[];
	isLoading?: boolean;
	onRollback?: (entryId: string) => void;
	rollbackPendingId?: string | null;
	className?: string;
}

interface HistoryGroup {
	key: string;
	timestamp: Date;
	entries: HistoryEntry[];
}

function truncate(value: string | undefined | null, max: number): string {
	if (!value) return "(empty)";
	const single = value.replace(/\s+/g, " ").trim();
	if (single.length === 0) return "(empty)";
	if (single.length <= max) return single;
	return `${single.slice(0, max - 1)}…`;
}

function getGroupTimestamp(entry: HistoryEntry): Date {
	const raw = entry.publishedAt ?? entry.createdAt;
	return new Date(raw);
}

function truncateToMinute(date: Date): number {
	return Math.floor(date.getTime() / 60000) * 60000;
}

function formatGroupHeader(date: Date): string {
	// Native, no date-fns — "Mar 12, 2025 · 14:32"
	const dateStr = date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const timeStr = date.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${dateStr} · ${timeStr}`;
}

function groupEntries(entries: HistoryEntry[]): HistoryGroup[] {
	const groups = new Map<number, HistoryGroup>();

	for (const entry of entries) {
		const ts = getGroupTimestamp(entry);
		const key = truncateToMinute(ts);

		const existing = groups.get(key);
		if (existing) {
			existing.entries.push(entry);
		} else {
			groups.set(key, {
				key: String(key),
				timestamp: new Date(key),
				entries: [entry],
			});
		}
	}

	// newest first
	return Array.from(groups.values()).sort(
		(a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
	);
}

export function HistoryTimeline({
	entries,
	isLoading,
	onRollback,
	rollbackPendingId,
	className,
}: HistoryTimelineProps) {
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const toggleExpanded = (entryId: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(entryId)) {
				next.delete(entryId);
			} else {
				next.add(entryId);
			}
			return next;
		});
	};

	if (isLoading) {
		return (
			<ScrollArea className={cn("h-full", className)}>
				<div className="space-y-4 p-4">
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							className="space-y-2 rounded-md border border-border bg-card p-3"
						>
							<Skeleton className="h-3 w-32" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					))}
				</div>
			</ScrollArea>
		);
	}

	if (!entries || entries.length === 0) {
		return (
			<div
				className={cn(
					"flex h-full flex-col items-center justify-center gap-2 p-8 text-muted-foreground",
					className,
				)}
			>
				<Clock className="h-8 w-8 opacity-50" />
				<p className="text-sm">No changes yet</p>
			</div>
		);
	}

	const groups = groupEntries(entries);

	return (
		<ScrollArea className={cn("h-full", className)}>
			<div className="space-y-4 p-4">
				{groups.map((group) => (
					<div
						key={group.key}
						className="space-y-2 rounded-md border border-border bg-card p-3"
					>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<Clock className="h-3 w-3" />
							<span>{formatGroupHeader(group.timestamp)}</span>
							<span className="ml-auto">
								{group.entries.length}{" "}
								{group.entries.length === 1 ? "change" : "changes"}
							</span>
						</div>
						<div className="space-y-1">
							{group.entries.map((entry) => {
								const isPending = rollbackPendingId === entry.id;
								const isExpanded = expandedIds.has(entry.id);
								return (
									<div
										key={entry.id}
										className="rounded border border-border/50 bg-background/40 text-xs"
									>
										<div className="flex items-start gap-2 p-2">
											<button
												type="button"
												onClick={() => toggleExpanded(entry.id)}
												aria-expanded={isExpanded}
												className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded text-left transition-colors hover:bg-accent/40"
											>
												<ChevronRight
													className={cn(
														"mt-0.5 h-3 w-3 shrink-0 text-muted-foreground transition-transform",
														isExpanded && "rotate-90",
													)}
												/>
												<Badge
													variant="outline"
													className="shrink-0 text-[10px] uppercase"
												>
													{entry.language}
												</Badge>
												<div className="min-w-0 flex-1 space-y-0.5">
													<div className="font-medium text-foreground">
														{getListingFieldLabel(entry.field)}
													</div>
													{!isExpanded && (
														<div className="flex items-center gap-1.5 text-muted-foreground">
															<span
																className="truncate line-through text-red-400/80"
																title={entry.oldValue ?? ""}
															>
																{truncate(entry.oldValue, PREVIEW_MAX_LENGTH)}
															</span>
															<span className="shrink-0">→</span>
															<span
																className="truncate text-green-400/80"
																title={entry.newValue ?? ""}
															>
																{truncate(entry.newValue, PREVIEW_MAX_LENGTH)}
															</span>
														</div>
													)}
												</div>
											</button>
											{onRollback && (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-7 shrink-0 px-2"
													onClick={(e) => {
														e.stopPropagation();
														onRollback(entry.id);
													}}
													disabled={isPending}
													aria-label={`Rollback ${getListingFieldLabel(entry.field)}`}
												>
													{isPending ? (
														<Loader2 className="h-3 w-3 animate-spin" />
													) : (
														<Undo2 className="h-3 w-3" />
													)}
												</Button>
											)}
										</div>
										{isExpanded && (
											<div className="px-2 pb-2">
												<FieldDiffPanel
													oldValue={entry.oldValue ?? ""}
													newValue={entry.newValue ?? ""}
												/>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>
		</ScrollArea>
	);
}
