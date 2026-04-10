"use client";

import { useMemo } from "react";

import { computeDiff } from "@/lib/diff";
import { cn } from "@/lib/utils";

import { InlineDiff } from "./inline-diff";

interface FieldDiffPanelProps {
	oldValue: string | null | undefined;
	newValue: string | null | undefined;
	className?: string;
}

export function FieldDiffPanel({
	oldValue,
	newValue,
	className,
}: FieldDiffPanelProps) {
	const normalizedOld = oldValue ?? "";
	const normalizedNew = newValue ?? "";

	const { segments, mode } = useMemo(
		() => computeDiff(normalizedOld, normalizedNew),
		[normalizedOld, normalizedNew],
	);

	return (
		<div
			className={cn("rounded-md border border-border bg-card p-3", className)}
		>
			<div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
				<span>Changes</span>
				<span>{mode === "line" ? "Line diff" : "Word diff"}</span>
			</div>
			<InlineDiff
				segments={segments}
				mode={mode === "line" ? "line-by-line" : "inline"}
			/>
		</div>
	);
}
