"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ChatPopupTriggerProps {
	icon?: React.ReactNode;
	onClick: () => void;
	label?: string;
}

export function ChatPopupTrigger({
	icon,
	onClick,
	label = "Open chat",
}: ChatPopupTriggerProps) {
	return (
		<Button
			onClick={onClick}
			size="icon-lg"
			className="fixed right-4 bottom-4 z-50 h-12 w-12 rounded-full shadow-lg transition-transform hover:scale-105"
			aria-label={label}
		>
			{icon ?? <Sparkles className="size-5" />}
		</Button>
	);
}
