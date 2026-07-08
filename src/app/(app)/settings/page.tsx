"use client";

import Link from "next/link";
import {
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { StoreLogo } from "@/components/store-logo";
import { StoreAccessReport } from "@/components/stores/store-access-report";
import { StoreCapabilitiesPicker } from "@/components/stores/store-capabilities-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { VaultSettingsCard } from "@/components/vault/vault-settings-card";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import {
  useDisconnectStore,
  useRenameStore,
  useStoreCapabilities,
  useStoreCapabilityCatalog,
  useStores,
  useSyncAllStores,
  useSyncStore,
  useUpdateStoreCapabilities,
  useVerifyStoredAccess,
} from "@/hooks/use-stores";
import { ApiError } from "@/lib/api";
import type {
  CapabilityAccessResult,
  Store,
  StoreCapabilityDefinition,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const OTHER_VALUE = "__other__";

const STORE_STATUS_BADGES: Record<
  string,
  { className: string; label: string }
> = {
  connected: { className: "bg-green-500/10 text-green-500", label: "Connected" },
  disconnected: {
    className: "bg-muted text-muted-foreground",
    label: "Disconnected",
  },
  error: { className: "bg-red-500/10 text-red-500", label: "Error" },
};

const PRIMARY_TERRITORIES = [
  { code: "US", currency: "USD", label: "United States" },
  { code: "GB", currency: "GBP", label: "United Kingdom" },
  { code: "DE", currency: "EUR", label: "Germany" },
  { code: "FR", currency: "EUR", label: "France" },
  { code: "JP", currency: "JPY", label: "Japan" },
  { code: "AU", currency: "AUD", label: "Australia" },
  { code: "CA", currency: "CAD", label: "Canada" },
  { code: "BR", currency: "BRL", label: "Brazil" },
  { code: "IN", currency: "INR", label: "India" },
  { code: "KR", currency: "KRW", label: "South Korea" },
  { code: "MX", currency: "MXN", label: "Mexico" },
  { code: "PL", currency: "PLN", label: "Poland" },
  { code: "SE", currency: "SEK", label: "Sweden" },
  { code: "CH", currency: "CHF", label: "Switzerland" },
  { code: "TR", currency: "TRY", label: "Turkey" },
  { code: "SA", currency: "SAR", label: "Saudi Arabia" },
  { code: "AE", currency: "AED", label: "UAE" },
  { code: "SG", currency: "SGD", label: "Singapore" },
  { code: "HK", currency: "HKD", label: "Hong Kong" },
  { code: "NO", currency: "NOK", label: "Norway" },
] as const;

const FLAGSHIP_MODELS = [
  { label: "GLM 5.2", value: "z-ai/glm-5.2" },
  { label: "GLM 4.6", value: "z-ai/glm-4.6" },
  { label: "Gemini 2.5 Pro", value: "google/gemini-2.5-pro-preview" },
  { label: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash-preview" },
  { label: "Gemini 2.0 Flash", value: "google/gemini-2.0-flash-001" },
  { label: "Claude Sonnet 4.5", value: "anthropic/claude-sonnet-4.5" },
  { label: "Claude Sonnet 4", value: "anthropic/claude-sonnet-4" },
  { label: "Claude Opus 4.1", value: "anthropic/claude-opus-4.1" },
  { label: "Claude Opus 4", value: "anthropic/claude-opus-4" },
  { label: "GPT-4o", value: "openai/gpt-4o" },
  { label: "GPT-4.1", value: "openai/gpt-4.1" },
  { label: "GPT-4.1 Mini", value: "openai/gpt-4.1-mini" },
  { label: "DeepSeek V3.1", value: "deepseek/deepseek-chat-v3.1" },
  { label: "DeepSeek V3", value: "deepseek/deepseek-chat-v3-0324" },
  { label: "Grok 4", value: "x-ai/grok-4" },
  { label: "Qwen3 235B", value: "qwen/qwen3-235b-a22b" },
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

function PermissionsEditor({
  store,
  initial,
  defs,
  onClose,
}: {
  store: Store;
  initial: string[];
  defs: StoreCapabilityDefinition[];
  onClose: () => void;
}) {
  const update = useUpdateStoreCapabilities();
  const [selected, setSelected] = useState<string[]>(initial);

  const handleSave = async () => {
    try {
      await update.mutateAsync({ id: store.id, capabilities: selected });
      toast.success("Permissions updated");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update permissions",
      );
    }
  };

  return (
    <>
      <StoreCapabilitiesPicker
        capabilities={defs}
        value={selected}
        onChange={setSelected}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={update.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

function ManagePermissionsDialog({
  store,
  onClose,
}: {
  store: Store | null;
  onClose: () => void;
}) {
  const catalog = useStoreCapabilityCatalog();
  const caps = useStoreCapabilities(store?.id ?? null);

  const defs =
    catalog.data?.capabilities.filter((c) => c.storeType === store?.type) ?? [];
  const loading = catalog.isLoading || caps.isLoading;

  return (
    <Dialog open={store !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage permissions</DialogTitle>
          <DialogDescription>
            Choose what {store?.name} can edit. Core capabilities are always on.
          </DialogDescription>
        </DialogHeader>
        {loading || !store || !caps.data ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading capabilities...
          </div>
        ) : (
          <PermissionsEditor
            key={store.id}
            store={store}
            initial={caps.data.capabilities}
            defs={defs}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function VerifyAccessDialog({
  store,
  onClose,
}: {
  store: Store | null;
  onClose: () => void;
}) {
  const catalog = useStoreCapabilityCatalog();
  const { mutate, isPending } = useVerifyStoredAccess();
  const [state, setState] = useState<{
    storeId: string;
    results: CapabilityAccessResult[];
  } | null>(null);

  useEffect(() => {
    if (!store) return;
    mutate(store.id, {
      onSuccess: (report) =>
        setState({ storeId: store.id, results: report.results }),
      onError: (err) => {
        if (!(err instanceof ApiError && err.status === 423)) {
          toast.error(
            err instanceof Error ? err.message : "Failed to verify access",
          );
        }
      },
    });
  }, [store, mutate]);

  const defs =
    catalog.data?.capabilities.filter((c) => c.storeType === store?.type) ?? [];
  const results =
    store && state && state.storeId === store.id ? state.results : null;

  return (
    <Dialog open={store !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Access report</DialogTitle>
          <DialogDescription>
            What {store?.name}&apos;s stored key can really access. Unlock your
            vault if prompted.
          </DialogDescription>
        </DialogHeader>
        {isPending ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Probing the live API...
          </div>
        ) : results ? (
          <StoreAccessReport results={results} capabilities={defs} />
        ) : (
          <p className="py-4 text-sm text-muted-foreground">
            No results — unlock your vault and try again.
          </p>
        )}
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsGeneralPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [modelGenerate, setModelGenerate] = useState("");
  const [modelRephrase, setModelRephrase] = useState("");
  const [modelResearch, setModelResearch] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [primaryTerritory, setPrimaryTerritory] = useState("US");

  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const stores = useStores();
  const disconnectStore = useDisconnectStore();
  const syncStore = useSyncStore();
  const syncAllStores = useSyncAllStores();
  const renameStore = useRenameStore();
  const [renamingStore, setRenamingStore] = useState<Store | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [managingStore, setManagingStore] = useState<Store | null>(null);
  const [verifyingStore, setVerifyingStore] = useState<Store | null>(null);

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
      if (settings.data.primary_territory) {
        setPrimaryTerritory(settings.data.primary_territory);
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
    () => ({ modelGenerate, modelRephrase, modelResearch, primaryTerritory, temperature }),
    [modelGenerate, modelRephrase, modelResearch, primaryTerritory, temperature],
  );

  useAutoSave({
    data: aiSettingsData,
    onSave: async (data) => {
      await updateSettings.mutateAsync({
        ai_model_generate: data.modelGenerate || undefined,
        ai_model_rephrase: data.modelRephrase || undefined,
        ai_model_research: data.modelResearch || undefined,
        ai_temperature: String(data.temperature),
        primary_territory: data.primaryTerritory || undefined,
      });
    },
    enabled: !!settings.data,
  });

  const handleDisconnect = async (storeId: string) => {
    try {
      await disconnectStore.mutateAsync(storeId);
      toast.success("Store disconnected");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disconnect store",
      );
    }
  };

  const openRename = (store: Store) => {
    setRenamingStore(store);
    setRenameValue(store.name);
  };

  const handleRename = async () => {
    if (!renamingStore) return;
    const name = renameValue.trim();
    if (!name) {
      toast.error("Store name cannot be empty");
      return;
    }
    try {
      await renameStore.mutateAsync({ id: renamingStore.id, name });
      toast.success("Store renamed");
      setRenamingStore(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to rename store",
      );
    }
  };

  const handleSync = async (storeId: string) => {
    try {
      await syncStore.mutateAsync(storeId);
      toast.success("Store synced");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync store");
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncAllStores.mutateAsync();
      const storeCount = result.results.length;
      toast.success(
        `Synced ${result.totalSynced} app${result.totalSynced !== 1 ? "s" : ""} across ${storeCount} store${storeCount !== 1 ? "s" : ""}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync stores");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Stores</CardTitle>
          <CardDescription>
            Manage your connected app store accounts.
          </CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={
                syncAllStores.isPending || !stores.data || stores.data.length === 0
              }
            >
              {syncAllStores.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync all
            </Button>
          </CardAction>
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
              {stores.data.map((store) => {
                const statusBadge = STORE_STATUS_BADGES[store.status] ?? {
                  className: "bg-muted text-muted-foreground",
                  label: store.status,
                };
                const isSyncingRow =
                  syncStore.isPending && syncStore.variables === store.id;
                const isDisconnectingRow =
                  disconnectStore.isPending &&
                  disconnectStore.variables === store.id;
                return (
                  <div
                    key={store.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <StoreLogo
                          type={store.type}
                          className="h-5 w-5 text-foreground"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{store.name}</p>
                          <Badge
                            className={cn("text-xs", statusBadge.className)}
                          >
                            {statusBadge.label}
                          </Badge>
                        </div>
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
                        disabled={isSyncingRow || syncAllStores.isPending}
                      >
                        {isSyncingRow ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setVerifyingStore(store)}
                        aria-label="Verify access"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setManagingStore(store)}
                        aria-label="Manage permissions"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openRename(store)}
                        aria-label="Rename store"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDisconnect(store.id)}
                        disabled={isDisconnectingRow}
                      >
                        {isDisconnectingRow ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
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

      <Dialog
        open={renamingStore !== null}
        onOpenChange={(open) => {
          if (!open) setRenamingStore(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename store</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="store-name">Store name</Label>
            <Input
              id="store-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={255}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenamingStore(null)}
              disabled={renameStore.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={renameStore.isPending || !renameValue.trim()}
            >
              {renameStore.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManagePermissionsDialog
        store={managingStore}
        onClose={() => setManagingStore(null)}
      />

      <VerifyAccessDialog
        store={verifyingStore}
        onClose={() => setVerifyingStore(null)}
      />

      <VaultSettingsCard />

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

        <div className="space-y-6">
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

          <Separator />

          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium" htmlFor="primary-territory">
                Primary Currency Territory
              </Label>
              <p className="text-xs text-muted-foreground">
                Displayed as the main price in monetization plans and previews.
              </p>
            </div>
            <Select value={primaryTerritory} onValueChange={setPrimaryTerritory}>
              <SelectTrigger id="primary-territory">
                <SelectValue placeholder="US (USD)" />
              </SelectTrigger>
              <SelectContent>
                {PRIMARY_TERRITORIES.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.code} — {t.currency} ({t.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
