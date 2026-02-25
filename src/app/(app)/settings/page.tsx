"use client";

import Link from "next/link";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import {
  useDisconnectStore,
  useStores,
  useSyncStore,
} from "@/hooks/use-stores";

const OTHER_VALUE = "__other__";

const FLAGSHIP_MODELS = [
  { label: "Gemini 2.0 Flash", value: "google/gemini-2.0-flash-001" },
  { label: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash-preview" },
  { label: "Gemini 2.5 Pro", value: "google/gemini-2.5-pro-preview" },
  { label: "Claude Sonnet 4", value: "anthropic/claude-sonnet-4" },
  { label: "Claude Opus 4", value: "anthropic/claude-opus-4" },
  { label: "GPT-4o", value: "openai/gpt-4o" },
  { label: "GPT-4.1", value: "openai/gpt-4.1" },
  { label: "GPT-4.1 Mini", value: "openai/gpt-4.1-mini" },
  { label: "DeepSeek V3", value: "deepseek/deepseek-chat-v3-0324" },
  { label: "Llama 4 Maverick", value: "meta-llama/llama-4-maverick" },
] as const;

const KNOWN_MODEL_VALUES = new Set<string>(FLAGSHIP_MODELS.map((m) => m.value));

interface ModelSelectorProps {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

function ModelSelector({
  id,
  label,
  description,
  value,
  onChange,
}: ModelSelectorProps) {
  const isCustom = value !== "" && !KNOWN_MODEL_VALUES.has(value);
  const [showCustomInput, setShowCustomInput] = useState(isCustom);
  const [customValue, setCustomValue] = useState(isCustom ? value : "");

  const handleSelectChange = (selected: string) => {
    if (selected === OTHER_VALUE) {
      setShowCustomInput(true);
      setCustomValue("");
      onChange("");
    } else {
      setShowCustomInput(false);
      setCustomValue("");
      onChange(selected);
    }
  };

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    onChange(val);
  };

  const selectValue = showCustomInput
    ? OTHER_VALUE
    : KNOWN_MODEL_VALUES.has(value)
      ? value
      : "";

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium" htmlFor={id}>
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Default (Gemini 2.0 Flash)" />
        </SelectTrigger>
        <SelectContent>
          {FLAGSHIP_MODELS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_VALUE}>Other (custom model)</SelectItem>
        </SelectContent>
      </Select>
      {showCustomInput && (
        <Input
          placeholder="e.g. mistralai/mistral-large-latest"
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
        />
      )}
    </div>
  );
}

const MASKED_VALUE = "********";

export default function SettingsGeneralPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [modelGenerate, setModelGenerate] = useState("");
  const [modelRephrase, setModelRephrase] = useState("");
  const [modelResearch, setModelResearch] = useState("");
  const [temperature, setTemperature] = useState(0.7);

  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const stores = useStores();
  const disconnectStore = useDisconnectStore();
  const syncStore = useSyncStore();

  useEffect(() => {
    if (settings.data) {
      if (settings.data.openrouter_api_key && settings.data.openrouter_api_key !== MASKED_VALUE) {
        setApiKey(settings.data.openrouter_api_key);
      }
      if (settings.data.openrouter_api_key === MASKED_VALUE) {
        setHasExistingKey(true);
      }
      if (settings.data.ai_model_generate) {
        setModelGenerate(settings.data.ai_model_generate);
      }
      if (settings.data.ai_model_rephrase) {
        setModelRephrase(settings.data.ai_model_rephrase);
      }
      if (settings.data.ai_model_research) {
        setModelResearch(settings.data.ai_model_research);
      }
      if (settings.data.ai_temperature) {
        setTemperature(Number.parseFloat(settings.data.ai_temperature));
      }
    }
  }, [settings.data]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    try {
      await updateSettings.mutateAsync({ openrouter_api_key: apiKey });
      setHasExistingKey(true);
      setApiKey("");
      toast.success("API key saved");
    } catch {
      toast.error("Failed to save API key");
    }
  };

  const aiSettingsData = useMemo(
    () => ({ modelGenerate, modelRephrase, modelResearch, temperature }),
    [modelGenerate, modelRephrase, modelResearch, temperature],
  );

  useAutoSave({
    data: aiSettingsData,
    onSave: async (data) => {
      await updateSettings.mutateAsync({
        ai_model_generate: data.modelGenerate || undefined,
        ai_model_rephrase: data.modelRephrase || undefined,
        ai_model_research: data.modelResearch || undefined,
        ai_temperature: String(data.temperature),
      });
    },
    enabled: !!settings.data,
  });

  const handleDisconnect = async (storeId: string) => {
    try {
      await disconnectStore.mutateAsync(storeId);
      toast.success("Store disconnected");
    } catch {
      toast.error("Failed to disconnect store");
    }
  };

  const handleSync = async (storeId: string) => {
    try {
      await syncStore.mutateAsync(storeId);
      toast.success("Store synced");
    } catch {
      toast.error("Failed to sync store");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Stores</CardTitle>
          <CardDescription>
            Manage your connected app store accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stores.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}

          {stores.isError && (
            <p className="text-sm text-muted-foreground">
              Failed to load stores.
            </p>
          )}

          {stores.data && stores.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No stores connected yet.{" "}
              <Link
                href="/onboarding"
                className="text-primary underline underline-offset-4"
              >
                Connect one
              </Link>
              .
            </p>
          )}

          {stores.data && stores.data.length > 0 && (
            <div className="space-y-3">
              {stores.data.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        store.type === "google_play" ? "default" : "secondary"
                      }
                    >
                      {store.type === "google_play" ? "GP" : "AS"}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{store.name}</p>
                      {store.lastSyncedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last synced:{" "}
                          {new Date(store.lastSyncedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSync(store.id)}
                      disabled={syncStore.isPending}
                    >
                      {syncStore.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDisconnect(store.id)}
                      disabled={disconnectStore.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator className="my-4" />

          <div className="space-y-2">
            <p className="text-sm font-medium">Setup Guides</p>
            <div className="flex flex-col gap-1">
              <a
                href="https://developers.google.com/android-publisher/getting_started#using_a_service_account"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
              >
                Google Play Service Account Setup
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
              >
                App Store Connect API Key Setup
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>
            Configure AI features powered by OpenRouter. Each task type can use
            a different model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label
              className="mb-2 block text-sm font-medium"
              htmlFor="openrouter-key"
            >
              OpenRouter API Key
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="openrouter-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder={hasExistingKey ? "Key saved — enter new key to replace" : "sk-or-..."}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleSaveApiKey}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Get your API key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
              >
                openrouter.ai/keys
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <Separator />

          <ModelSelector
            id="model-generate"
            label="Generate Model"
            description="Used for generating new listing content from scratch"
            value={modelGenerate}
            onChange={setModelGenerate}
          />

          <ModelSelector
            id="model-rephrase"
            label="Rephrase Model"
            description="Used for rephrasing and improving existing text"
            value={modelRephrase}
            onChange={setModelRephrase}
          />

          <ModelSelector
            id="model-research"
            label="Research Model"
            description="Used for keyword suggestions, translations, and analysis"
            value={modelResearch}
            onChange={setModelResearch}
          />

          <Separator />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-sm font-medium" htmlFor="temperature">
                Temperature
              </Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              id="temperature"
              value={[temperature]}
              onValueChange={([v]) => setTemperature(v)}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span>0.1.0</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Framework</span>
            <span>Next.js 15</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
