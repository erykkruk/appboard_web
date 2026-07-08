"use client";

import { useParams } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { PromptEditor } from "@/components/prompt-editor";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	useAppAiPrompts,
	useDeleteAppAiPrompt,
	useSetAppAiPrompt,
} from "@/hooks/use-app-ai-prompts";
import { useGlobalPrompts } from "@/hooks/use-prompts";

export default function AppSettingsPage() {
	const params = useParams<{ appId: string }>();
	const appId = params.appId;

	const globalPrompts = useGlobalPrompts();
	const appPrompts = useAppAiPrompts(appId);
	const setPrompt = useSetAppAiPrompt(appId);
	const deletePrompt = useDeleteAppAiPrompt(appId);

	// Merge global defaults with app-level overrides
	const mergedPrompts = globalPrompts.data
		? { ...globalPrompts.data }
		: undefined;

	if (mergedPrompts && appPrompts.data) {
		for (const appPrompt of appPrompts.data) {
			const key = `AI_PROMPT_${appPrompt.mode.toUpperCase()}_${appPrompt.field.toUpperCase()}`;
			if (mergedPrompts[key]) {
				mergedPrompts[key] = {
					...mergedPrompts[key],
					customPrompt: appPrompt.prompt,
					isDefault: false,
				};
			}
		}
	}

	const handleSave = async (mode: string, field: string, prompt: string) => {
		await setPrompt.mutateAsync({ mode, field, prompt });
	};

	const handleReset = async (mode: string, field: string) => {
		await deletePrompt.mutateAsync({ mode, field });
	};

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader title="App Settings" />
			<div className="mx-auto w-full max-w-4xl space-y-6 p-6">
				<Card>
					<CardHeader>
						<CardTitle>AI Prompts</CardTitle>
						<CardDescription>
							Customize AI prompts for this app. These override global
							settings. The app&apos;s Information data is automatically
							included as context.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<PromptEditor
							prompts={mergedPrompts}
							onSave={handleSave}
							onReset={handleReset}
							isSaving={setPrompt.isPending}
							isResetting={deletePrompt.isPending}
							isLoading={globalPrompts.isLoading}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
