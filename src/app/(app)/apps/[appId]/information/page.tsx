"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Apple,
  ChevronRight,
  Info,
  Link2,
  Loader2,
  Lock,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import {
  exportProfileCsv,
  exportProfileJson,
  generateProfileTemplate,
  parseProfileFile,
} from "@/lib/aso-profile-csv";
import { FIELD_HINTS } from "@/lib/aso-profile-hints";
import type { FieldHint } from "@/lib/aso-profile-hints";
import { downloadFile } from "@/lib/listings-csv";

import { ActionsMenu } from "@/components/actions-menu";
import type { ActionsMenuAction } from "@/components/actions-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CharacterCounter } from "@/components/character-counter";
import { useApp, useApps } from "@/hooks/use-apps";
import {
  useAsoProfile,
  useCopyFromAsoProfile,
  useUpdateAsoProfile,
} from "@/hooks/use-aso-profile";
import { useAutoSave } from "@/hooks/use-auto-save";
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

function FieldTooltip({ hint }: { hint: FieldHint }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p>{hint.description}</p>
        <p className="mt-1 italic text-muted-foreground">
          e.g. {hint.example}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function MultiInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
  disabled,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: FieldHint;
  disabled?: boolean;
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
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">{label}</Label>
        {hint && <FieldTooltip hint={hint} />}
      </div>
      {!disabled && (
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
      )}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((item, i) => (
            <Badge
              key={`${item}-${i}`}
              variant="secondary"
              className={disabled ? "" : "cursor-pointer gap-1 pr-1.5"}
              onClick={disabled ? undefined : () => removeItem(i)}
            >
              {item}
              {!disabled && (
                <span className="ml-0.5 text-muted-foreground hover:text-foreground">
                  ×
                </span>
              )}
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
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
  hint?: FieldHint;
  disabled?: boolean;
}) {
  const Component = multiline ? Textarea : Input;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">{label}</Label>
          {hint && <FieldTooltip hint={hint} />}
        </div>
        {maxLength && (
          <CharacterCounter current={value.length} max={maxLength} />
        )}
      </div>
      <Component
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
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

  const allApps = useApps();
  const copyFrom = useCopyFromAsoProfile(appId);

  const isLocked = profile.data?.locked === true;
  const lockedGroupId = profile.data?.groupId;

  const [form, setForm] = useState<AsoProfileInput>(EMPTY_PROFILE);
  const [initialized, setInitialized] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [selectedSourceAppId, setSelectedSourceAppId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (profile.data?.asoProfile !== undefined && !initialized) {
      setForm(profileToForm(profile.data.asoProfile));
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

  const { saveNow } = useAutoSave({
    data: form,
    onSave: (data) => updateProfile.mutateAsync(data),
    enabled: initialized && !isLocked,
  });

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

        // Merge imported fields into current form (use updater to avoid stale closure)
        let merged: AsoProfileInput;
        setForm((prev) => {
          merged = { ...prev };
          for (const [key, value] of Object.entries(imported)) {
            if (value !== undefined) {
              (merged as Record<string, unknown>)[key] = value;
            }
          }
          return merged;
        });
        await saveNow(merged!);

        toast.success("Profile imported and saved");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Import failed";
        toast.error(message);
      } finally {
        setIsImporting(false);
      }
    },
    [saveNow],
  );

  const handleCopyAiPrompt = useCallback(() => {
    const appName = app.data?.name ?? "My App";
    const platform = app.data?.platform === "ios" ? "iOS (App Store)" : "Android (Google Play)";
    const bundleId = app.data?.bundleId ?? "";

    const fields = [
      { key: "category", label: "Category", desc: "App category from the store", type: "string" },
      { key: "oneLiner", label: "One-liner", desc: "One-sentence tagline", type: "string" },
      { key: "problem", label: "Problem", desc: "What user problem does the app solve?", type: "string" },
      { key: "mainBenefit", label: "Main Benefit", desc: "The #1 value proposition", type: "string" },
      { key: "keyFeatures", label: "Key Features", desc: "3-7 core features", type: "string[]" },
      { key: "differentiator", label: "Differentiator", desc: "What's unique vs competitors?", type: "string" },
      { key: "tone", label: "Tone", desc: "Communication style (e.g. Friendly, Professional)", type: "string" },
      { key: "brandVoiceExample", label: "Brand Voice Example", desc: "A sentence in the brand's voice", type: "string" },
      { key: "wordsToInclude", label: "Words to Include", desc: "Brand vocabulary to use", type: "string[]" },
      { key: "wordsToAvoid", label: "Words to Avoid", desc: "Words the brand should never use", type: "string[]" },
      { key: "targetAudience", label: "Target Audience", desc: "Ideal user profile — demographics, interests", type: "string" },
      { key: "painPoints", label: "Pain Points", desc: "User frustrations the app addresses", type: "string[]" },
      { key: "userLanguage", label: "User Language", desc: "How users naturally describe the problem", type: "string" },
      { key: "competitors", label: "Competitors", desc: "Links to competitor apps", type: "string[]" },
      { key: "competitiveAdvantage", label: "Competitive Advantage", desc: "Key advantage over competitors", type: "string" },
      { key: "positioning", label: "Positioning", desc: "Market positioning statement", type: "string" },
      { key: "downloadCount", label: "Download Count", desc: "Total download count", type: "string" },
      { key: "awards", label: "Awards", desc: "Awards or recognitions", type: "string[]" },
      { key: "pressQuotes", label: "Press Quotes", desc: "Notable press mentions", type: "string[]" },
      { key: "testimonials", label: "Testimonials", desc: "User testimonials", type: "string[]" },
      { key: "pricingModel", label: "Pricing Model", desc: "How the app is monetized (e.g. Freemium, Subscription)", type: "string" },
      { key: "price", label: "Price", desc: "Pricing details", type: "string" },
      { key: "freeFeatures", label: "Free Features", desc: "Features in the free tier", type: "string[]" },
      { key: "premiumFeatures", label: "Premium Features", desc: "Features exclusive to paid users", type: "string[]" },
      { key: "mustIncludeKeywords", label: "Must Include Keywords", desc: "Keywords that must appear in store listing", type: "string[]" },
      { key: "longTailKeywords", label: "Long-tail Keywords", desc: "Multi-word keyword phrases to target", type: "string[]" },
      { key: "excludeKeywords", label: "Exclude Keywords", desc: "Keywords to avoid in store listing", type: "string[]" },
    ];

    const questions = fields
      .map((f, i) => `${i + 1}. "${f.key}" (${f.type}): ${f.desc}`)
      .join("\n");

    const prompt = `I need help filling out the ASO (App Store Optimization) profile for my app.

App: ${appName}
Platform: ${platform}
Bundle ID: ${bundleId}

Please answer each of the following questions and return the result as valid JSON with the exact keys shown below. For string[] fields, return an array of strings. For string fields, return a string or null if unknown.

${questions}

Return ONLY valid JSON (no markdown, no code fences) with these exact keys:
{
${fields.map((f) => `  "${f.key}": ${f.type === "string[]" ? '["..."]' : '"..."'}`).join(",\n")}
}`;

    navigator.clipboard.writeText(prompt);
    toast.success("AI prompt copied to clipboard");
  }, [app.data]);

  const handleCopyFrom = useCallback(async () => {
    if (!selectedSourceAppId) return;
    try {
      const result = await copyFrom.mutateAsync(selectedSourceAppId);
      const newForm = profileToForm(result);
      setForm(newForm);
      // Sync auto-save baseline so it doesn't trigger a redundant save
      await saveNow(newForm);
      setShowCopyDialog(false);
      setSelectedSourceAppId(null);
      toast.success("ASO Profile copied successfully");
    } catch {
      toast.error("Failed to copy ASO Profile");
    }
  }, [selectedSourceAppId, copyFrom, saveNow]);

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

  const infoMenuActions: ActionsMenuAction[] = [
    {
      key: "ai-prompt",
      label: "AI Prompt",
      icon: "copy",
      onSelect: handleCopyAiPrompt,
    },
    {
      key: "export-csv",
      label: "Export CSV",
      icon: "download",
      onSelect: handleExportCsv,
      separatorBefore: true,
    },
    {
      key: "export-json",
      label: "Export JSON",
      icon: "download",
      onSelect: handleExportJson,
    },
    {
      key: "download-template",
      label: "Download Template",
      icon: "download",
      onSelect: handleDownloadTemplate,
    },
    {
      key: "copy-from",
      label: "Copy From App",
      icon: "copy",
      onSelect: () => setShowCopyDialog(true),
      separatorBefore: true,
    },
    {
      key: "import",
      label: "Import",
      icon: "upload",
      disabled: isImporting,
      onSelect: () => {},
    },
  ];

  return (
    <TooltipProvider>
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
          <Badge variant="outline" className="gap-1.5">
            {isIos ? (
              <Apple className="h-3.5 w-3.5" />
            ) : (
              <Store className="h-3.5 w-3.5" />
            )}
            {isIos ? "App Store" : "Google Play"}
          </Badge>

          {/* Three-dot menu */}
          {!isLocked && (
            <ActionsMenu
              actions={infoMenuActions}
              importConfig={{ accept: ".csv,.json", onChange: handleImport }}
            />
          )}
        </div>
      </div>

      {/* Locked banner */}
      {isLocked && lockedGroupId && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-400">
              ASO Profile is managed at group level
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This app&apos;s profile is read-only because the group has shared ASO profile enabled.
            </p>
            <Link
              href={`/groups/${lockedGroupId}/information`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300"
            >
              <Link2 className="h-3.5 w-3.5" />
              Go to group settings
            </Link>
          </div>
        </div>
      )}

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
            placeholder="e.g. Productivity, Health & Fitness"
            hint={FIELD_HINTS.category}
            disabled={isLocked}
          />
          <TextField
            label="One-liner"
            value={str("oneLiner")}
            onChange={(v) => set("oneLiner", v || null)}
            placeholder="A short tagline describing your app"
            hint={FIELD_HINTS.oneLiner}
            disabled={isLocked}
          />
          <TextField
            label="Problem it solves"
            value={str("problem")}
            onChange={(v) => set("problem", v || null)}
            multiline
            placeholder="What problem does your app solve for users?"
            hint={FIELD_HINTS.problem}
            disabled={isLocked}
          />
          <TextField
            label="Main Benefit"
            value={str("mainBenefit")}
            onChange={(v) => set("mainBenefit", v || null)}
            multiline
            placeholder="The #1 benefit users get from your app"
            hint={FIELD_HINTS.mainBenefit}
            disabled={isLocked}
          />
          <MultiInput
            label="Key Features"
            values={arr("keyFeatures")}
            onChange={(v) => set("keyFeatures", v.length ? v : null)}
            placeholder="Add a key feature..."
            hint={FIELD_HINTS.keyFeatures}
            disabled={isLocked}
          />
          <TextField
            label="Differentiator"
            value={str("differentiator")}
            onChange={(v) => set("differentiator", v || null)}
            multiline
            placeholder="What makes your app unique vs competitors?"
            hint={FIELD_HINTS.differentiator}
            disabled={isLocked}
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
                placeholder="e.g. Professional, Casual, Playful"
                hint={FIELD_HINTS.tone}
                disabled={isLocked}
              />
              <TextField
                label="Brand Voice Example"
                value={str("brandVoiceExample")}
                onChange={(v) => set("brandVoiceExample", v || null)}
                multiline
                placeholder="Paste a sentence that captures your brand voice"
                hint={FIELD_HINTS.brandVoiceExample}
                disabled={isLocked}
              />
              <MultiInput
                label="Words to Include"
                values={arr("wordsToInclude")}
                onChange={(v) => set("wordsToInclude", v.length ? v : null)}
                placeholder="Add a word..."
                hint={FIELD_HINTS.wordsToInclude}
                disabled={isLocked}
              />
              <MultiInput
                label="Words to Avoid"
                values={arr("wordsToAvoid")}
                onChange={(v) => set("wordsToAvoid", v.length ? v : null)}
                placeholder="Add a word..."
                hint={FIELD_HINTS.wordsToAvoid}
                disabled={isLocked}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optional sections */}
      <Section title="Audience & Target">
        <TextField
          label="Target Audience"
          value={str("targetAudience")}
          onChange={(v) => set("targetAudience", v || null)}
          multiline
          placeholder="Who is your ideal user? Demographics, interests..."
          hint={FIELD_HINTS.targetAudience}
          disabled={isLocked}
        />
        <MultiInput
          label="Pain Points"
          values={arr("painPoints")}
          onChange={(v) => set("painPoints", v.length ? v : null)}
          placeholder="Add a pain point..."
          hint={FIELD_HINTS.painPoints}
          disabled={isLocked}
        />
        <TextField
          label="User Language / Tone"
          value={str("userLanguage")}
          onChange={(v) => set("userLanguage", v || null)}
          placeholder="How do your users talk about this problem?"
          hint={FIELD_HINTS.userLanguage}
          disabled={isLocked}
        />
      </Section>

      <Section title="Competitors">
        <MultiInput
          label="Competitor Links"
          values={arr("competitors")}
          onChange={(v) => set("competitors", v.length ? v : null)}
          placeholder="App Store or Google Play link..."
          hint={FIELD_HINTS.competitors}
          disabled={isLocked}
        />
      </Section>

      <Section title="Social Proof">
        <TextField
          label="Download Count"
          value={str("downloadCount")}
          onChange={(v) => set("downloadCount", v || null)}
          placeholder="e.g. 1M+, 500K+"
          hint={FIELD_HINTS.downloadCount}
          disabled={isLocked}
        />
        <MultiInput
          label="Awards"
          values={arr("awards")}
          onChange={(v) => set("awards", v.length ? v : null)}
          placeholder="Add an award..."
          hint={FIELD_HINTS.awards}
          disabled={isLocked}
        />
        <MultiInput
          label="Press Quotes"
          values={arr("pressQuotes")}
          onChange={(v) => set("pressQuotes", v.length ? v : null)}
          placeholder="Add a press quote..."
          hint={FIELD_HINTS.pressQuotes}
          disabled={isLocked}
        />
        <MultiInput
          label="Testimonials"
          values={arr("testimonials")}
          onChange={(v) => set("testimonials", v.length ? v : null)}
          placeholder="Add a testimonial..."
          hint={FIELD_HINTS.testimonials}
          disabled={isLocked}
        />
      </Section>

      <Section title="Product Details">
        <TextField
          label="Pricing Model"
          value={str("pricingModel")}
          onChange={(v) => set("pricingModel", v || null)}
          placeholder="e.g. Freemium, Subscription, One-time"
          hint={FIELD_HINTS.pricingModel}
          disabled={isLocked}
        />
        <TextField
          label="Price"
          value={str("price")}
          onChange={(v) => set("price", v || null)}
          placeholder="e.g. Free, $4.99/month, $29.99/year"
          hint={FIELD_HINTS.price}
          disabled={isLocked}
        />
        <MultiInput
          label="Free Features"
          values={arr("freeFeatures")}
          onChange={(v) => set("freeFeatures", v.length ? v : null)}
          placeholder="Add a free feature..."
          hint={FIELD_HINTS.freeFeatures}
          disabled={isLocked}
        />
        <MultiInput
          label="Premium Features"
          values={arr("premiumFeatures")}
          onChange={(v) => set("premiumFeatures", v.length ? v : null)}
          placeholder="Add a premium feature..."
          hint={FIELD_HINTS.premiumFeatures}
          disabled={isLocked}
        />
      </Section>

      <Section title="Keywords">
        <MultiInput
          label="Must Include Keywords"
          values={arr("mustIncludeKeywords")}
          onChange={(v) => set("mustIncludeKeywords", v.length ? v : null)}
          placeholder="Add a keyword..."
          hint={FIELD_HINTS.mustIncludeKeywords}
          disabled={isLocked}
        />
        <MultiInput
          label="Long-tail Keywords"
          values={arr("longTailKeywords")}
          onChange={(v) => set("longTailKeywords", v.length ? v : null)}
          placeholder="Add a keyword phrase..."
          hint={FIELD_HINTS.longTailKeywords}
          disabled={isLocked}
        />
        <MultiInput
          label="Exclude Keywords"
          values={arr("excludeKeywords")}
          onChange={(v) => set("excludeKeywords", v.length ? v : null)}
          placeholder="Add a keyword to exclude..."
          hint={FIELD_HINTS.excludeKeywords}
          disabled={isLocked}
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

      {/* Copy From Dialog */}
      <Dialog
        open={showCopyDialog}
        onOpenChange={(open) => {
          setShowCopyDialog(open);
          if (!open) setSelectedSourceAppId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy ASO Profile</DialogTitle>
            <DialogDescription>
              Select an app to copy its ASO Profile to{" "}
              <span className="font-medium text-foreground">
                {data.name}
              </span>
              . This will overwrite the current profile.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto py-2">
            {allApps.data
              ?.filter((a) => a.id !== appId)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    selectedSourceAppId === a.id
                      ? "bg-primary/10 ring-1 ring-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedSourceAppId(a.id)}
                >
                  {a.iconUrl ? (
                    <img
                      src={a.iconUrl}
                      alt={a.name}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                      {a.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.bundleId}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {a.platform === "ios" ? "iOS" : "Android"}
                  </Badge>
                </button>
              ))}
            {allApps.data?.filter((a) => a.id !== appId).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No other apps in workspace
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCopyDialog(false);
                setSelectedSourceAppId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCopyFrom}
              disabled={!selectedSourceAppId || copyFrom.isPending}
            >
              {copyFrom.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Copy Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
