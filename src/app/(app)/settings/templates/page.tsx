"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronRight,
  Contact,
  CreditCard,
  Eye,
  FileText,
  Fingerprint,
  Folder,
  Heart,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Mic,
  Monitor,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
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
  GP_DATA_SAFETY_CATEGORIES,
  GP_DATA_PURPOSES,
} from "@/lib/gp-data-safety-catalog";
import {
  PRIVACY_CATEGORIES,
  PRIVACY_PURPOSES,
} from "@/lib/privacy-catalog";
import type { PrivacyCategory } from "@/lib/privacy-catalog";
import type { DataCollectionItem } from "@/lib/types";

type Platform = "ios" | "android";

const STORAGE_KEY = "appboard:privacy-template";

// ---------------------------------------------------------------------------
// Category icons
// ---------------------------------------------------------------------------

const IOS_CATEGORY_ICONS: Record<string, typeof Contact> = {
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

const GP_CATEGORY_ICONS: Record<string, typeof Contact> = {
  location: MapPin,
  personal_info: Contact,
  financial_info: CreditCard,
  health_fitness: Heart,
  messages: MessageSquare,
  photos_videos: ImageIcon,
  audio: Mic,
  files_docs: Folder,
  calendar: Calendar,
  contacts: Contact,
  app_activity: Monitor,
  web_browsing: Eye,
  app_info_performance: BarChart3,
  device_ids: Fingerprint,
};

// ---------------------------------------------------------------------------
// Template presets
// ---------------------------------------------------------------------------

interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  dataCollections: DataCollectionItem[];
}

