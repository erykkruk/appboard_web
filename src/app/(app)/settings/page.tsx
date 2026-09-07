"use client";

import Link from "next/link";
import {
  ChevronsUpDown,
  DownloadCloud,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  PackagePlus,
  Pencil,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { StoreLogo } from "@/components/store-logo";
import { StoreAccessReport } from "@/components/stores/store-access-report";
import { StoreCapabilitiesPicker } from "@/components/stores/store-capabilities-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AI_UNLOCKS } from "@/components/ai-unlock-card";
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
import { AppleAdsSettingsCard } from "@/components/apple-ads/apple-ads-settings-card";
import { VaultSettingsCard } from "@/components/vault/vault-settings-card";
import { useAiModels, useAiStatus } from "@/hooks/use-ai";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import {
  useDisconnectStore,
  useRenameStore,
  useStoreCapabilities,
  useStoreCapabilityCatalog,
  useStores,
  useAddStorePackage,
  useResyncStore,
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

// A shortlist worth showing first. Ids are OpenRouter's; the live catalog
// decides whether each one still exists, so a retired model never appears.
const RECOMMENDED_MODELS = [
  { label: "Claude Sonnet 5", value: "anthropic/claude-sonnet-5" },
  { label: "Claude Opus 5", value: "anthropic/claude-opus-5" },
  { label: "Claude Haiku 4.5", value: "anthropic/claude-haiku-4.5" },
  { label: "GPT-5.4", value: "openai/gpt-5.4" },
  { label: "GPT-5.4 Mini", value: "openai/gpt-5.4-mini" },
  { label: "GPT-5.2", value: "openai/gpt-5.2" },
  { label: "Gemini 3.8 Flash", value: "google/gemini-3.8-flash" },
  { label: "Gemini 3.1 Pro", value: "google/gemini-3.1-pro-preview" },
  { label: "Gemini 3 Flash (default)", value: "google/gemini-3-flash-preview" },
  { label: "DeepSeek V4 Pro", value: "deepseek/deepseek-v4-pro" },
  { label: "DeepSeek V4 Flash", value: "deepseek/deepseek-v4-flash" },
  { label: "GLM 5.3", value: "z-ai/glm-5.3" },
  { label: "GLM 5.2", value: "z-ai/glm-5.2" },
  { label: "Kimi K3", value: "moonshotai/kimi-k3" },
  { label: "MiniMax M3", value: "minimax/minimax-m3" },
  { label: "Grok 4.6", value: "x-ai/grok-4.6" },
  { label: "Qwen 3.8 Max", value: "qwen/qwen3.8-max-0902" },
  { label: "Llama 4 Maverick", value: "meta-llama/llama-4-maverick" },
  { label: "Mistral Large", value: "mistralai/mistral-large-2512" },
] as const;

const DEFAULT_MODEL_LABEL = "Default (Gemini 3 Flash)";
const MAX_SEARCH_RESULTS = 60;
const PER_MILLION = 1_000_000;

function pricePerMillion(perToken: number): string {
  const usd = perToken * PER_MILLION;
  if (!Number.isFinite(usd) || usd <= 0) return "free";
  return usd < 0.1 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`;
}

interface ModelSelectorProps {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Picks an OpenRouter model id. Searches the live catalog (every text model
 * OpenRouter serves today, with prices) and keeps a shortlist on top, so the
 * list is never a snapshot somebody typed a year ago. Any id can still be
 * entered by hand for models the catalog does not carry.
 */
function ModelSelector({
  id,
  label,
  description,
  value,
  onChange,
}: ModelSelectorProps) {
  const catalog = useAiModels();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const models = useMemo(() => catalog.data ?? [], [catalog.data]);
  const byId = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const recommended = RECOMMENDED_MODELS.filter(
    (m) => models.length === 0 || byId.has(m.value),
  );
  const q = query.trim().toLowerCase();
  const results = q
    ? models
        .filter(
          (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
        )
        .slice(0, MAX_SEARCH_RESULTS)
    : [];
  const currentLabel = value
    ? (byId.get(value)?.name ??
      RECOMMENDED_MODELS.find((m) => m.value === value)?.label ??
      value)
    : DEFAULT_MODEL_LABEL;

  const pick = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
  };

  const row = (modelId: string, name: string) => {
    const live = byId.get(modelId);
    return (
      <button
        key={modelId}
        type="button"
        className={`flex w-full items-start justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted ${
          value === modelId ? "bg-muted" : ""
        }`}
        onClick={() => pick(modelId)}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm">{name}</span>
          <span className="block truncate text-muted-foreground text-xs">
            {modelId}
          </span>
        </span>
        {live && (
          <span className="shrink-0 text-right text-muted-foreground text-xs">
            {pricePerMillion(live.pricing.prompt)} /{" "}
            {pricePerMillion(live.pricing.completion)}
            <span className="block">per 1M tokens</span>
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium" htmlFor={id}>
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">{currentLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[440px] p-0" align="start">
          <div className="border-b p-2">
            <Input
              autoFocus
              placeholder={
                models.length
                  ? `Search ${models.length} models or paste an id`
                  : "Paste an OpenRouter model id"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q && results.length === 0) pick(query.trim());
              }}
            />
          </div>
          <ScrollArea className="h-72">
            <div className="p-2">
              {!q && (
                <>
                  <p className="px-2 pb-1 text-muted-foreground text-xs uppercase tracking-wide">
                    Recommended
                  </p>
                  {recommended.map((m) => row(m.value, m.label))}
                  {catalog.isError && (
                    <p className="px-2 pt-2 text-muted-foreground text-xs">
                      The live catalog is unavailable right now; the shortlist
                      above may be out of date. Any OpenRouter id still works.
                    </p>
                  )}
                  {catalog.isLoading && (
                    <p className="px-2 pt-2 text-muted-foreground text-xs">
                      Loading the full catalog...
                    </p>
                  )}
                </>
              )}
              {q && results.map((m) => row(m.id, m.name))}
              {q && results.length === 0 && (
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => pick(query.trim())}
                >
                  No catalog match. Use{" "}
                  <span className="font-mono">{query.trim()}</span> as a custom
                  id
                </button>
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <Button variant="ghost" size="sm" onClick={() => pick("")}>
              Use default
            </Button>
            {value && (
              <span className="truncate font-mono text-muted-foreground text-xs">
                {value}
              </span>
            )}
          </div>
        </PopoverContent>
      </Popover>
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
  const resyncStore = useResyncStore();
  const [resyncTarget, setResyncTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const syncAllStores = useSyncAllStores();
  const renameStore = useRenameStore();
  const [renamingStore, setRenamingStore] = useState<Store | null>(null);
  const [packageStore, setPackageStore] = useState<Store | null>(null);
  const [packageValue, setPackageValue] = useState("");
  const addStorePackage = useAddStorePackage();
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

  const aiStatus = useAiStatus();
  const queryClient = useQueryClient();
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    try {
      await updateSettings.mutateAsync({ openrouter_api_key: apiKey });
      setHasExistingKey(true);
      setApiKey("");
      queryClient.invalidateQueries({ queryKey: ["ai", "status"] });
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

  const handleAddPackage = async () => {
    if (!packageStore) return;
    const packageName = packageValue.trim();
    if (!packageName) return;
    try {
      await addStorePackage.mutateAsync({ id: packageStore.id, packageName });
      toast.success(`Added ${packageName} and synced`);
      setPackageStore(null);
      setPackageValue("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add package",
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

  const handleResync = async () => {
    if (!resyncTarget) return;
    const { id, name } = resyncTarget;
    setResyncTarget(null);
    try {
      await resyncStore.mutateAsync(id);
      toast.success(`Re-imported apps from ${name}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to re-import apps",
      );
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
                Add an app by link or connect a store API
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
                    className="space-y-2 rounded-lg border p-3"
                  >
                    {/* Line 1: identity - the name always keeps its space */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <StoreLogo
                          type={store.type}
                          className="h-5 w-5 text-foreground"
                        />
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {store.name}
                      </p>
                      <Badge
                        className={cn(
                          "shrink-0 text-xs",
                          statusBadge.className,
                        )}
                      >
                        {statusBadge.label}
                      </Badge>
                      {store.connectionMode === "public" && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs text-muted-foreground"
                        >
                          Public
                        </Badge>
                      )}
                    </div>
                    {/* Line 2: sync info + actions; icons wrap below in a narrow column */}
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      {store.lastSyncedAt && (
                        <p className="min-w-0 truncate whitespace-nowrap text-xs text-muted-foreground">
                          Last synced:{" "}
                          {new Date(store.lastSyncedAt).toLocaleString()}
                        </p>
                      )}
                      <div className="ml-auto flex shrink-0 gap-1">
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
                      {store.type === "google_play" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setPackageStore(store);
                            setPackageValue("");
                          }}
                          aria-label="Add app by package name"
                        >
                          <PackagePlus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setResyncTarget({ id: store.id, name: store.name })
                        }
                        disabled={
                          resyncStore.isPending || syncAllStores.isPending
                        }
                        aria-label="Re-import apps from account"
                      >
                        {resyncStore.isPending &&
                        resyncStore.variables === store.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <DownloadCloud className="h-4 w-4" />
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

      <AppleAdsSettingsCard />

      <Dialog
        open={packageStore !== null}
        onOpenChange={(open) => {
          if (!open) setPackageStore(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add app by package name</DialogTitle>
            <DialogDescription>
              Brand-new draft apps (no release yet) are invisible to
              auto-discovery. Enter the package name from Play Console — the
              service account must have access to the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="package-name">Package name</Label>
            <Input
              id="package-name"
              placeholder="com.example.app"
              value={packageValue}
              onChange={(e) => setPackageValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddPackage();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPackageStore(null)}
              disabled={addStorePackage.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPackage}
              disabled={addStorePackage.isPending || !packageValue.trim()}
            >
              {addStorePackage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add & sync"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!resyncTarget}
        onOpenChange={(open) => {
          if (!open) setResyncTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Re-import apps from {resyncTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes all locally stored apps for this connection —
              including drafts, listing history and screenshots — and imports
              everything fresh from the store account. Use this after switching
              the connection to a different account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResync}>
              Re-import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            {/* Say what the key changes before anyone pays for one. Every
                feature not on this list works without it. */}
            {aiStatus.data && (
              <div className="mt-3 rounded-md border p-3 text-sm">
                {aiStatus.data.configured && aiStatus.data.lastError ? (
                  <p className="text-amber-500">
                    Your key is saved but OpenRouter rejected the last call:{" "}
                    {aiStatus.data.lastError}. Paste a new key above; everything
                    that does not need AI keeps working.
                  </p>
                ) : aiStatus.data.configured ? (
                  <p className="text-muted-foreground">
                    AI is on
                    {aiStatus.data.source === "instance"
                      ? " through this instance's key; add your own to use your models and billing."
                      : " with your key."}{" "}
                    It powers: {AI_UNLOCKS.map((u) => u[0].toLowerCase() + u.slice(1)).join("; ")}.
                  </p>
                ) : (
                  <div className="space-y-1.5 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">AI is off.</span>{" "}
                      Scores, the audit, text fixes, screenshots, rankings and
                      reminders all work without it. A key adds:
                    </p>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {AI_UNLOCKS.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
