"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Contact,
  CreditCard,
  Eye,
  FileText,
  Fingerprint,
  Heart,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  BarChart3,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useApps } from "@/hooks/use-apps";
import { api } from "@/lib/api";
import {
  PRIVACY_CATEGORIES,
  PRIVACY_PURPOSES,
} from "@/lib/privacy-catalog";
import type { DataCollectionItem } from "@/lib/types";

const STORAGE_KEY = "appboard:privacy-template";

const CATEGORY_ICONS: Record<string, typeof Contact> = {
  contact_info: Contact,
  health_fitness: Heart,
  financial: CreditCard,
  location: MapPin,
  sensitive_info: Shield,
  contacts: Contact,
  user_content: MessageSquare,
  browsing_history: Eye,
  search_history: Search,
  identifiers: Fingerprint,
  purchases: ShoppingCart,
  usage_data: BarChart3,
  diagnostics: Wrench,
};

interface PrivacyTemplateState {
  templateId: string;
  dataCollections: DataCollectionItem[];
}

const TEMPLATE_PRESETS: {
  id: string;
  name: string;
  description: string;
  dataCollections: DataCollectionItem[];
}[] = [
  {
    id: "minimal",
    name: "Minimal (No Data Collection)",
    description: "App does not collect any user data",
    dataCollections: [],
  },
  {
    id: "basic_app",
    name: "Basic App",
    description: "Login, analytics, and crash reporting",
    dataCollections: [
      { category: "contact_info", dataType: "Email Address", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "identifiers", dataType: "User ID", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "usage_data", dataType: "Product Interaction", linked: false, purposes: ["analytics"], tracking: false },
      { category: "diagnostics", dataType: "Crash Data", linked: false, purposes: ["analytics"], tracking: false },
    ],
  },
  {
    id: "social_media",
    name: "Social Media",
    description: "Full data collection: contacts, location, UGC, ads, tracking",
    dataCollections: [
      { category: "contact_info", dataType: "Email Address", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "contact_info", dataType: "Name", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "contacts", dataType: "Contacts", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "location", dataType: "Precise Location", linked: true, purposes: ["app_functionality", "third_party_advertising"], tracking: true },
      { category: "user_content", dataType: "Photos or Videos", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "identifiers", dataType: "User ID", linked: true, purposes: ["app_functionality", "third_party_advertising"], tracking: true },
      { category: "identifiers", dataType: "Device ID", linked: false, purposes: ["third_party_advertising"], tracking: true },
      { category: "usage_data", dataType: "Product Interaction", linked: true, purposes: ["analytics", "product_personalization"], tracking: false },
      { category: "diagnostics", dataType: "Crash Data", linked: false, purposes: ["analytics"], tracking: false },
    ],
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Payments, purchases, address, ads",
    dataCollections: [
      { category: "contact_info", dataType: "Email Address", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "contact_info", dataType: "Name", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "contact_info", dataType: "Physical Address", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "financial", dataType: "Payment Info", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "purchases", dataType: "Purchase History", linked: true, purposes: ["app_functionality", "developers_advertising"], tracking: false },
      { category: "identifiers", dataType: "User ID", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "usage_data", dataType: "Product Interaction", linked: true, purposes: ["analytics", "product_personalization"], tracking: false },
      { category: "diagnostics", dataType: "Crash Data", linked: false, purposes: ["analytics"], tracking: false },
    ],
  },
  {
    id: "game",
    name: "Game",
    description: "Ads, in-app purchases, leaderboards, analytics",
    dataCollections: [
      { category: "contact_info", dataType: "Email Address", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "identifiers", dataType: "User ID", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "identifiers", dataType: "Device ID", linked: false, purposes: ["third_party_advertising"], tracking: true },
      { category: "purchases", dataType: "Purchase History", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "usage_data", dataType: "Product Interaction", linked: true, purposes: ["analytics", "product_personalization"], tracking: false },
      { category: "diagnostics", dataType: "Crash Data", linked: false, purposes: ["analytics"], tracking: false },
    ],
  },
  {
    id: "health_fitness",
    name: "Health & Fitness",
    description: "Health data, location, fitness tracking",
    dataCollections: [
      { category: "contact_info", dataType: "Email Address", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "health_fitness", dataType: "Health", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "health_fitness", dataType: "Fitness", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "location", dataType: "Precise Location", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "identifiers", dataType: "User ID", linked: true, purposes: ["app_functionality"], tracking: false },
      { category: "usage_data", dataType: "Product Interaction", linked: false, purposes: ["analytics"], tracking: false },
      { category: "diagnostics", dataType: "Crash Data", linked: false, purposes: ["analytics"], tracking: false },
    ],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start from scratch",
    dataCollections: [],
  },
];

