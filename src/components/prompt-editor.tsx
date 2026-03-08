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

function defaultGetSettingKey(field: string, mode: string): string {
	return `AI_PROMPT_${mode.toUpperCase()}_${field.toUpperCase()}`;
}

interface PromptEntry {
	customPrompt: string | null;
	defaultPrompt: string;
	isDefault: boolean;
}

export type { PromptEntry };

interface PromptEditorProps {
	prompts: Record<string, PromptEntry> | undefined;
	onSave: (mode: string, field: string, prompt: string) => Promise<void>;
	onReset: (mode: string, field: string) => Promise<void>;
	isSaving: boolean;
	isResetting: boolean;
	isLoading?: boolean;
	fields?: ReadonlyArray<{ key: string; label: string; description?: string }>;
	modes?: readonly string[];
	getSettingKey?: (field: string, mode: string) => string;
	description?: string;
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

	const baseValue = entry?.customPrompt ?? entry?.defaultPrompt ?? "";

	useEffect(() => {
		setValue(baseValue);
	}, [baseValue]);

	const dirty = value !== baseValue && value.trim() !== "";

	const handleSave = async () => {
		if (!value.trim()) return;
		try {
			await onSave(mode, field, value.trim());
			toast.success("Prompt saved");
		} catch {
			toast.error("Failed to save prompt");
		}
	};

	const handleReset = async () => {
		try {
			await onReset(mode, field);
			setValue(entry?.defaultPrompt ?? "");
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
				}}
				rows={8}
				className="font-mono text-xs"
			/>
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					onClick={handleSave}
					disabled={isSaving || !dirty}
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
	fields = LISTING_FIELDS,
	modes = MODES,
	getSettingKey = defaultGetSettingKey,
	description = "These prompts define the AI\u2019s behavior for each listing field. Data from the app\u2019s Information page (category, features, audience, tone, keywords, etc.) is automatically included in every AI request \u2014 no need to repeat it here.",
}: PromptEditorProps) {
	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const hasModes = modes.length > 1;

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">{description}</p>
			<Accordion type="single" collapsible className="w-full">
			{fields.map(({ key, label, description: fieldDesc }) => {
				const hasCustom = modes.some((mode) => {
					const settingKey = getSettingKey(key, mode);
					return prompts?.[settingKey] && !prompts[settingKey].isDefault;
				});

				return (
					<AccordionItem key={key} value={key}>
						<AccordionTrigger className="text-sm">
							<div className="flex items-center gap-2">
								<div className="text-left">
									{label}
									{fieldDesc && (
										<span className="ml-2 text-xs font-normal text-muted-foreground">
											{fieldDesc}
										</span>
									)}
								</div>
								{hasCustom && (
									<Badge variant="secondary" className="text-xs">
										Custom
									</Badge>
								)}
							</div>
						</AccordionTrigger>
						<AccordionContent>
							{hasModes ? (
								<Tabs defaultValue={modes[0]} className="w-full">
									<TabsList className="mb-3">
										{modes.map((mode) => (
											<TabsTrigger key={mode} value={mode} className="capitalize">
												{mode}
											</TabsTrigger>
										))}
									</TabsList>
									{modes.map((mode) => {
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
							) : (
								<FieldPromptEditor
									field={key}
									mode={modes[0]}
									entry={prompts?.[getSettingKey(key, modes[0])]}
									onSave={onSave}
									onReset={onReset}
									isSaving={isSaving}
									isResetting={isResetting}
								/>
							)}
						</AccordionContent>
					</AccordionItem>
				);
			})}
			</Accordion>
		</div>
	);
}
