"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonetizationGuide } from "@/components/monetization-guide";
import { PromptEditor } from "@/components/prompt-editor";
import {
  useDeleteMonetizationPrompt,
  useDeletePurchasePrompt,
  useMonetizationPrompts,
  usePurchasePrompts,
  useSetMonetizationPrompt,
  useSetPurchasePrompt,
} from "@/hooks/use-monetization-prompts";

const MONETIZATION_CHAT_FIELDS = [
  {
    key: "monetizationRole",
    label: "Role & Expertise",
    description: "AI's role and decision-making framework",
  },
  {
    key: "monetizationKnowledge",
    label: "Product Knowledge",
    description: "Product types, pricing tiers, category matrix",
  },
  {
    key: "pricingRules",
    label: "Pricing Rules",
    description: "PPP tiers, pricing psychology",
  },
  {
    key: "conversationGuidelines",
    label: "Conversation Guidelines",
    description: "AI behavior and response format",
  },
] as const;

const PURCHASE_FIELDS = [
  { key: "purchaseName", label: "Purchase Name", description: "Max 30 characters" },
  { key: "purchaseDescription", label: "Purchase Description", description: "Max 45 characters" },
  { key: "reviewNotes", label: "Review Notes", description: "For App Store review team" },
  { key: "productId", label: "Product ID", description: "Reverse-domain format" },
  { key: "groupName", label: "Group Name", description: "Max 30 characters" },
  { key: "groupDescription", label: "Group Description", description: "Max 45 characters" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getMonetizationSettingKey(field: string, _mode: string): string {
  return `AI_PROMPT_CHAT_${field.toUpperCase()}`;
}

function getPurchaseSettingKey(field: string, mode: string): string {
  return `AI_PROMPT_${mode.toUpperCase()}_${field.toUpperCase()}`;
}

export default function SettingsMonetizationPage() {
  const monetizationPrompts = useMonetizationPrompts();
  const purchasePrompts = usePurchasePrompts();
  const setMonetizationPrompt = useSetMonetizationPrompt();
  const deleteMonetizationPrompt = useDeleteMonetizationPrompt();
  const setPurchasePrompt = useSetPurchasePrompt();
  const deletePurchasePrompt = useDeletePurchasePrompt();

  const handleSaveMonetization = async (_mode: string, field: string, prompt: string) => {
    await setMonetizationPrompt.mutateAsync({ field, prompt });
  };

  const handleResetMonetization = async (_mode: string, field: string) => {
    await deleteMonetizationPrompt.mutateAsync({ field });
  };

  const handleSavePurchase = async (mode: string, field: string, prompt: string) => {
    await setPurchasePrompt.mutateAsync({ mode, field, prompt });
  };

  const handleResetPurchase = async (mode: string, field: string) => {
    await deletePurchasePrompt.mutateAsync({ mode, field });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Tabs defaultValue="prompts">
        <TabsList>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="guide">Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monetization Chat Prompts</CardTitle>
              <CardDescription>
                Customize the system prompt sections used by the monetization AI
                chat. These control how the AI analyzes your app and suggests
                strategies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromptEditor
                prompts={monetizationPrompts.data}
                onSave={handleSaveMonetization}
                onReset={handleResetMonetization}
                isSaving={setMonetizationPrompt.isPending}
                isResetting={deleteMonetizationPrompt.isPending}
                isLoading={monetizationPrompts.isLoading}
                fields={MONETIZATION_CHAT_FIELDS}
                modes={["chat"]}
                getSettingKey={getMonetizationSettingKey}
                description="These prompts define the AI's behavior in monetization chat. Each section controls a different aspect of the conversation."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Field Prompts</CardTitle>
              <CardDescription>
                Customize the AI prompts for generating and rephrasing in-app
                purchase fields (names, descriptions, review notes, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromptEditor
                prompts={purchasePrompts.data}
                onSave={handleSavePurchase}
                onReset={handleResetPurchase}
                isSaving={setPurchasePrompt.isPending}
                isResetting={deletePurchasePrompt.isPending}
                isLoading={purchasePrompts.isLoading}
                fields={PURCHASE_FIELDS}
                modes={["generate", "rephrase"]}
                getSettingKey={getPurchaseSettingKey}
                description="These prompts define the AI's behavior when generating or rephrasing purchase field content."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <MonetizationGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}
