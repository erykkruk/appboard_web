"use client";

import type { DiffSegment } from "@/lib/diff";
import { cn } from "@/lib/utils";

interface InlineDiffProps {
	segments: DiffSegment[];
	mode?: "inline" | "line-by-line";
	className?: string;
}

export function InlineDiff({
	segments,
	mode = "inline",
	className,
}: InlineDiffProps) {
	if (mode === "inline") {
		return (
			<span className={cn("whitespace-pre-wrap break-words text-sm", className)}>
				{segments.map((segment, index) => {
					if (segment.type === "equal") {
						return (
							<span key={`eq-${index}`} className="text-foreground">
								{segment.value}
							</span>
						);
					}
					if (segment.type === "added") {
						return (
							<span
								key={`add-${index}`}
								className="rounded px-0.5 bg-green-500/20 text-green-400"
							>
								{segment.value}
							</span>
						);
					}
					return (
						<span
							key={`rem-${index}`}
							className="rounded px-0.5 bg-red-500/20 text-red-400 line-through"
						>
							{segment.value}
						</span>
					);
				})}
			</span>
		);
	}

	// line-by-line mode
	const rows: Array<{
		type: DiffSegment["type"];
		line: string;
		key: string;
	}> = [];

	segments.forEach((segment, segIndex) => {
		const lines = segment.value.split("\n");
		lines.forEach((line, lineIndex) => {
			rows.push({
				type: segment.type,
				line,
				key: `${segIndex}-${lineIndex}`,
			});
		});
	});

	return (
		<div
			className={cn(
				"font-mono text-xs whitespace-pre-wrap break-words",
				className,
			)}
		>
			{rows.map((row) => {
				const prefix =
					row.type === "added" ? "+" : row.type === "removed" ? "-" : " ";
				const rowClass =
					row.type === "added"
						? "bg-green-500/10 text-green-400"
						: row.type === "removed"
							? "bg-red-500/10 text-red-400 line-through"
							: "text-muted-foreground";

				return (
					<div key={row.key} className={cn("flex", rowClass)}>
						<span className="w-4 shrink-0 select-none text-center">
							{prefix}
						</span>
						<span className="flex-1">{row.line}</span>
					</div>
				);
			})}
		</div>
	);
}
