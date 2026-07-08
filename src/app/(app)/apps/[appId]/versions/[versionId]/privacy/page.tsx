"use client";

import { useParams } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/hooks/use-apps";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  usePrivacyDeclaration,
  usePrivacyTemplates,
  useUpdatePrivacyDeclaration,
} from "@/hooks/use-privacy-declaration";
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
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findItem(
  items: DataCollectionItem[],
  category: string,
  dataType: string,
): DataCollectionItem | undefined {
  return items.find(
    (i) => i.category === category && i.dataType === dataType,
  );
}

function categoryHasCheckedItems(
  items: DataCollectionItem[],
  category: string,
): boolean {
  return items.some((i) => i.category === category);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PrivacyDeclarationPage() {
  const params = useParams<{ appId: string; versionId: string }>();
  const app = useApp(params.appId);
  const platform = app.data?.platform as "ios" | "android" | undefined;
  const isAndroid = platform === "android";

  const declaration = usePrivacyDeclaration(params.appId);
  const templates = usePrivacyTemplates(platform);
  const updateDeclaration = useUpdatePrivacyDeclaration(params.appId);

  const [templateId, setTemplateId] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [trackingDomainInput, setTrackingDomainInput] = useState("");
  const [trackingDomains, setTrackingDomains] = useState<string[]>([]);
  const [gpEncryptedInTransit, setGpEncryptedInTransit] = useState(false);
  const [gpDeletionMechanism, setGpDeletionMechanism] = useState(false);
  const [dataCollections, setDataCollections] = useState<DataCollectionItem[]>(
    [],
  );
  const [initialized, setInitialized] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const categories: PrivacyCategory[] = isAndroid
    ? GP_DATA_SAFETY_CATEGORIES
    : PRIVACY_CATEGORIES;

  const defaultTemplateId = isAndroid ? "gp_minimal" : "minimal";

  // ---- Initialize from backend ----
  useEffect(() => {
    if (declaration.data !== undefined && !initialized && platform) {
      if (declaration.data) {
        setTemplateId(declaration.data.templateId);
        setPrivacyPolicyUrl(declaration.data.privacyPolicyUrl ?? "");
        setTrackingEnabled(declaration.data.trackingEnabled);
        setTrackingDomains(declaration.data.trackingDomains ?? []);
        setGpEncryptedInTransit(declaration.data.gpEncryptedInTransit);
        setGpDeletionMechanism(declaration.data.gpDeletionMechanism);
        const items = declaration.data.dataCollections ?? [];
        setDataCollections(items);

        const cats = new Set<string>();
        for (const item of items) {
          cats.add(item.category);
        }
        setExpandedCategories(cats);
      } else {
        setTemplateId(defaultTemplateId);
      }
      setInitialized(true);
    }
  }, [declaration.data, initialized, platform, defaultTemplateId]);

  // ---- Template switching ----
  const selectedTemplate = useMemo(
    () => templates.data?.find((t) => t.id === templateId),
    [templates.data, templateId],
  );

  const handleTemplateChange = useCallback(
    (newTemplateId: string) => {
      setTemplateId(newTemplateId);
      const tpl = templates.data?.find((t) => t.id === newTemplateId);
      if (tpl) {
        const items = tpl.dataCollections;
        setDataCollections(items);
        const cats = new Set<string>();
        for (const item of items) {
          cats.add(item.category);
        }
        setExpandedCategories(cats);
      }
    },
    [templates.data],
  );

  // ---- Data type toggle ----
  const toggleDataType = useCallback(
    (category: string, dataType: string) => {
      setDataCollections((prev) => {
        const exists = findItem(prev, category, dataType);
        if (exists) {
          return prev.filter(
            (i) => !(i.category === category && i.dataType === dataType),
          );
        }
        const newItem: DataCollectionItem = isAndroid
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
              linked: false,
              purposes: ["app_functionality"],
              tracking: false,
            };
        return [...prev, newItem];
      });
    },
    [isAndroid],
  );

  // ---- Purpose toggle ----
  const togglePurpose = useCallback(
    (category: string, dataType: string, purposeId: string) => {
      setDataCollections((prev) =>
        prev.map((item) => {
          if (item.category !== category || item.dataType !== dataType)
            return item;
          const has = item.purposes.includes(purposeId);
          return {
            ...item,
            purposes: has
              ? item.purposes.filter((p) => p !== purposeId)
              : [...item.purposes, purposeId],
          };
        }),
      );
    },
    [],
  );

  // ---- Field update (linked, tracking, collected, shared, ephemeral, required) ----
  const updateItemField = useCallback(
    (
      category: string,
      dataType: string,
      field: keyof DataCollectionItem,
      value: boolean,
    ) => {
      setDataCollections((prev) =>
        prev.map((item) => {
          if (item.category !== category || item.dataType !== dataType)
            return item;
          return { ...item, [field]: value };
        }),
      );
    },
    [],
  );

  // ---- Accordion toggle ----
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // ---- Tracking domains ----
  const addTrackingDomain = useCallback(() => {
    const domain = trackingDomainInput.trim();
    if (domain && !trackingDomains.includes(domain)) {
      setTrackingDomains((prev) => [...prev, domain]);
      setTrackingDomainInput("");
    }
  }, [trackingDomainInput, trackingDomains]);

  // ---- Auto-save ----
  const autoSaveData = useMemo(
    () => ({
      templateId,
      dataCollections,
      gpDeletionMechanism,
      gpEncryptedInTransit,
      privacyPolicyUrl: privacyPolicyUrl || null,
      trackingEnabled,
      trackingDomains: trackingDomains.length > 0 ? trackingDomains : null,
    }),
    [templateId, dataCollections, gpDeletionMechanism, gpEncryptedInTransit, privacyPolicyUrl, trackingEnabled, trackingDomains],
  );

  useAutoSave({
    data: autoSaveData,
    onSave: (data) => updateDeclaration.mutateAsync(data),
    enabled: initialized,
  });

  // ---- Derived ----
  const collectedCount = dataCollections.length;

  // ---- Loading ----
  if (declaration.isLoading || templates.isLoading || app.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pageTitle = isAndroid ? "Data Safety" : "Privacy Declaration";

  return (
    <div className="mx-auto w-full max-w-5xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {collectedCount} data type{collectedCount !== 1 ? "s" : ""}{" "}
            collected
          </p>
        </div>
      </div>

      {/* Template + Privacy Policy URL side by side on larger screens */}
      <div className="grid items-start gap-6 sm:grid-cols-2">
      {/* Template selector */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Template</Label>
        <Select value={templateId} onValueChange={handleTemplateChange}>
          <SelectTrigger className="w-full bg-[#1a1a1a] border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templates.data?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplate && (
          <p className="text-xs text-muted-foreground">
            {selectedTemplate.description}
          </p>
        )}
      </div>

      {/* Privacy Policy URL */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Privacy Policy URL</Label>
        <Input
          value={privacyPolicyUrl}
          onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
          placeholder="https://example.com/privacy"
          className="bg-[#1a1a1a] border-border"
        />
      </div>
      </div>

      {/* Platform-specific overview section */}
      {isAndroid ? (
        <AndroidOverviewSection
          gpEncryptedInTransit={gpEncryptedInTransit}
          gpDeletionMechanism={gpDeletionMechanism}
          onEncryptedChange={setGpEncryptedInTransit}
          onDeletionChange={setGpDeletionMechanism}
        />
      ) : (
        <IosTrackingSection
          trackingEnabled={trackingEnabled}
          trackingDomainInput={trackingDomainInput}
          trackingDomains={trackingDomains}
          onTrackingEnabledChange={setTrackingEnabled}
          onTrackingDomainInputChange={setTrackingDomainInput}
          onAddDomain={addTrackingDomain}
          onRemoveDomain={(i) =>
            setTrackingDomains(trackingDomains.filter((_, idx) => idx !== i))
          }
        />
      )}

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Data Types — Accordion Categories */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold mb-3">Data Types</h2>

        <div className="rounded-lg border border-border overflow-hidden">
          {categories.map((cat) => {
            const isExpanded = expandedCategories.has(cat.category);
            const hasChecked = categoryHasCheckedItems(
              dataCollections,
              cat.category,
            );
            const checkedCount = dataCollections.filter(
              (i) => i.category === cat.category,
            ).length;

            return (
              <div
                key={cat.category}
                className="border-b border-border last:border-b-0"
              >
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.category)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                      !isExpanded && "-rotate-90",
                    )}
                  />
                  <span className="text-sm font-medium">{cat.label}</span>
                  {hasChecked && (
                    <Badge
                      variant="secondary"
                      className="text-xs ml-auto tabular-nums"
                    >
                      {checkedCount}
                    </Badge>
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-1">
                    {cat.types.map((dt) => {
                      const item = findItem(
                        dataCollections,
                        cat.category,
                        dt.id,
                      );
                      const isChecked = !!item;

                      return (
                        <DataTypeRow
                          key={dt.id}
                          category={cat.category}
                          dataType={dt.id}
                          label={dt.label}
                          description={dt.description}
                          isChecked={isChecked}
                          isAndroid={isAndroid}
                          item={item}
                          onToggle={toggleDataType}
                          onTogglePurpose={togglePurpose}
                          onUpdateField={updateItemField}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// iOS Tracking Section
// ---------------------------------------------------------------------------

interface IosTrackingSectionProps {
  trackingEnabled: boolean;
  trackingDomainInput: string;
  trackingDomains: string[];
  onTrackingEnabledChange: (v: boolean) => void;
  onTrackingDomainInputChange: (v: string) => void;
  onAddDomain: () => void;
  onRemoveDomain: (i: number) => void;
}

function IosTrackingSection({
  trackingEnabled,
  trackingDomainInput,
  trackingDomains,
  onTrackingEnabledChange,
  onTrackingDomainInputChange,
  onAddDomain,
  onRemoveDomain,
}: IosTrackingSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="trackingEnabled"
          checked={trackingEnabled}
          onCheckedChange={onTrackingEnabledChange}
        />
        <Label htmlFor="trackingEnabled" className="text-sm font-semibold">
          App Tracking Transparency (ATT) required
        </Label>
      </div>

      {trackingEnabled && (
        <div className="space-y-2 pl-12">
          <Label className="text-sm">Tracking Domains</Label>
          <div className="flex gap-2">
            <Input
              value={trackingDomainInput}
              onChange={(e) => onTrackingDomainInputChange(e.target.value)}
              placeholder="analytics.example.com"
              className="max-w-sm bg-[#1a1a1a] border-border"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddDomain();
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onAddDomain}
              disabled={!trackingDomainInput.trim()}
            >
              Add
            </Button>
          </div>
          {trackingDomains.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {trackingDomains.map((domain, i) => (
                <Badge
                  key={domain}
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => onRemoveDomain(i)}
                >
                  {domain} <span>×</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Android Overview Section
// ---------------------------------------------------------------------------

interface AndroidOverviewSectionProps {
  gpEncryptedInTransit: boolean;
  gpDeletionMechanism: boolean;
  onEncryptedChange: (v: boolean) => void;
  onDeletionChange: (v: boolean) => void;
}

function AndroidOverviewSection({
  gpEncryptedInTransit,
  gpDeletionMechanism,
  onEncryptedChange,
  onDeletionChange,
}: AndroidOverviewSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="gpEncryptedInTransit"
          checked={gpEncryptedInTransit}
          onCheckedChange={onEncryptedChange}
        />
        <Label htmlFor="gpEncryptedInTransit" className="text-sm font-semibold">
          Data is encrypted in transit
        </Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="gpDeletionMechanism"
          checked={gpDeletionMechanism}
          onCheckedChange={onDeletionChange}
        />
        <Label htmlFor="gpDeletionMechanism" className="text-sm font-semibold">
          Users can request data deletion
        </Label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataTypeRow — individual data type with expandable config
// ---------------------------------------------------------------------------

interface DataTypeRowProps {
  category: string;
  dataType: string;
  label: string;
  description: string;
  isChecked: boolean;
  isAndroid: boolean;
  item: DataCollectionItem | undefined;
  onToggle: (category: string, dataType: string) => void;
  onTogglePurpose: (
    category: string,
    dataType: string,
    purposeId: string,
  ) => void;
  onUpdateField: (
    category: string,
    dataType: string,
    field: keyof DataCollectionItem,
    value: boolean,
  ) => void;
}

function DataTypeRow({
  category,
  dataType,
  label,
  description,
  isChecked,
  isAndroid,
  item,
  onToggle,
  onTogglePurpose,
  onUpdateField,
}: DataTypeRowProps) {
  const purposes = isAndroid ? GP_DATA_PURPOSES : PRIVACY_PURPOSES;

  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        isChecked
          ? "border-border bg-[#1a1a1a]/50"
          : "border-transparent",
      )}
    >
      {/* Checkbox + label + description */}
      <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer select-none">
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggle(category, dataType)}
          className="mt-0.5"
        />
        <div className="min-w-0">
          <span className="text-sm font-medium">{label}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </label>

      {/* Expanded config when checked */}
      {isChecked && item && (
        <div className="px-3 pb-3 pl-9 space-y-4">
          {isAndroid ? (
            <AndroidItemConfig
              category={category}
              dataType={dataType}
              item={item}
              purposes={purposes}
              onTogglePurpose={onTogglePurpose}
              onUpdateField={onUpdateField}
            />
          ) : (
            <IosItemConfig
              category={category}
              dataType={dataType}
              item={item}
              purposes={purposes}
              onTogglePurpose={onTogglePurpose}
              onUpdateField={onUpdateField}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// iOS per-item config
// ---------------------------------------------------------------------------

interface ItemConfigProps {
  category: string;
  dataType: string;
  item: DataCollectionItem;
  purposes: { id: string; label: string; description: string }[];
  onTogglePurpose: (
    category: string,
    dataType: string,
    purposeId: string,
  ) => void;
  onUpdateField: (
    category: string,
    dataType: string,
    field: keyof DataCollectionItem,
    value: boolean,
  ) => void;
}

function IosItemConfig({
  category,
  dataType,
  item,
  purposes,
  onTogglePurpose,
  onUpdateField,
}: ItemConfigProps) {
  return (
    <>
      {/* Purposes */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Purposes (select all that apply)
        </span>
        <div className="space-y-1.5">
          {purposes.map((p) => (
            <label
              key={p.id}
              className="flex items-start gap-2.5 cursor-pointer select-none"
            >
              <Checkbox
                checked={item.purposes.includes(p.id)}
                onCheckedChange={() =>
                  onTogglePurpose(category, dataType, p.id)
                }
                className="mt-0.5"
              />
              <div className="min-w-0">
                <span className="text-sm">{p.label}</span>
                <p className="text-xs text-muted-foreground">
                  {p.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Linked to identity */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Linked to user's identity?
        </span>
        <RadioGroup
          value={item.linked ? "yes" : "no"}
          onValueChange={(v) =>
            onUpdateField(category, dataType, "linked", v === "yes")
          }
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="yes" />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="no" />
            <span className="text-sm">No</span>
          </label>
        </RadioGroup>
      </div>

      {/* Used for tracking */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Used for tracking?
        </span>
        <RadioGroup
          value={item.tracking ? "yes" : "no"}
          onValueChange={(v) =>
            onUpdateField(category, dataType, "tracking", v === "yes")
          }
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="yes" />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="no" />
            <span className="text-sm">No</span>
          </label>
        </RadioGroup>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Android per-item config
// ---------------------------------------------------------------------------

function AndroidItemConfig({
  category,
  dataType,
  item,
  purposes,
  onTogglePurpose,
  onUpdateField,
}: ItemConfigProps) {
  return (
    <>
      {/* Collected / Shared checkboxes */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Data usage
        </span>
        <div className="flex gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <Checkbox
              checked={item.collected ?? true}
              onCheckedChange={(v) =>
                onUpdateField(category, dataType, "collected", !!v)
              }
            />
            <span className="text-sm">Collected</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <Checkbox
              checked={item.shared ?? false}
              onCheckedChange={(v) =>
                onUpdateField(category, dataType, "shared", !!v)
              }
            />
            <span className="text-sm">Shared</span>
          </label>
        </div>
      </div>

      {/* Ephemeral */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Is this data processed ephemerally?
        </span>
        <RadioGroup
          value={item.ephemeral ? "yes" : "no"}
          onValueChange={(v) =>
            onUpdateField(category, dataType, "ephemeral", v === "yes")
          }
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="yes" />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="no" />
            <span className="text-sm">No</span>
          </label>
        </RadioGroup>
      </div>

      {/* Required / Optional */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Is this data required or optional?
        </span>
        <RadioGroup
          value={item.required !== false ? "required" : "optional"}
          onValueChange={(v) =>
            onUpdateField(category, dataType, "required", v === "required")
          }
          className="flex gap-4"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="required" />
            <span className="text-sm">Required</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="optional" />
            <span className="text-sm">Optional</span>
          </label>
        </RadioGroup>
      </div>

      {/* Purposes */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Purposes (select all that apply)
        </span>
        <div className="space-y-1.5">
          {purposes.map((p) => (
            <label
              key={p.id}
              className="flex items-start gap-2.5 cursor-pointer select-none"
            >
              <Checkbox
                checked={item.purposes.includes(p.id)}
                onCheckedChange={() =>
                  onTogglePurpose(category, dataType, p.id)
                }
                className="mt-0.5"
              />
              <div className="min-w-0">
                <span className="text-sm">{p.label}</span>
                <p className="text-xs text-muted-foreground">
                  {p.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
