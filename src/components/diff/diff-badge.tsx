"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DiffBadgeProps {
	originalValue?: string | null;
	className?: string;
	onClick?: () => void;
}

const MAX_TOOLTIP_LENGTH = 80;

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return `${value.slice(0, max - 1)}…`;
}

export function DiffBadge({ originalValue, className, onClick }: DiffBadgeProps) {
	const tooltipText = originalValue
		? `Original: ${truncate(originalValue, MAX_TOOLTIP_LENGTH)}`
		: "Original: (empty)";

	const button = (
		<button
			type="button"
			onClick={onClick}
			aria-label="Show original value"
			className={cn(
				"inline-flex h-3 w-3 items-center justify-center rounded-full transition-opacity hover:opacity-80 cursor-pointer",
				className,
			)}
		>
			<span className="h-2 w-2 rounded-full bg-amber-400" />
		</button>
	);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent>
					<p className="max-w-xs break-words">{tooltipText}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
