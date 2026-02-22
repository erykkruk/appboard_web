"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Apple,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Save,
  Store,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  exportProfileCsv,
  exportProfileJson,
  generateProfileTemplate,
  parseProfileFile,
} from "@/lib/aso-profile-csv";
import { downloadFile } from "@/lib/listings-csv";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCounter } from "@/components/character-counter";
import { useApp } from "@/hooks/use-apps";
import { useAsoProfile, useUpdateAsoProfile } from "@/hooks/use-aso-profile";
import type { AsoProfileInput } from "@/lib/types";

const EMPTY_PROFILE: AsoProfileInput = {
  category: null,
  differentiator: null,
  keyFeatures: null,
  mainBenefit: null,
  oneLiner: null,
  problem: null,
  painPoints: null,
  targetAudience: null,
  userLanguage: null,
  competitiveAdvantage: null,
  competitors: null,
  positioning: null,
  brandVoiceExample: null,
  tone: null,
  wordsToAvoid: null,
  wordsToInclude: null,
  awards: null,
  downloadCount: null,
  pressQuotes: null,
  testimonials: null,
  freeFeatures: null,
  premiumFeatures: null,
  price: null,
  pricingModel: null,
  excludeKeywords: null,
  longTailKeywords: null,
  mustIncludeKeywords: null,
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

// --- Multi-input for string arrays ---

function MultiInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addItem = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInput("");
    }
  };

  const removeItem = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder ?? `Add ${label.toLowerCase()}...`}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={!input.trim()}
        >
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((item, i) => (
            <Badge
              key={`${item}-${i}`}
              variant="secondary"
              className="cursor-pointer gap-1 pr-1.5"
              onClick={() => removeItem(i)}
            >
              {item}
              <span className="ml-0.5 text-muted-foreground hover:text-foreground">
                ×
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Section wrapper ---

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none pb-2 transition-colors hover:bg-muted/50">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ChevronRight
                className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
              />
              {title}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// --- Field helpers ---

function TextField({
  label,
  value,
  onChange,
  maxLength,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
}) {
  const Component = multiline ? Textarea : Input;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        {maxLength && (
          <CharacterCounter current={value.length} max={maxLength} />
        )}
      </div>
      <Component
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={multiline ? "min-h-[80px] resize-y" : ""}
      />
    </div>
  );
}

// --- Main component ---

function profileToForm(
  data: AsoProfileInput | null | undefined,
): AsoProfileInput {
  if (!data) return { ...EMPTY_PROFILE };
  return { ...EMPTY_PROFILE, ...data };
}

export default function AppInformationPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const app = useApp(appId);
  const profile = useAsoProfile(appId);
  const updateProfile = useUpdateAsoProfile(appId);

  const [form, setForm] = useState<AsoProfileInput>(EMPTY_PROFILE);
  const [initialized, setInitialized] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.data !== undefined && !initialized) {
      setForm(profileToForm(profile.data));
      setInitialized(true);
    }
  }, [profile.data, initialized]);

  const set = useCallback(
    <K extends keyof AsoProfileInput>(key: K, value: AsoProfileInput[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const str = useCallback(
    (key: keyof AsoProfileInput): string => {
      return (form[key] as string) ?? "";
    },
    [form],
  );

  const arr = useCallback(
    (key: keyof AsoProfileInput): string[] => {
      return (form[key] as string[]) ?? [];
    },
    [form],
  );

  const isDirty = useMemo(() => {
    if (!initialized) return false;
    const original = profileToForm(profile.data);
    return JSON.stringify(form) !== JSON.stringify(original);
  }, [form, profile.data, initialized]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(form);
      toast.success("ASO profile saved");
    } catch {
      toast.error("Failed to save ASO profile");
    }
  };

  const handleExportCsv = useCallback(() => {
    const csv = exportProfileCsv(form);
    const name = app.data?.name?.replace(/\s+/g, "-").toLowerCase() ?? "app";
    downloadFile(csv, `aso-profile-${name}.csv`, "text/csv");
  }, [form, app.data?.name]);

  const handleExportJson = useCallback(() => {
    const json = exportProfileJson(form);
    const name = app.data?.name?.replace(/\s+/g, "-").toLowerCase() ?? "app";
    downloadFile(json, `aso-profile-${name}.json`, "application/json");
  }, [form, app.data?.name]);

  const handleDownloadTemplate = useCallback(() => {
    const csv = generateProfileTemplate();
    downloadFile(csv, "aso-profile-template.csv", "text/csv");
  }, []);

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setIsImporting(true);

      try {
        const text = await file.text();
        const { profile: imported, errors } = parseProfileFile(text, file.name);

        if (errors.length > 0) {
          for (const err of errors) {
            toast.error(err);
          }
        }

        if (!imported) {
          setIsImporting(false);
          return;
        }

        // Merge imported fields into form
        setForm((prev) => {
          const next = { ...prev };
          for (const [key, value] of Object.entries(imported)) {
            if (value !== undefined) {
              (next as Record<string, unknown>)[key] = value;
            }
          }
          return next;
        });

        toast.success("Profile imported — review changes and save");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Import failed";
        toast.error(message);
      } finally {
        setIsImporting(false);
      }
    },
    [],
  );

  if (app.isLoading || profile.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  if (!app.data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">App not found.</p>
      </div>
    );
  }

  const data = app.data;
  const isIos = data.platform === "ios";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* App header */}
      <div className="flex items-center gap-4">
        {data.iconUrl ? (
          <img
            src={data.iconUrl}
            alt={data.name}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2a2a2a] text-2xl font-bold text-muted-foreground">
            {data.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.bundleId}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="mr-1.5 h-4 w-4" />
                Export
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleExportCsv}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExportJson}>
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleDownloadTemplate}>
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import button */}
          <input
            accept=".csv,.json"
            className="hidden"
            onChange={handleImport}
            ref={fileInputRef}
            type="file"
          />
          <Button
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="outline"
          >
            {isImporting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-4 w-4" />
            )}
            Import
          </Button>

          <Badge variant="outline" className="gap-1.5">
            {isIos ? (
              <Apple className="h-3.5 w-3.5" />
            ) : (
              <Store className="h-3.5 w-3.5" />
            )}
            {isIos ? "App Store" : "Google Play"}
          </Badge>
        </div>
      </div>

      {/* REQUIRED: Core Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Core Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextField
            label="Category"
            value={str("category")}
            onChange={(v) => set("category", v || null)}
            maxLength={100}
            placeholder="e.g. Productivity, Health & Fitness"
          />
          <TextField
            label="One-liner"
            value={str("oneLiner")}
            onChange={(v) => set("oneLiner", v || null)}
            maxLength={300}
            placeholder="A short tagline describing your app"
          />
          <TextField
            label="Problem it solves"
            value={str("problem")}
            onChange={(v) => set("problem", v || null)}
            multiline
            placeholder="What problem does your app solve for users?"
          />
          <TextField
            label="Main Benefit"
            value={str("mainBenefit")}
            onChange={(v) => set("mainBenefit", v || null)}
            multiline
            placeholder="The #1 benefit users get from your app"
          />
          <MultiInput
            label="Key Features"
            values={arr("keyFeatures")}
            onChange={(v) => set("keyFeatures", v.length ? v : null)}
            placeholder="Add a key feature..."
          />
          <TextField
            label="Differentiator"
            value={str("differentiator")}
            onChange={(v) => set("differentiator", v || null)}
            multiline
            placeholder="What makes your app unique vs competitors?"
          />

          {/* Tone & Branding */}
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tone & Branding
            </p>
            <div className="space-y-4">
              <TextField
                label="Tone"
                value={str("tone")}
                onChange={(v) => set("tone", v || null)}
                maxLength={50}
                placeholder="e.g. Professional, Casual, Playful"
              />
              <TextField
                label="Brand Voice Example"
                value={str("brandVoiceExample")}
                onChange={(v) => set("brandVoiceExample", v || null)}
                multiline
                placeholder="Paste a sentence that captures your brand voice"
              />
              <MultiInput
                label="Words to Include"
                values={arr("wordsToInclude")}
                onChange={(v) => set("wordsToInclude", v.length ? v : null)}
                placeholder="Add a word..."
              />
              <MultiInput
                label="Words to Avoid"
                values={arr("wordsToAvoid")}
                onChange={(v) => set("wordsToAvoid", v.length ? v : null)}
                placeholder="Add a word..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      {/* Optional sections */}
      <Section title="Audience & Target">
        <TextField
          label="Target Audience"
          value={str("targetAudience")}
          onChange={(v) => set("targetAudience", v || null)}
          multiline
          placeholder="Who is your ideal user? Demographics, interests..."
        />
        <MultiInput
          label="Pain Points"
          values={arr("painPoints")}
          onChange={(v) => set("painPoints", v.length ? v : null)}
          placeholder="Add a pain point..."
        />
        <TextField
          label="User Language / Tone"
          value={str("userLanguage")}
          onChange={(v) => set("userLanguage", v || null)}
          placeholder="How do your users talk about this problem?"
        />
      </Section>

      <Section title="Competitors">
        <MultiInput
          label="Competitor Links"
          values={arr("competitors")}
          onChange={(v) => set("competitors", v.length ? v : null)}
          placeholder="App Store or Google Play link..."
        />
      </Section>

      <Section title="Social Proof">
        <TextField
          label="Download Count"
          value={str("downloadCount")}
          onChange={(v) => set("downloadCount", v || null)}
          maxLength={50}
          placeholder="e.g. 1M+, 500K+"
        />
        <MultiInput
          label="Awards"
          values={arr("awards")}
          onChange={(v) => set("awards", v.length ? v : null)}
          placeholder="Add an award..."
        />
        <MultiInput
          label="Press Quotes"
          values={arr("pressQuotes")}
          onChange={(v) => set("pressQuotes", v.length ? v : null)}
          placeholder="Add a press quote..."
        />
        <MultiInput
          label="Testimonials"
          values={arr("testimonials")}
          onChange={(v) => set("testimonials", v.length ? v : null)}
          placeholder="Add a testimonial..."
        />
      </Section>

      <Section title="Product Details">
        <TextField
          label="Pricing Model"
          value={str("pricingModel")}
          onChange={(v) => set("pricingModel", v || null)}
          maxLength={50}
          placeholder="e.g. Freemium, Subscription, One-time"
        />
        <TextField
          label="Price"
          value={str("price")}
          onChange={(v) => set("price", v || null)}
          maxLength={100}
          placeholder="e.g. Free, $4.99/month, $29.99/year"
        />
        <MultiInput
          label="Free Features"
          values={arr("freeFeatures")}
          onChange={(v) => set("freeFeatures", v.length ? v : null)}
          placeholder="Add a free feature..."
        />
        <MultiInput
          label="Premium Features"
          values={arr("premiumFeatures")}
          onChange={(v) => set("premiumFeatures", v.length ? v : null)}
          placeholder="Add a premium feature..."
        />
      </Section>

      <Section title="Keywords">
        <MultiInput
          label="Must Include Keywords"
          values={arr("mustIncludeKeywords")}
          onChange={(v) => set("mustIncludeKeywords", v.length ? v : null)}
          placeholder="Add a keyword..."
        />
        <MultiInput
          label="Long-tail Keywords"
          values={arr("longTailKeywords")}
          onChange={(v) => set("longTailKeywords", v.length ? v : null)}
          placeholder="Add a keyword phrase..."
        />
        <MultiInput
          label="Exclude Keywords"
          values={arr("excludeKeywords")}
          onChange={(v) => set("excludeKeywords", v.length ? v : null)}
          placeholder="Add a keyword to exclude..."
        />
      </Section>

      {/* App Identity (read-only, collapsed) */}
      <Section title="App Identity">
        <div className="divide-y divide-border">
          <InfoRow label="Bundle ID" value={data.bundleId} />
          <InfoRow
            label={isIos ? "Apple ID" : "Google Play ID"}
            value={data.externalId}
          />
          <InfoRow
            label="Platform"
            value={
              <Badge variant="secondary" className="text-xs">
                {isIos ? "iOS" : "Android"}
              </Badge>
            }
          />
          {data.status && (
            <InfoRow
              label="Status"
              value={
                <Badge variant="outline" className="text-xs">
                  {data.status}
                </Badge>
              }
            />
          )}
        </div>
      </Section>

      {/* Store (read-only, collapsed) */}
      {data.store && (
        <Section title="Store">
          <div className="divide-y divide-border">
            <InfoRow label="Store Name" value={data.store.name} />
            <InfoRow
              label="Store Type"
              value={
                data.store.type === "app_store"
                  ? "App Store Connect"
                  : "Google Play Console"
              }
            />
          </div>
        </Section>
      )}

      {/* Dates (read-only, collapsed) */}
      <Section title="Dates">
        <div className="divide-y divide-border">
          <InfoRow label="Created" value={formatDate(data.createdAt)} />
          <InfoRow label="Updated" value={formatDate(data.updatedAt)} />
          <InfoRow
            label="Last Synced"
            value={formatDate(data.lastSyncedAt)}
          />
        </div>
      </Section>
    </div>
  );
}
