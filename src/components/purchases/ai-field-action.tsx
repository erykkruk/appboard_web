"use client";

import { useState } from "react";
import { Languages, Loader2, Pencil, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGeneratePurchaseField } from "@/hooks/use-ai";
import { api } from "@/lib/api";
import type { PurchaseFieldName } from "@/lib/types";

interface PurchaseFieldContext {
	appName: string;
	productType?: string;
	productName?: string;
	groupName?: string;
	duration?: string;
	bundleId?: string;
}

export interface AiFieldActionProps {
	appId: string;
	field: PurchaseFieldName;
	context: PurchaseFieldContext;
	currentValue: string;
	language?: string;
	onResult: (value: string) => void;
	otherLocales?: string[];
	onTranslateResults?: (translations: Record<string, string>) => void;
	showTranslate?: boolean;
}

export function AiFieldAction({
	appId,
	field,
	context,
	currentValue,
	language,
	onResult,
	otherLocales,
	onTranslateResults,
	showTranslate = false,
}: AiFieldActionProps) {
	const generate = useGeneratePurchaseField();
	const [translating, setTranslating] = useState(false);

	const isLoading = generate.isPending || translating;
	const hasValue = currentValue.trim().length > 0;
	const canTranslate =
		showTranslate && hasValue && otherLocales && otherLocales.length > 0;

	const handleGenerate = async () => {
		try {
			const res = await generate.mutateAsync({
				appId,
				field,
				context,
				language,
			});
			onResult(res.result);
		} catch {
			toast.error("Failed to generate content");
		}
	};

	const handleImprove = async () => {
		try {
			const res = await generate.mutateAsync({
				appId,
				field,
				context,
				currentValue,
				language,
			});
			onResult(res.result);
		} catch {
			toast.error("Failed to improve content");
		}
	};

	const handleTranslate = async () => {
		if (!otherLocales || !onTranslateResults) return;
		setTranslating(true);
		try {
			const res = await api.ai.translate({
				text: currentValue,
				targetLanguages: otherLocales,
			} as Parameters<typeof api.ai.translate>[0]);
			if (res && typeof res === "object" && "translations" in res) {
				onTranslateResults(
					(res as { translations: Record<string, string> }).translations,
				);
				toast.success(`Translated to ${otherLocales.length} language(s)`);
			}
		} catch {
			toast.error("Failed to translate");
		} finally {
			setTranslating(false);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-6 w-6 shrink-0"
					disabled={isLoading}
				>
					{isLoading ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Sparkles className="h-3.5 w-3.5" />
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={handleGenerate}>
					<Wand2 className="mr-2 h-3.5 w-3.5" />
					Generate
				</DropdownMenuItem>
				{hasValue && (
					<DropdownMenuItem onClick={handleImprove}>
						<Pencil className="mr-2 h-3.5 w-3.5" />
						Improve
					</DropdownMenuItem>
				)}
				{canTranslate && (
					<DropdownMenuItem onClick={handleTranslate}>
						<Languages className="mr-2 h-3.5 w-3.5" />
						Translate to all
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
