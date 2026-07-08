"use client";

import { Languages } from "lucide-react";
import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
	useListing,
	useUpdateListingTranslationSettings,
} from "@/hooks/use-listings";
import type { ListingFieldName } from "@/lib/types";
import { cn } from "@/lib/utils";

const INSTRUCTIONS_MAX_LENGTH = 1000;

export interface TranslatableField {
	key: ListingFieldName;
	label: string;
}

interface TranslationSettingsProps {
	appId: string;
	language: string;
	fields: TranslatableField[];
	disabled?: boolean;
}

/**
 * Per-language localization controls for AI translation:
 * - "Do Not Translate" toggle per field — collected into `doNotTranslateFields`
 *   (AI field-name vocabulary) so the backend copies them verbatim from source.
 * - free-text `translationInstructions` to steer the AI (tone, glossary, etc.).
 *
 * Reads/writes the draft listing via PUT /api/apps/:appId/listings/:language.
 */
export function TranslationSettings({
	appId,
	language,
	fields,
	disabled = false,
}: TranslationSettingsProps) {
	const listing = useListing(appId, language);
	const update = useUpdateListingTranslationSettings(appId);

	const [doNotTranslate, setDoNotTranslate] = useState<Set<string>>(new Set());
	const [instructions, setInstructions] = useState("");
	const [loadedLanguage, setLoadedLanguage] = useState<string | null>(null);

	// Hydrate local state from server during render (React's recommended pattern
	// for adjusting state when inputs change) so a freshly loaded language —
	// including a language switch — seeds the toggles + instructions once.
	const hydrated = loadedLanguage === language;
	if (!hydrated && listing.data !== undefined) {
		setDoNotTranslate(new Set(listing.data?.doNotTranslateFields ?? []));
		setInstructions(listing.data?.translationInstructions ?? "");
		setLoadedLanguage(language);
	}

	const autoSaveData = useMemo(
		() => ({
			doNotTranslateFields: [...doNotTranslate].sort(),
			translationInstructions: instructions,
		}),
		[doNotTranslate, instructions],
	);

	useAutoSave({
		data: autoSaveData,
		enabled: !disabled && hydrated,
		onSave: (saveData) =>
			update.mutateAsync({
				doNotTranslateFields: saveData.doNotTranslateFields,
				language,
				translationInstructions: saveData.translationInstructions,
			}),
	});

	const toggleField = (key: string, keep: boolean) => {
		setDoNotTranslate((prev) => {
			const next = new Set(prev);
			if (keep) {
				next.add(key);
			} else {
				next.delete(key);
			}
			return next;
		});
	};

	const overLimit = instructions.length > INSTRUCTIONS_MAX_LENGTH;

	return (
		<div className="max-w-2xl space-y-4 rounded-lg border border-border bg-[#1a1a1a] p-4">
			<div className="flex items-center gap-2">
				<Languages className="h-4 w-4 text-muted-foreground" />
				<h2 className="text-sm font-medium">Translation settings</h2>
			</div>
			<p className="text-xs text-muted-foreground">
				Choose which fields should stay untranslated for the{" "}
				<span className="font-medium text-foreground">{language}</span> language,
				and add instructions for the AI.
			</p>

			{/* Per-field "Do Not Translate" toggles */}
			<div className="space-y-2">
				<Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					Do not translate
				</Label>
				<div className="space-y-1.5">
					{fields.map((field) => {
						const id = `dnt-${language}-${field.key}`;
						const checked = doNotTranslate.has(field.key);
						return (
							<div
								className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
								key={field.key}
							>
								<Label
									className="cursor-pointer text-sm font-normal"
									htmlFor={id}
								>
									{field.label}
								</Label>
								<Switch
									checked={checked}
									disabled={disabled}
									id={id}
									onCheckedChange={(value) =>
										toggleField(field.key, value === true)
									}
								/>
							</div>
						);
					})}
				</div>
			</div>

			{/* Translation instructions */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<Label
						className="text-sm font-medium"
						htmlFor={`translation-instructions-${language}`}
					>
						Translation instructions (tone, glossary, what to keep unchanged)
					</Label>
					<span
						className={cn(
							"text-xs tabular-nums",
							overLimit
								? "font-medium text-destructive"
								: "text-muted-foreground",
						)}
					>
						{instructions.length}/{INSTRUCTIONS_MAX_LENGTH}
					</span>
				</div>
				<Textarea
					className={cn(
						"resize-none border-border bg-[#0f0f0f]",
						overLimit && "border-destructive",
					)}
					disabled={disabled}
					id={`translation-instructions-${language}`}
					maxLength={INSTRUCTIONS_MAX_LENGTH}
					onChange={(e) => setInstructions(e.target.value)}
					placeholder="e.g. Keep the brand name unchanged, professional tone, use a friendly voice."
					rows={3}
					value={instructions}
				/>
			</div>
		</div>
	);
}
