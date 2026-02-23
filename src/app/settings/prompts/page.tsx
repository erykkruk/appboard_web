"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PromptEditor } from "@/components/prompt-editor";
import {
  useDeleteGlobalPrompt,
  useGlobalPrompts,
  useSetGlobalPrompt,
} from "@/hooks/use-prompts";

export default function SettingsPromptsPage() {
  const globalPrompts = useGlobalPrompts();
  const setGlobalPrompt = useSetGlobalPrompt();
  const deleteGlobalPrompt = useDeleteGlobalPrompt();

  const handleSavePrompt = async (mode: string, field: string, prompt: string) => {
    await setGlobalPrompt.mutateAsync({ mode, field, prompt });
  };

  const handleResetPrompt = async (mode: string, field: string) => {
    await deleteGlobalPrompt.mutateAsync({ mode, field });
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Prompts</CardTitle>
          <CardDescription>
            Customize the default AI prompts used for generating and rephrasing listing fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromptEditor
            prompts={globalPrompts.data}
            onSave={handleSavePrompt}
            onReset={handleResetPrompt}
            isSaving={setGlobalPrompt.isPending}
            isResetting={deleteGlobalPrompt.isPending}
            isLoading={globalPrompts.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
