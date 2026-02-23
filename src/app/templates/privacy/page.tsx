"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useApps } from "@/hooks/use-apps";
import { api } from "@/lib/api";
import {
  PRIVACY_CATEGORIES,
  PRIVACY_PURPOSES,
} from "@/lib/privacy-catalog";
import type { DataCollectionItem } from "@/lib/types";

const STORAGE_KEY = "appboard:privacy-template";

interface PrivacyTemplateState {
  templateId: string;
  dataCollections: DataCollectionItem[];
  privacyPolicyUrl: string;
  trackingEnabled: boolean;
  trackingDomains: string[];
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
    description: "Empty template — fill in your own data collections",
    dataCollections: [],
  },
];

const DEFAULT_STATE: PrivacyTemplateState = {
  templateId: "basic_app",
  dataCollections: TEMPLATE_PRESETS[1].dataCollections,
  privacyPolicyUrl: "",
  trackingEnabled: false,
  trackingDomains: [],
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

function getCategoryLabel(categoryId: string): string {
  return PRIVACY_CATEGORIES.find((c) => c.category === categoryId)?.label ?? categoryId;
}

function getPurposeLabel(purposeId: string): string {
  return PRIVACY_PURPOSES.find((p) => p.id === purposeId)?.label ?? purposeId;
}

export default function PrivacyTemplatePage() {
  const [state, setState] = useState<PrivacyTemplateState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    setState(loadState());
    setLoaded(true);
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  const updateState = useCallback((updates: Partial<PrivacyTemplateState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleTemplateChange = useCallback((templateId: string) => {
    const preset = TEMPLATE_PRESETS.find((t) => t.id === templateId);
    if (!preset) return;
    updateState({
      templateId,
      dataCollections: preset.dataCollections,
      trackingEnabled: preset.dataCollections.some((d) => d.tracking),
    });
  }, [updateState]);

  const hasTracking = state.dataCollections.some((d) => d.tracking);

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
      <div className="mb-6 flex items-end gap-3">
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

      {/* Data collections */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Data Collections</h2>

        {state.dataCollections.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No data collections. Your app does not collect any user data.
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Purposes</TableHead>
                  <TableHead className="w-24 text-center">Linked</TableHead>
                  <TableHead className="w-24 text-center">Tracking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.dataCollections.map((item, index) => (
                  <TableRow key={`${item.category}-${item.dataType}`}>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getCategoryLabel(item.category)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{item.dataType}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.purposes.map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px]">
                            {getPurposeLabel(p)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {item.linked ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {item.tracking ? (
                        <span className="text-orange-400">Yes</span>
                      ) : (
                        "No"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Tracking warning */}
      {hasTracking && (
        <Alert className="mb-6 border-orange-500/30 bg-orange-500/5">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <AlertDescription className="text-sm text-orange-300">
            Some data types are marked as used for tracking. Your app will need to show the App
            Tracking Transparency (ATT) prompt before collecting this data.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <div className="rounded-lg border bg-[#1a1a1a] p-4">
        <h3 className="mb-2 text-sm font-semibold">Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{state.dataCollections.length}</p>
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
          updateState({
            templateId: "custom",
            dataCollections: items,
            trackingEnabled: items.some((d) => d.tracking),
          });
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

