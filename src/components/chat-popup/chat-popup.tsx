"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Loader2, Maximize2, Minimize2, Send, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatPopupProps {
	title: string;
	description?: string;
	icon?: React.ReactNode;
	headerExtra?: React.ReactNode;
	messages: Array<{ role: "user" | "assistant"; content: string }>;
	isStreaming: boolean;
	isLoadingHistory?: boolean;
	maxMessages: number;
	onSend: (message: string) => void;
	onStop: () => void;
	onClear: () => void;
	messageRenderer?: (
		msg: { role: "user" | "assistant"; content: string },
		index: number,
	) => React.ReactNode;
	inputPlaceholder?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ChatPopup({
	title,
	description,
	icon,
	headerExtra,
	messages,
	isStreaming,
	isLoadingHistory,
	maxMessages,
	onSend,
	onStop,
	onClear,
	messageRenderer,
	inputPlaceholder = "Type a message...",
	open,
	onOpenChange,
}: ChatPopupProps) {
	const [input, setInput] = useState("");
	const [expanded, setExpanded] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const isLimitReached = messages.length >= maxMessages;

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	useEffect(() => {
		if (open) {
			setTimeout(() => inputRef.current?.focus(), 150);
		}
	}, [open]);

	const handleSend = useCallback(() => {
		const trimmed = input.trim();
		if (!trimmed || isStreaming || isLimitReached) return;
		setInput("");
		onSend(trimmed);
	}, [input, isStreaming, isLimitReached, onSend]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	const defaultMessageRenderer = (
		msg: { role: "user" | "assistant"; content: string },
		index: number,
	) => (
		<div
			key={index}
			className={cn(
				"max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
				msg.role === "user"
					? "ml-auto bg-primary text-primary-foreground"
					: "mr-auto bg-muted text-foreground",
			)}
		>
			{msg.content}
		</div>
	);

	const renderMessage = messageRenderer ?? defaultMessageRenderer;

	return (
		<div
			data-state={open ? "open" : "closed"}
			className={cn(
				"fixed z-50 flex flex-col rounded-xl border bg-background shadow-xl transition-all duration-300 ease-in-out",
				"data-[state=open]:translate-y-0 data-[state=open]:opacity-100",
				"data-[state=closed]:pointer-events-none data-[state=closed]:translate-y-4 data-[state=closed]:opacity-0",
				expanded
					? "top-0 right-0 bottom-0 w-1/2 rounded-l-xl rounded-r-none"
					: "right-4 bottom-20 h-[500px] w-[400px]",
			)}
		>
			{/* Header */}
			<div className="flex items-center gap-2 border-b px-4 py-3">
				{icon && (
					<span className="flex shrink-0 items-center">{icon}</span>
				)}
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-sm font-semibold">{title}</h3>
					{description && (
						<p className="truncate text-xs text-muted-foreground">
							{description}
						</p>
					)}
				</div>
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => setExpanded(!expanded)}
					aria-label={expanded ? "Minimize" : "Expand"}
				>
					{expanded ? (
						<Minimize2 className="h-3.5 w-3.5" />
					) : (
						<Maximize2 className="h-3.5 w-3.5" />
					)}
				</Button>
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => onOpenChange(false)}
				>
					<X />
				</Button>
			</div>

			{/* Header extra slot */}
			{headerExtra}

			{/* Messages */}
			<div
				ref={scrollRef}
				className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
			>
				{isLoadingHistory && (
					<div className="flex h-full items-center justify-center">
						<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
					</div>
				)}

				{!isLoadingHistory && messages.length === 0 && (
					<div className="flex h-full items-center justify-center">
						<p className="max-w-[240px] text-center text-sm text-muted-foreground">
							No messages yet. Start a conversation.
						</p>
					</div>
				)}

				{!isLoadingHistory &&
					messages.map((msg, i) => renderMessage(msg, i))}

				{isStreaming &&
					messages[messages.length - 1]?.content === "" && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Thinking...
						</div>
					)}
			</div>

			{/* Input */}
			<div className="space-y-2 border-t p-3">
				{isLimitReached && (
					<p className="text-center text-xs text-muted-foreground">
						Message limit reached. Clear conversation to continue.
					</p>
				)}
				<div className="flex gap-2">
					<textarea
						ref={inputRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={
							isLimitReached
								? "Message limit reached"
								: inputPlaceholder
						}
						className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
						rows={expanded ? 3 : 2}
						disabled={isStreaming || isLimitReached}
					/>
				</div>

				<div className="flex items-center justify-between">
					<Button
						variant="ghost"
						size="sm"
						onClick={onClear}
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
								onClick={onStop}
							>
								<Square className="mr-1.5 h-3.5 w-3.5" />
								Stop
							</Button>
						)}
						<Button
							size="sm"
							onClick={handleSend}
							disabled={
								!input.trim() || isStreaming || isLimitReached
							}
						>
							<Send className="mr-1.5 h-3.5 w-3.5" />
							Send
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
