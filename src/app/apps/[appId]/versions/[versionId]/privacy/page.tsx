"use client";

import { useParams } from "next/navigation";
import { ChevronDown, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import {
  usePrivacyDeclaration,
  usePrivacyTemplates,
  useUpdatePrivacyDeclaration,
} from "@/hooks/use-privacy-declaration";
import {
  PRIVACY_CATEGORIES,
  PRIVACY_PURPOSES,
} from "@/lib/privacy-catalog";
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
  const declaration = usePrivacyDeclaration(params.appId);
  const templates = usePrivacyTemplates();
  const updateDeclaration = useUpdatePrivacyDeclaration(params.appId);

  const [templateId, setTemplateId] = useState("minimal");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [trackingDomainInput, setTrackingDomainInput] = useState("");
  const [trackingDomains, setTrackingDomains] = useState<string[]>([]);
  const [dataCollections, setDataCollections] = useState<DataCollectionItem[]>(
    [],
  );
  const [initialized, setInitialized] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // ---- Initialize from backend ----
  useEffect(() => {
    if (declaration.data !== undefined && !initialized) {
      if (declaration.data) {
        setTemplateId(declaration.data.templateId);
        setPrivacyPolicyUrl(declaration.data.privacyPolicyUrl ?? "");
        setTrackingEnabled(declaration.data.trackingEnabled);
        setTrackingDomains(declaration.data.trackingDomains ?? []);
        const items = declaration.data.dataCollections ?? [];
        setDataCollections(items);

        // Auto-expand categories that have checked items
        const cats = new Set<string>();
        for (const item of items) {
          cats.add(item.category);
        }
        setExpandedCategories(cats);
      }
      setInitialized(true);
    }
  }, [declaration.data, initialized]);

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
        return [
          ...prev,
          {
            category,
            dataType,
            linked: false,
            purposes: ["app_functionality"],
            tracking: false,
          },
        ];
      });
    },
    [],
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

  // ---- Linked / Tracking update ----
  const updateItemField = useCallback(
    (
      category: string,
      dataType: string,
      field: "linked" | "tracking",
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

  // ---- Save ----
  const handleSave = async () => {
    try {
      await updateDeclaration.mutateAsync({
        templateId,
        dataCollections,
        privacyPolicyUrl: privacyPolicyUrl || null,
        trackingEnabled,
        trackingDomains: trackingDomains.length > 0 ? trackingDomains : null,
      });
      toast.success("Privacy declaration saved");
    } catch {
      toast.error("Failed to save privacy declaration");
    }
  };

  // ---- Derived ----
  const collectedCount = dataCollections.length;

  // ---- Loading ----
  if (declaration.isLoading || templates.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Privacy Declaration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {collectedCount} data type{collectedCount !== 1 ? "s" : ""}{" "}
            collected
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateDeclaration.isPending}
          size="sm"
        >
          {updateDeclaration.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      {/* Template selector */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Template</Label>
        <Select value={templateId} onValueChange={handleTemplateChange}>
          <SelectTrigger className="w-72 bg-[#1a1a1a] border-border">
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
          className="max-w-lg bg-[#1a1a1a] border-border"
        />
      </div>

      {/* App Tracking Transparency */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            id="trackingEnabled"
            checked={trackingEnabled}
            onCheckedChange={setTrackingEnabled}
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
                onChange={(e) => setTrackingDomainInput(e.target.value)}
                placeholder="analytics.example.com"
                className="max-w-sm bg-[#1a1a1a] border-border"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTrackingDomain();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addTrackingDomain}
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
                    onClick={() =>
                      setTrackingDomains(
                        trackingDomains.filter((_, idx) => idx !== i),
                      )
                    }
                  >
                    {domain} <span>×</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-border" />

      {/* Data Types — Accordion Categories */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold mb-3">Data Types</h2>

        <div className="rounded-lg border border-border overflow-hidden">
          {PRIVACY_CATEGORIES.map((cat) => {
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
// DataTypeRow — individual data type with expandable config
// ---------------------------------------------------------------------------

interface DataTypeRowProps {
  category: string;
  dataType: string;
  label: string;
  description: string;
  isChecked: boolean;
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
    field: "linked" | "tracking",
    value: boolean,
  ) => void;
}

function DataTypeRow({
  category,
  dataType,
  label,
  description,
  isChecked,
  item,
  onToggle,
  onTogglePurpose,
  onUpdateField,
}: DataTypeRowProps) {
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
          {/* Purposes */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Purposes (select all that apply)
            </span>
            <div className="space-y-1.5">
              {PRIVACY_PURPOSES.map((p) => (
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
        </div>
      )}
    </div>
  );
}