const DEFAULT_STATE: PrivacyTemplateState = {
  templateId: "basic_app",
  dataCollections: TEMPLATE_PRESETS[1].dataCollections,
};

function loadState(): PrivacyTemplateState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return DEFAULT_STATE;
}

function saveState(state: PrivacyTemplateState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeKey(category: string, dataType: string) {
  return `${category}:${dataType}`;
}

export default function PrivacyTemplatePage() {
  const [state, setState] = useState<PrivacyTemplateState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategoryExpanded = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  useEffect(() => {
    setState(loadState());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  const handleTemplateChange = useCallback((templateId: string) => {
    const preset = TEMPLATE_PRESETS.find((t) => t.id === templateId);
    if (!preset) return;
    setState({ templateId, dataCollections: preset.dataCollections });
  }, []);

  // Lookup map: key -> DataCollectionItem
  const itemMap = useMemo(() => {
    const map = new Map<string, DataCollectionItem>();
    for (const item of state.dataCollections) {
      map.set(makeKey(item.category, item.dataType), item);
    }
    return map;
  }, [state.dataCollections]);

  const toggleDataType = useCallback((category: string, dataType: string) => {
    setState((prev) => {
      const key = makeKey(category, dataType);
      const exists = prev.dataCollections.some(
        (d) => makeKey(d.category, d.dataType) === key,
      );
      const next = exists
        ? prev.dataCollections.filter(
            (d) => makeKey(d.category, d.dataType) !== key,
          )
        : [
            ...prev.dataCollections,
            { category, dataType, linked: true, purposes: ["app_functionality"], tracking: false },
          ];
      return { templateId: "custom", dataCollections: next };
    });
  }, []);

  const togglePurpose = useCallback((category: string, dataType: string, purposeId: string) => {
    setState((prev) => ({
      templateId: "custom",
      dataCollections: prev.dataCollections.map((d) => {
        if (d.category !== category || d.dataType !== dataType) return d;
        const has = d.purposes.includes(purposeId);
        const purposes = has
          ? d.purposes.filter((p) => p !== purposeId)
          : [...d.purposes, purposeId];
        // Keep at least one purpose
        if (purposes.length === 0) return d;
        return { ...d, purposes };
      }),
    }));
  }, []);

  const setLinked = useCallback((category: string, dataType: string, linked: boolean) => {
    setState((prev) => ({
      templateId: "custom",
      dataCollections: prev.dataCollections.map((d) =>
        d.category === category && d.dataType === dataType ? { ...d, linked } : d,
      ),
    }));
  }, []);

  const setTracking = useCallback((category: string, dataType: string, tracking: boolean) => {
    setState((prev) => ({
      templateId: "custom",
      dataCollections: prev.dataCollections.map((d) =>
        d.category === category && d.dataType === dataType ? { ...d, tracking } : d,
      ),
    }));
  }, []);

  const hasTracking = state.dataCollections.some((d) => d.tracking);
  const selectedCount = state.dataCollections.length;

  if (!loaded) return null;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Privacy Declaration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build your App Store privacy declaration template.
        </p>
      </div>

      <Alert className="mb-6 border-blue-500/30 bg-blue-500/5">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-sm text-blue-300">
          This is a reference tool only — privacy declarations cannot be pushed to App Store
          Connect via API. Use this to plan your declaration and fill it in manually.
        </AlertDescription>
      </Alert>

      {/* Template selector + AI generate */}
      <div className="mb-8 flex items-end gap-3">
        <div className="flex-1">
          <Label className="mb-2 block text-sm font-medium">Template</Label>
          <Select value={state.templateId} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_PRESETS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="font-medium">{t.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => setAiDialogOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>
      </div>

      {/* Full catalog — Apple-style collapsible */}
      <div className="space-y-2">
        {PRIVACY_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.category] ?? Briefcase;
          const isExpanded = expandedCategories.has(cat.category);
          const checkedCount = cat.types.filter((dt) =>
            itemMap.has(makeKey(cat.category, dt.id)),
          ).length;

          return (
            <section key={cat.category} className="rounded-lg border">
              {/* Category header — clickable to expand/collapse */}
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                onClick={() => toggleCategoryExpanded(cat.category)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <h2 className="flex-1 text-sm font-bold">{cat.label}</h2>
                {checkedCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {checkedCount}
                  </span>
                )}
              </button>

              {/* Data types — collapsible */}
              {isExpanded && (
                <div className="space-y-1 border-t px-4 py-3">
                  {cat.types.map((dt) => {
                    const key = makeKey(cat.category, dt.id);
                    const isChecked = itemMap.has(key);
                    const details = itemMap.get(key);

                    return (
                      <div key={dt.id}>
                        {/* Checkbox row */}
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/30">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleDataType(cat.category, dt.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{dt.label}</p>
                            <p className="text-sm text-muted-foreground">{dt.description}</p>
                          </div>
                        </label>

                        {/* Expanded details when checked */}
                        {isChecked && details && (
                        <div className="mb-4 ml-9 space-y-5 rounded-lg border bg-[#1a1a1a] p-4">
                          {/* Purposes */}
                          <div>
                            <p className="mb-1 text-sm font-semibold">
                              Indicate how {dt.label.toLowerCase()} collected from this app are
                              being used by you or your third-party partners (select all that
                              apply):
                            </p>
                            <div className="mt-3 space-y-3">
                              {PRIVACY_PURPOSES.map((purpose) => (
                                <label
                                  key={purpose.id}
                                  className="flex cursor-pointer items-start gap-3"
                                >
                                  <Checkbox
                                    checked={details.purposes.includes(purpose.id)}
                                    onCheckedChange={() =>
                                      togglePurpose(cat.category, dt.id, purpose.id)
                                    }
                                    className="mt-0.5"
                                  />
                                  <div>
                                    <p className="text-sm font-medium">{purpose.label}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {purpose.description}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Linked to identity */}
                          <div>
                            <p className="mb-3 text-sm font-semibold">
                              Are the {dt.label.toLowerCase()} collected from this app linked to
                              the user&apos;s identity?
                            </p>
                            <RadioGroup
                              value={details.linked ? "yes" : "no"}
                              onValueChange={(v) =>
                                setLinked(cat.category, dt.id, v === "yes")
                              }
                              className="space-y-2"
                            >
                              <label className="flex cursor-pointer items-center gap-2.5">
                                <RadioGroupItem value="yes" />
                                <span className="text-sm">
                                  <span className="font-medium">Yes</span>, {dt.label.toLowerCase()}{" "}
                                  collected from this app are linked to the user&apos;s identity
                                </span>
                              </label>
                              <label className="flex cursor-pointer items-center gap-2.5">
                                <RadioGroupItem value="no" />
                                <span className="text-sm">
                                  <span className="font-medium">No</span>, {dt.label.toLowerCase()}{" "}
                                  collected from this app are not linked to the user&apos;s identity
                                </span>
                              </label>
                            </RadioGroup>
                          </div>

                          <Separator />

                          {/* Tracking */}
                          <div>
                            <p className="mb-3 text-sm font-semibold">
                              Do you or your third-party partners use{" "}
                              {dt.label.toLowerCase()} for tracking purposes?
                            </p>
                            <RadioGroup
                              value={details.tracking ? "yes" : "no"}
                              onValueChange={(v) =>
                                setTracking(cat.category, dt.id, v === "yes")
                              }
                              className="space-y-2"
                            >
                              <label className="flex cursor-pointer items-center gap-2.5">
                                <RadioGroupItem value="yes" />
                                <span className="text-sm">
                                  <span className="font-medium">Yes</span>, we use{" "}
                                  {dt.label.toLowerCase()} for tracking purposes
                                </span>
                              </label>
                              <label className="flex cursor-pointer items-center gap-2.5">
                                <RadioGroupItem value="no" />
                                <span className="text-sm">
                                  <span className="font-medium">No</span>, we do not use{" "}
                                  {dt.label.toLowerCase()} for tracking purposes
                                </span>
                              </label>
                            </RadioGroup>
                          </div>
                        </div>
                      )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Tracking warning */}
      {hasTracking && (
        <Alert className="mt-8 border-orange-500/30 bg-orange-500/5">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <AlertDescription className="text-sm text-orange-300">
            Some data types are marked as used for tracking. Your app will need to show the App
            Tracking Transparency (ATT) prompt before collecting this data.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="mt-8 rounded-lg border bg-[#1a1a1a] p-4">
        <h3 className="mb-2 text-sm font-semibold">Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{selectedCount}</p>
            <p className="text-xs text-muted-foreground">Data Types</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {new Set(state.dataCollections.map((d) => d.category)).size}
            </p>
            <p className="text-xs text-muted-foreground">Categories</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {state.dataCollections.filter((d) => d.tracking).length}
            </p>
            <p className="text-xs text-muted-foreground">Tracking</p>
          </div>
        </div>
      </div>

      {/* AI Generate Dialog */}
      <AiGenerateDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onGenerated={(items) => {
          setState({ templateId: "custom", dataCollections: items });
          toast.success(`Generated ${items.length} data collection items`);
        }}
      />
    </div>
  );
}

function AiGenerateDialog({
  open,
  onOpenChange,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (items: DataCollectionItem[]) => void;
}) {
  const apps = useApps();
  const [selectedAppId, setSelectedAppId] = useState("");
  const [description, setDescription] = useState("");

  const selectedApp = useMemo(
    () => (apps.data ?? []).find((a) => a.id === selectedAppId),
    [apps.data, selectedAppId],
  );

  const generateMutation = useMutation({
    mutationFn: (data: { appName: string; description: string }) =>
      api.ai.generatePrivacy(data),
    onSuccess: (data) => {
      try {
        const items = JSON.parse(data.result) as DataCollectionItem[];
        onGenerated(items);
        onOpenChange(false);
        setDescription("");
        setSelectedAppId("");
      } catch {
        toast.error("Failed to parse AI response");
      }
    },
    onError: () => {
      toast.error("Failed to generate privacy declaration");
    },
  });

  const handleGenerate = () => {
    const appName = selectedApp?.name ?? "My App";
    generateMutation.mutate({ appName, description });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Privacy Declaration with AI</DialogTitle>
          <DialogDescription>
            Select an app and describe what data it collects. AI will generate the privacy
            declaration structure.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">App (optional)</Label>
            <Select value={selectedAppId} onValueChange={setSelectedAppId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an app..." />
              </SelectTrigger>
              <SelectContent>
                {(apps.data ?? []).map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">
              Describe what data your app collects and why
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., The app requires email login, tracks analytics with Firebase, uses AdMob for ads, and stores user preferences. It also collects crash reports via Crashlytics."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={description.length < 10 || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