const IOS_PRESETS: TemplatePreset[] = [
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

function gpItem(
  category: string,
  dataType: string,
  purposes: string[],
  overrides?: Partial<Pick<DataCollectionItem, "collected" | "shared" | "ephemeral" | "required">>,
): DataCollectionItem {
  return {
    category,
    collected: true,
    dataType,
    ephemeral: false,
    linked: false,
    purposes,
    required: true,
    shared: false,
    tracking: false,
    ...overrides,
  };
}

const GP_PRESETS: TemplatePreset[] = [
  {
    id: "gp_minimal",
    name: "Minimal (No Data Collection)",
    description: "App does not collect or share any user data",
    dataCollections: [],
  },
  {
    id: "gp_basic_app",
    name: "Basic App",
    description: "Login, analytics, and crash reporting",
    dataCollections: [
      gpItem("personal_info", "Email address", ["app_functionality"]),
      gpItem("device_ids", "Device or other IDs", ["analytics", "app_functionality"]),
      gpItem("app_info_performance", "Crash logs", ["analytics"]),
      gpItem("app_info_performance", "Diagnostics", ["analytics"]),
    ],
  },
  {
    id: "gp_social_media",
    name: "Social Media",
    description: "Full data collection: contacts, location, media, ads, analytics",
    dataCollections: [
      gpItem("personal_info", "Name", ["app_functionality"]),
      gpItem("personal_info", "Email address", ["app_functionality"]),
      gpItem("personal_info", "Phone number", ["app_functionality"]),
      gpItem("contacts", "Contacts", ["app_functionality"]),
      gpItem("location", "Approximate location", ["app_functionality", "analytics"]),
      gpItem("location", "Precise location", ["app_functionality", "advertising_marketing"]),
      gpItem("photos_videos", "Photos", ["app_functionality"]),
      gpItem("photos_videos", "Videos", ["app_functionality"]),
      gpItem("app_activity", "App interactions", ["analytics", "personalization"]),
      gpItem("device_ids", "Device or other IDs", ["advertising_marketing", "analytics"]),
      gpItem("app_info_performance", "Crash logs", ["analytics"]),
    ],
  },
  {
    id: "gp_ecommerce",
    name: "E-commerce",
    description: "Payments, purchases, address, marketing",
    dataCollections: [
      gpItem("personal_info", "Name", ["app_functionality"]),
      gpItem("personal_info", "Email address", ["app_functionality"]),
      gpItem("personal_info", "Address", ["app_functionality"]),
      gpItem("financial_info", "User payment info", ["app_functionality"]),
      gpItem("financial_info", "Purchase history", ["app_functionality", "advertising_marketing"]),
      gpItem("device_ids", "Device or other IDs", ["advertising_marketing", "analytics"]),
      gpItem("app_activity", "App interactions", ["analytics", "personalization"]),
      gpItem("app_info_performance", "Crash logs", ["analytics"]),
    ],
  },
  {
    id: "gp_game",
    name: "Game",
    description: "Ads, in-app purchases, leaderboards, analytics",
    dataCollections: [
      gpItem("personal_info", "Email address", ["app_functionality"]),
      gpItem("financial_info", "Purchase history", ["app_functionality"]),
      gpItem("device_ids", "Device or other IDs", ["advertising_marketing", "analytics"]),
      gpItem("app_activity", "App interactions", ["analytics", "personalization"]),
      gpItem("app_info_performance", "Crash logs", ["analytics"]),
      gpItem("app_info_performance", "Diagnostics", ["analytics"]),
    ],
  },
  {
    id: "gp_health_fitness",
    name: "Health & Fitness",
    description: "Health data, location, fitness tracking",
    dataCollections: [
      gpItem("personal_info", "Email address", ["app_functionality"]),
      gpItem("health_fitness", "Health info", ["app_functionality"]),
      gpItem("health_fitness", "Fitness info", ["app_functionality"]),
      gpItem("location", "Approximate location", ["app_functionality"]),
      gpItem("location", "Precise location", ["app_functionality"]),
      gpItem("device_ids", "Device or other IDs", ["analytics", "app_functionality"]),
      gpItem("app_activity", "App interactions", ["analytics"]),
      gpItem("app_info_performance", "Crash logs", ["analytics"]),
    ],
  },
  {
    id: "gp_custom",
    name: "Custom",
    description: "Start from scratch",
    dataCollections: [],
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface PrivacyTemplateState {
  platform: Platform;
  templateId: string;
  dataCollections: DataCollectionItem[];
}

const DEFAULT_STATE: PrivacyTemplateState = {
  platform: "ios",
  templateId: "basic_app",
  dataCollections: IOS_PRESETS[1].dataCollections,
};

function loadState(): PrivacyTemplateState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.platform) parsed.platform = "ios";
      return parsed;
    }
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

function getCustomTemplateId(platform: Platform) {
  return platform === "android" ? "gp_custom" : "custom";
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PrivacyTemplatePage() {
  const [state, setState] = useState<PrivacyTemplateState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const isAndroid = state.platform === "android";
  const categories: PrivacyCategory[] = isAndroid ? GP_DATA_SAFETY_CATEGORIES : PRIVACY_CATEGORIES;
  const presets = isAndroid ? GP_PRESETS : IOS_PRESETS;
  const categoryIcons = isAndroid ? GP_CATEGORY_ICONS : IOS_CATEGORY_ICONS;
  const purposes = isAndroid ? GP_DATA_PURPOSES : PRIVACY_PURPOSES;

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

  const handlePlatformChange = useCallback((platform: Platform) => {
    const defaultPresets = platform === "android" ? GP_PRESETS : IOS_PRESETS;
    const defaultPreset = defaultPresets[1]; // basic_app
    setState({
      platform,
      templateId: defaultPreset.id,
      dataCollections: defaultPreset.dataCollections,
    });
    setExpandedCategories(new Set());
  }, []);

  const handleTemplateChange = useCallback((templateId: string) => {
    const allPresets = [...IOS_PRESETS, ...GP_PRESETS];
    const preset = allPresets.find((t) => t.id === templateId);
    if (!preset) return;
    setState((prev) => ({ ...prev, templateId, dataCollections: preset.dataCollections }));
  }, []);

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
      const customId = getCustomTemplateId(prev.platform);
      if (exists) {
        return {
          ...prev,
          templateId: customId,
          dataCollections: prev.dataCollections.filter(
            (d) => makeKey(d.category, d.dataType) !== key,
          ),
        };
      }
      const newItem: DataCollectionItem = prev.platform === "android"
        ? {
            category,
            collected: true,
            dataType,
            ephemeral: false,
            linked: false,
            purposes: ["app_functionality"],
            required: true,
            shared: false,
            tracking: false,
          }
        : {
            category,
            dataType,
            linked: true,
            purposes: ["app_functionality"],
            tracking: false,
          };
      return {
        ...prev,
        templateId: customId,
        dataCollections: [...prev.dataCollections, newItem],
      };
    });
  }, []);

  const togglePurpose = useCallback((category: string, dataType: string, purposeId: string) => {
    setState((prev) => ({
      ...prev,
      templateId: getCustomTemplateId(prev.platform),
      dataCollections: prev.dataCollections.map((d) => {
        if (d.category !== category || d.dataType !== dataType) return d;
        const has = d.purposes.includes(purposeId);
        const newPurposes = has
          ? d.purposes.filter((p) => p !== purposeId)
          : [...d.purposes, purposeId];
        if (newPurposes.length === 0) return d;
        return { ...d, purposes: newPurposes };
      }),
    }));
  }, []);

  const updateField = useCallback((category: string, dataType: string, field: keyof DataCollectionItem, value: boolean) => {
    setState((prev) => ({
      ...prev,
      templateId: getCustomTemplateId(prev.platform),
      dataCollections: prev.dataCollections.map((d) =>
        d.category === category && d.dataType === dataType ? { ...d, [field]: value } : d,
      ),
    }));
  }, []);

  const hasTracking = state.dataCollections.some((d) => d.tracking);
  const selectedCount = state.dataCollections.length;

  if (!loaded) return null;

  const pageTitle = isAndroid ? "Data Safety" : "Privacy Declaration";
  const pageSubtitle = isAndroid
    ? "Build your Google Play data safety declaration."
    : "Build your App Store privacy declaration template.";
  const infoText = isAndroid
    ? "This is a reference tool only — data safety declarations cannot be pushed to Google Play Console via API. Use this to plan your declaration and fill it in manually."
    : "This is a reference tool only — privacy declarations cannot be pushed to App Store Connect via API. Use this to plan your declaration and fill it in manually.";

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{pageSubtitle}</p>
      </div>

      {/* Platform toggle */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={state.platform === "ios" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePlatformChange("ios")}
        >
          Apple App Store
        </Button>
        <Button
          variant={state.platform === "android" ? "default" : "outline"}
          size="sm"
          onClick={() => handlePlatformChange("android")}
        >
          Google Play
        </Button>
      </div>

      <Alert className="mb-6 border-blue-500/30 bg-blue-500/5">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-sm text-blue-300">
          {infoText}
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
              {presets.map((t) => (
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

      {/* Full catalog — collapsible categories */}
      <div className="grid items-start gap-2 lg:grid-cols-2">
        {categories.map((cat) => {
          const Icon = categoryIcons[cat.category] ?? Briefcase;
          const isExpanded = expandedCategories.has(cat.category);
          const checkedCount = cat.types.filter((dt) =>
            itemMap.has(makeKey(cat.category, dt.id)),
          ).length;

          return (
            <section key={cat.category} className="rounded-lg border">
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

              {isExpanded && (
                <div className="space-y-1 border-t px-4 py-3">
                  {cat.types.map((dt) => {
                    const key = makeKey(cat.category, dt.id);
                    const isChecked = itemMap.has(key);
                    const details = itemMap.get(key);

                    return (
                      <div key={dt.id}>
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

                        {isChecked && details && (
                          <div className="mb-4 ml-9 space-y-5 rounded-lg border bg-[#1a1a1a] p-4">
                            {isAndroid ? (
                              <GpItemDetails
                                dt={dt}
                                details={details}
                                category={cat.category}
                                purposes={purposes}
                                onTogglePurpose={togglePurpose}
                                onUpdateField={updateField}
                              />
                            ) : (
                              <IosItemDetails
                                dt={dt}
                                details={details}
                                category={cat.category}
                                purposes={purposes}
                                onTogglePurpose={togglePurpose}
                                onUpdateField={updateField}
                              />
                            )}
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

      {/* Tracking warning (iOS) */}
      {!isAndroid && hasTracking && (
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
        <div className={`grid gap-4 text-center ${isAndroid ? "grid-cols-3" : "grid-cols-3"}`}>
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
          {isAndroid ? (
            <div>
              <p className="text-2xl font-bold">
                {state.dataCollections.filter((d) => d.shared).length}
              </p>
              <p className="text-xs text-muted-foreground">Shared</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-bold">
                {state.dataCollections.filter((d) => d.tracking).length}
              </p>
              <p className="text-xs text-muted-foreground">Tracking</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Generate Dialog */}
      <AiGenerateDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        platform={state.platform}
        onGenerated={(items) => {
          setState((prev) => ({
            ...prev,
            templateId: getCustomTemplateId(prev.platform),
            dataCollections: items,
          }));
          toast.success(`Generated ${items.length} data collection items`);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// iOS per-item details
// ---------------------------------------------------------------------------

interface ItemDetailsProps {
  dt: { id: string; label: string };
  details: DataCollectionItem;
  category: string;
  purposes: { id: string; label: string; description: string }[];
  onTogglePurpose: (category: string, dataType: string, purposeId: string) => void;
  onUpdateField: (category: string, dataType: string, field: keyof DataCollectionItem, value: boolean) => void;
}

function IosItemDetails({ dt, details, category, purposes, onTogglePurpose, onUpdateField }: ItemDetailsProps) {
  return (
    <>
      <div>
        <p className="mb-1 text-sm font-semibold">
          Indicate how {dt.label.toLowerCase()} collected from this app are
          being used by you or your third-party partners (select all that apply):
        </p>
        <div className="mt-3 space-y-3">
          {purposes.map((purpose) => (
            <label key={purpose.id} className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={details.purposes.includes(purpose.id)}
                onCheckedChange={() => onTogglePurpose(category, dt.id, purpose.id)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{purpose.label}</p>
                <p className="text-xs text-muted-foreground">{purpose.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-sm font-semibold">
          Are the {dt.label.toLowerCase()} collected from this app linked to the user&apos;s identity?
        </p>
        <RadioGroup
          value={details.linked ? "yes" : "no"}
          onValueChange={(v) => onUpdateField(category, dt.id, "linked", v === "yes")}
          className="space-y-2"
        >
          <label className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem value="yes" />
            <span className="text-sm">
              <span className="font-medium">Yes</span>, {dt.label.toLowerCase()} collected from this app are linked to the user&apos;s identity
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem value="no" />
            <span className="text-sm">
              <span className="font-medium">No</span>, {dt.label.toLowerCase()} collected from this app are not linked to the user&apos;s identity
            </span>
          </label>
        </RadioGroup>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-sm font-semibold">
          Do you or your third-party partners use {dt.label.toLowerCase()} for tracking purposes?
        </p>
        <RadioGroup
          value={details.tracking ? "yes" : "no"}
          onValueChange={(v) => onUpdateField(category, dt.id, "tracking", v === "yes")}
          className="space-y-2"
        >
          <label className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem value="yes" />
            <span className="text-sm">
              <span className="font-medium">Yes</span>, we use {dt.label.toLowerCase()} for tracking purposes
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem value="no" />
            <span className="text-sm">
              <span className="font-medium">No</span>, we do not use {dt.label.toLowerCase()} for tracking purposes
            </span>
          </label>
        </RadioGroup>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Google Play per-item details
// ---------------------------------------------------------------------------

function GpItemDetails({ dt, details, category, purposes, onTogglePurpose, onUpdateField }: ItemDetailsProps) {
  return (
    <>
      {/* Collected / Shared */}
      <div>
        <p className="mb-3 text-sm font-semibold">Data usage</p>
        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-2.5">
            <Checkbox
              checked={details.collected ?? true}
              onCheckedChange={(v) => onUpdateField(category, dt.id, "collected", !!v)}
            />
            <span className="text-sm font-medium">Collected</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <Checkbox
              checked={details.shared ?? false}
              onCheckedChange={(v) => onUpdateField(category, dt.id, "shared", !!v)}
            />
            <span className="text-sm font-medium">Shared</span>
          </label>
        </div>
      </div>

      <Separator />

      {/* Ephemeral */}
      <div>
        <p className="mb-3 text-sm font-semibold">
          Is {dt.label.toLowerCase()} processed ephemerally?
        </p>
        <RadioGroup
          value={details.ephemeral ? "yes" : "no"}
          onValueChange={(v) => onUpdateField(category, dt.id, "ephemeral", v === "yes")}
          className="space-y-2"
        >
          <label className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem value="yes" />
            <span className="text-sm">
              <span className="font-medium">Yes</span>, data is processed ephemerally
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem value="no" />
            <span className="text-sm">
              <span className="font-medium">No</span>, data is retained
            </span>
          </label>
        </RadioGroup>
      </div>

      <Separator />

      {/* Required / Optional */}
      <div>
        <p className="mb-3 text-sm font-semibold">
          Is {dt.label.toLowerCase()} required or optional?
        </p>
        <RadioGroup
          value={details.required !== false ? "required" : "optional"}
          onValueChange={(v) => onUpdateField(category, dt.id, "required", v === "required")}
          className="space-y-2"
        >
          <label className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem value="required" />
            <span className="text-sm">
              <span className="font-medium">Required</span> — users cannot use the app without providing this data
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <RadioGroupItem value="optional" />
            <span className="text-sm">
              <span className="font-medium">Optional</span> — users can choose whether to provide this data
            </span>
          </label>
        </RadioGroup>
      </div>

      <Separator />

      {/* Purposes */}
      <div>
        <p className="mb-1 text-sm font-semibold">
          Why is {dt.label.toLowerCase()} collected or shared? (select all that apply)
        </p>
        <div className="mt-3 space-y-3">
          {purposes.map((purpose) => (
            <label key={purpose.id} className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={details.purposes.includes(purpose.id)}
                onCheckedChange={() => onTogglePurpose(category, dt.id, purpose.id)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{purpose.label}</p>
                <p className="text-xs text-muted-foreground">{purpose.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// AI Generate Dialog
// ---------------------------------------------------------------------------

function AiGenerateDialog({
  open,
  onOpenChange,
  platform,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform;
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
    mutationFn: (data: { appName: string; description: string; platform?: "ios" | "android" }) =>
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
    generateMutation.mutate({ appName, description, platform });
  };

  const dialogTitle = platform === "android"
    ? "Generate Data Safety with AI"
    : "Generate Privacy Declaration with AI";
  const dialogDescription = platform === "android"
    ? "Select an app and describe what data it collects. AI will generate the data safety declaration structure."
    : "Select an app and describe what data it collects. AI will generate the privacy declaration structure.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
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
              placeholder={
                platform === "android"
                  ? "e.g., The app requires email login, uses Firebase Analytics, shows AdMob ads, collects crash reports, and stores user preferences locally."
                  : "e.g., The app requires email login, tracks analytics with Firebase, uses AdMob for ads, and stores user preferences. It also collects crash reports via Crashlytics."
              }
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
