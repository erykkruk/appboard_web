"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const LISTING_FIELDS = [
	{ key: "title", label: "Title" },
	{ key: "subtitle", label: "Subtitle" },
	{ key: "shortDescription", label: "Short Description" },
	{ key: "description", label: "Description" },
	{ key: "keywords", label: "Keywords" },
	{ key: "promotionalText", label: "Promotional Text" },
	{ key: "whatsNew", label: "What's New" },
] as const;

const MODES = ["generate", "rephrase"] as const;

function getSettingKey(field: string, mode: string): string {
	return `AI_PROMPT_${mode.toUpperCase()}_${field.toUpperCase()}`;
}

interface PromptEntry {
	customPrompt: string | null;
	defaultPrompt: string;
	isDefault: boolean;
}

interface PromptEditorProps {
	prompts: Record<string, PromptEntry> | undefined;
	onSave: (mode: string, field: string, prompt: string) => Promise<void>;
	onReset: (mode: string, field: string) => Promise<void>;
	isSaving: boolean;
	isResetting: boolean;
	isLoading?: boolean;
}

function FieldPromptEditor({
	field,
	mode,
	entry,
	onSave,
	onReset,
	isSaving,
	isResetting,
}: {
	field: string;
	mode: string;
	entry: PromptEntry | undefined;
	onSave: (mode: string, field: string, prompt: string) => Promise<void>;
	onReset: (mode: string, field: string) => Promise<void>;
	isSaving: boolean;
	isResetting: boolean;
}) {
	const [value, setValue] = useState("");
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		setValue(entry?.customPrompt ?? "");
		setDirty(false);
	}, [entry]);

	const handleSave = async () => {
		if (!value.trim()) return;
		try {
			await onSave(mode, field, value.trim());
			setDirty(false);
			toast.success("Prompt saved");
		} catch {
			toast.error("Failed to save prompt");
		}
	};

	const handleReset = async () => {
		try {
			await onReset(mode, field);
			setValue("");
			setDirty(false);
			toast.success("Prompt reset to default");
		} catch {
			toast.error("Failed to reset prompt");
		}
	};

	return (
		<div className="space-y-3">
			<Textarea
				value={value}
				onChange={(e) => {
					setValue(e.target.value);
					setDirty(true);
				}}
				placeholder={entry?.defaultPrompt ?? "Loading default prompt..."}
				rows={8}
				className="font-mono text-xs"
			/>
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					onClick={handleSave}
					disabled={isSaving || !dirty || !value.trim()}
				>
					{isSaving ? (
						<Loader2 className="mr-1 h-3 w-3 animate-spin" />
					) : (
						<Save className="mr-1 h-3 w-3" />
					)}
					Save
				</Button>
				{!entry?.isDefault && (
					<Button
						size="sm"
						variant="outline"
						onClick={handleReset}
						disabled={isResetting}
					>
						{isResetting ? (
							<Loader2 className="mr-1 h-3 w-3 animate-spin" />
						) : (
							<RotateCcw className="mr-1 h-3 w-3" />
						)}
						Reset to Default
					</Button>
				)}
			</div>
		</div>
	);
}

export function PromptEditor({
	prompts,
	onSave,
	onReset,
	isSaving,
	isResetting,
	isLoading,
}: PromptEditorProps) {
	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<Accordion type="single" collapsible className="w-full">
			{LISTING_FIELDS.map(({ key, label }) => {
				const hasCustom = MODES.some((mode) => {
					const settingKey = getSettingKey(key, mode);
					return prompts?.[settingKey] && !prompts[settingKey].isDefault;
				});

				return (
					<AccordionItem key={key} value={key}>
						<AccordionTrigger className="text-sm">
							<div className="flex items-center gap-2">
								{label}
								{hasCustom && (
									<Badge variant="secondary" className="text-xs">
										Custom
									</Badge>
								)}
							</div>
						</AccordionTrigger>
						<AccordionContent>
							<Tabs defaultValue="generate" className="w-full">
								<TabsList className="mb-3">
									<TabsTrigger value="generate">Generate</TabsTrigger>
									<TabsTrigger value="rephrase">Rephrase</TabsTrigger>
								</TabsList>
								{MODES.map((mode) => {
									const settingKey = getSettingKey(key, mode);
									const entry = prompts?.[settingKey];
									return (
										<TabsContent key={mode} value={mode}>
											<FieldPromptEditor
												field={key}
												mode={mode}
												entry={entry}
												onSave={onSave}
												onReset={onReset}
												isSaving={isSaving}
												isResetting={isResetting}
											/>
										</TabsContent>
									);
								})}
							</Tabs>
						</AccordionContent>
					</AccordionItem>
				);
			})}
		</Accordion>
	);
}
