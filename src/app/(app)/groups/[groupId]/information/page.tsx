"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, ChevronRight, Info, Loader2, Zap } from "lucide-react";
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CharacterCounter } from "@/components/character-counter";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppGroups, useGenerateGroupListings } from "@/hooks/use-app-groups";
import { useAsoProfile } from "@/hooks/use-aso-profile";
import {
  useEnableSharedProfile,
  useGroupAsoProfile,
  useUpdateGroupAsoProfile,
} from "@/hooks/use-group-aso-profile";
import { useAutoSave } from "@/hooks/use-auto-save";
import type { AsoProfileInput, GroupAsoProfileInput } from "@/lib/types";

const EMPTY_PROFILE: GroupAsoProfileInput = {
  category: null, differentiator: null, keyFeatures: null, mainBenefit: null,
  oneLiner: null, problem: null, painPoints: null, targetAudience: null,
  userLanguage: null, competitiveAdvantage: null, competitors: null,
  positioning: null, brandVoiceExample: null, tone: null, wordsToAvoid: null,
  wordsToInclude: null, awards: null, downloadCount: null, pressQuotes: null,
  testimonials: null, freeFeatures: null, premiumFeatures: null, price: null,
  pricingModel: null, excludeKeywords: null, longTailKeywords: null,
  mustIncludeKeywords: null,
};

function FieldTooltip({ hint }: { hint: FieldHint }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p>{hint.description}</p>
        <p className="mt-1 italic text-muted-foreground">e.g. {hint.example}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function MultiInput({
  label, values, onChange, placeholder, hint, disabled,
}: {
  label: string; values: string[]; onChange: (values: string[]) => void;
  placeholder?: string; hint?: FieldHint; disabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const addItem = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInput("");
    }
  };
  const removeItem = (index: number) => onChange(values.filter((_, i) => i !== index));

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
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
            placeholder={placeholder ?? `Add ${label.toLowerCase()}...`}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!input.trim()}>
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
              {!disabled && <span className="ml-0.5 text-muted-foreground hover:text-foreground">x</span>}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none pb-2 transition-colors hover:bg-muted/50">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
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

function TextField({
  label, value, onChange, maxLength, multiline = false, placeholder, hint, disabled,
}: {
  label: string; value: string; onChange: (value: string) => void;
  maxLength?: number; multiline?: boolean; placeholder?: string;
  hint?: FieldHint; disabled?: boolean;
}) {
  const Component = multiline ? Textarea : Input;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">{label}</Label>
          {hint && <FieldTooltip hint={hint} />}
        </div>
        {maxLength && <CharacterCounter current={value.length} max={maxLength} />}
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

function profileToForm(data: GroupAsoProfileInput | null | undefined): GroupAsoProfileInput {
  if (!data) return { ...EMPTY_PROFILE };
  return { ...EMPTY_PROFILE, ...data };
}

function AsoProfileForm({
  set, str, arr, disabled,
}: {
  set: <K extends keyof GroupAsoProfileInput>(key: K, value: GroupAsoProfileInput[K]) => void;
  str: (key: keyof GroupAsoProfileInput) => string;
  arr: (key: keyof GroupAsoProfileInput) => string[];
  disabled?: boolean;
}) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Core Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextField label="Category" value={str("category")} onChange={(v) => set("category", v || null)} placeholder="e.g. Productivity" hint={FIELD_HINTS.category} disabled={disabled} />
          <TextField label="One-liner" value={str("oneLiner")} onChange={(v) => set("oneLiner", v || null)} placeholder="A short tagline" hint={FIELD_HINTS.oneLiner} disabled={disabled} />
          <TextField label="Problem it solves" value={str("problem")} onChange={(v) => set("problem", v || null)} multiline placeholder="What problem does your app solve?" hint={FIELD_HINTS.problem} disabled={disabled} />
          <TextField label="Main Benefit" value={str("mainBenefit")} onChange={(v) => set("mainBenefit", v || null)} multiline placeholder="The #1 benefit" hint={FIELD_HINTS.mainBenefit} disabled={disabled} />
          <MultiInput label="Key Features" values={arr("keyFeatures")} onChange={(v) => set("keyFeatures", v.length ? v : null)} placeholder="Add a key feature..." hint={FIELD_HINTS.keyFeatures} disabled={disabled} />
          <TextField label="Differentiator" value={str("differentiator")} onChange={(v) => set("differentiator", v || null)} multiline placeholder="What makes your app unique?" hint={FIELD_HINTS.differentiator} disabled={disabled} />

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tone & Branding</p>
            <div className="space-y-4">
              <TextField label="Tone" value={str("tone")} onChange={(v) => set("tone", v || null)} placeholder="e.g. Professional, Casual" hint={FIELD_HINTS.tone} disabled={disabled} />
              <TextField label="Brand Voice Example" value={str("brandVoiceExample")} onChange={(v) => set("brandVoiceExample", v || null)} multiline placeholder="A sentence in brand voice" hint={FIELD_HINTS.brandVoiceExample} disabled={disabled} />
              <MultiInput label="Words to Include" values={arr("wordsToInclude")} onChange={(v) => set("wordsToInclude", v.length ? v : null)} placeholder="Add a word..." hint={FIELD_HINTS.wordsToInclude} disabled={disabled} />
              <MultiInput label="Words to Avoid" values={arr("wordsToAvoid")} onChange={(v) => set("wordsToAvoid", v.length ? v : null)} placeholder="Add a word..." hint={FIELD_HINTS.wordsToAvoid} disabled={disabled} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Section title="Audience & Target">
        <TextField label="Target Audience" value={str("targetAudience")} onChange={(v) => set("targetAudience", v || null)} multiline placeholder="Who is your ideal user?" hint={FIELD_HINTS.targetAudience} disabled={disabled} />
        <MultiInput label="Pain Points" values={arr("painPoints")} onChange={(v) => set("painPoints", v.length ? v : null)} placeholder="Add a pain point..." hint={FIELD_HINTS.painPoints} disabled={disabled} />
        <TextField label="User Language" value={str("userLanguage")} onChange={(v) => set("userLanguage", v || null)} placeholder="How users talk about this" hint={FIELD_HINTS.userLanguage} disabled={disabled} />
      </Section>

      <Section title="Competitors">
        <MultiInput label="Competitor Links" values={arr("competitors")} onChange={(v) => set("competitors", v.length ? v : null)} placeholder="Store link..." hint={FIELD_HINTS.competitors} disabled={disabled} />
        <TextField label="Competitive Advantage" value={str("competitiveAdvantage")} onChange={(v) => set("competitiveAdvantage", v || null)} multiline hint={FIELD_HINTS.competitiveAdvantage} disabled={disabled} />
        <TextField label="Positioning" value={str("positioning")} onChange={(v) => set("positioning", v || null)} multiline hint={FIELD_HINTS.positioning} disabled={disabled} />
      </Section>

      <Section title="Social Proof">
        <TextField label="Download Count" value={str("downloadCount")} onChange={(v) => set("downloadCount", v || null)} placeholder="e.g. 1M+" hint={FIELD_HINTS.downloadCount} disabled={disabled} />
        <MultiInput label="Awards" values={arr("awards")} onChange={(v) => set("awards", v.length ? v : null)} placeholder="Add an award..." hint={FIELD_HINTS.awards} disabled={disabled} />
        <MultiInput label="Press Quotes" values={arr("pressQuotes")} onChange={(v) => set("pressQuotes", v.length ? v : null)} placeholder="Add a press quote..." hint={FIELD_HINTS.pressQuotes} disabled={disabled} />
        <MultiInput label="Testimonials" values={arr("testimonials")} onChange={(v) => set("testimonials", v.length ? v : null)} placeholder="Add a testimonial..." hint={FIELD_HINTS.testimonials} disabled={disabled} />
      </Section>

      <Section title="Product Details">
        <TextField label="Pricing Model" value={str("pricingModel")} onChange={(v) => set("pricingModel", v || null)} placeholder="e.g. Freemium" hint={FIELD_HINTS.pricingModel} disabled={disabled} />
        <TextField label="Price" value={str("price")} onChange={(v) => set("price", v || null)} placeholder="e.g. $4.99/month" hint={FIELD_HINTS.price} disabled={disabled} />
        <MultiInput label="Free Features" values={arr("freeFeatures")} onChange={(v) => set("freeFeatures", v.length ? v : null)} placeholder="Add a free feature..." hint={FIELD_HINTS.freeFeatures} disabled={disabled} />
        <MultiInput label="Premium Features" values={arr("premiumFeatures")} onChange={(v) => set("premiumFeatures", v.length ? v : null)} placeholder="Add a premium feature..." hint={FIELD_HINTS.premiumFeatures} disabled={disabled} />
      </Section>

      <Section title="Keywords">
        <MultiInput label="Must Include Keywords" values={arr("mustIncludeKeywords")} onChange={(v) => set("mustIncludeKeywords", v.length ? v : null)} placeholder="Add a keyword..." hint={FIELD_HINTS.mustIncludeKeywords} disabled={disabled} />
        <MultiInput label="Long-tail Keywords" values={arr("longTailKeywords")} onChange={(v) => set("longTailKeywords", v.length ? v : null)} placeholder="Add a phrase..." hint={FIELD_HINTS.longTailKeywords} disabled={disabled} />
        <MultiInput label="Exclude Keywords" values={arr("excludeKeywords")} onChange={(v) => set("excludeKeywords", v.length ? v : null)} placeholder="Add a keyword..." hint={FIELD_HINTS.excludeKeywords} disabled={disabled} />
      </Section>
    </>
  );
}

export default function GroupInformationPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const groups = useAppGroups();
  const groupProfile = useGroupAsoProfile(groupId);
  const updateGroupProfile = useUpdateGroupAsoProfile(groupId);
  const enableSharedProfile = useEnableSharedProfile(groupId);

  const group = groups.data?.find((g) => g.id === groupId);
  const useSharedProfile = groupProfile.data?.useSharedProfile ?? false;

  // Enable dialog state
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [sourceAppId, setSourceAppId] = useState<string>("empty");
  const [isImporting, setIsImporting] = useState(false);

  // Group listing generation state
  const generateListings = useGenerateGroupListings();
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [translateToOthers, setTranslateToOthers] = useState(false);

  // Group profile form state
  const [form, setForm] = useState<GroupAsoProfileInput>(EMPTY_PROFILE);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (groupProfile.data?.asoProfile !== undefined && !initialized) {
      setForm(profileToForm(groupProfile.data.asoProfile));
      setInitialized(true);
    }
  }, [groupProfile.data, initialized]);

  const set = useCallback(
    <K extends keyof GroupAsoProfileInput>(key: K, value: GroupAsoProfileInput[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const str = useCallback(
    (key: keyof GroupAsoProfileInput): string => (form[key] as string) ?? "",
    [form],
  );

  const arr = useCallback(
    (key: keyof GroupAsoProfileInput): string[] => (form[key] as string[]) ?? [],
    [form],
  );

  const { saveNow } = useAutoSave({
    data: form,
    onSave: (data) => updateGroupProfile.mutateAsync(data),
    enabled: initialized && useSharedProfile,
  });

  const handleExportCsv = useCallback(() => {
    const csv = exportProfileCsv(form as AsoProfileInput);
    const name = group?.name?.replace(/\s+/g, "-").toLowerCase() ?? "group";
    downloadFile(csv, `aso-profile-${name}.csv`, "text/csv");
  }, [form, group?.name]);

  const handleExportJson = useCallback(() => {
    const json = exportProfileJson(form as AsoProfileInput);
    const name = group?.name?.replace(/\s+/g, "-").toLowerCase() ?? "group";
    downloadFile(json, `aso-profile-${name}.json`, "application/json");
  }, [form, group?.name]);

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
          for (const err of errors) toast.error(err);
        }

        if (!imported) {
          setIsImporting(false);
          return;
        }

        let merged: GroupAsoProfileInput;
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
    const groupName = group?.name ?? "My App Group";
    const appNames = group?.members.map((m) => `${m.app.name} (${m.app.platform === "ios" ? "iOS" : "Android"})`).join(", ") ?? "";

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

    const prompt = `I need help filling out the ASO (App Store Optimization) profile for my app group.

App Group: ${groupName}
Apps: ${appNames}

This is a shared profile used across all apps in the group. Please answer each of the following questions and return the result as valid JSON with the exact keys shown below. For string[] fields, return an array of strings. For string fields, return a string or null if unknown.

${questions}

Return ONLY valid JSON (no markdown, no code fences) with these exact keys:
{
${fields.map((f) => `  "${f.key}": ${f.type === "string[]" ? '["..."]' : '"..."'}`).join(",\n")}
}`;

    navigator.clipboard.writeText(prompt);
    toast.success("AI prompt copied to clipboard");
  }, [group]);

  const handleEnableSharedProfile = async () => {
    try {
      const appId = sourceAppId === "empty" ? null : sourceAppId;
      const result = await enableSharedProfile.mutateAsync(appId);
      setEnableDialogOpen(false);
      setForm(profileToForm(result.asoProfile));
      setInitialized(true);
      toast.success("Shared ASO profile enabled");
    } catch {
      toast.error("Failed to enable shared profile");
    }
  };

  const actionsMenuItems = useMemo<ActionsMenuAction[]>(() => [
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
      key: "import",
      label: "Import",
      icon: "upload",
      disabled: isImporting,
      onSelect: () => {},
    },
  ], [handleCopyAiPrompt, handleExportCsv, handleExportJson, handleDownloadTemplate, isImporting]);

  if (groups.isLoading || groupProfile.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{group.name}</h1>
            <p className="text-sm text-muted-foreground">
              {group.members.length} app{group.members.length !== 1 ? "s" : ""} in this group
            </p>
          </div>

          <div className="flex items-center gap-2">
            {group.members.length > 0 && (
              <Button
                size="sm"
                onClick={() => setGenerateDialogOpen(true)}
                disabled={generateListings.isPending}
              >
                {generateListings.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                )}
                Generate listings
              </Button>
            )}
            {useSharedProfile && (
              <ActionsMenu
                actions={actionsMenuItems}
                importConfig={{ accept: ".csv,.json", onChange: handleImport }}
              />
            )}
          </div>
        </div>

        {/* Shared profile disabled banner */}
        {!useSharedProfile && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-500">
                Shared ASO profile is disabled
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enable it to manage a single ASO profile for all apps in this group.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSourceAppId(group.members[0]?.appId ?? "empty");
                setEnableDialogOpen(true);
              }}
              disabled={enableSharedProfile.isPending}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Enable
            </Button>
          </div>
        )}

        {/* Generate listings dialog */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Listings for Group</DialogTitle>
              <DialogDescription>
                AI will generate listing drafts (title, descriptions, keywords…)
                for {group.members.length === 1 ? "the app" : `all ${group.members.length} apps`} in
                this group using {useSharedProfile ? "the shared" : "each app's"} ASO
                profile. Drafts are written in en-US — nothing is published.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                id="translate-to-others"
                checked={translateToOthers}
                onCheckedChange={(v) => setTranslateToOthers(v === true)}
              />
              <Label htmlFor="translate-to-others" className="cursor-pointer text-sm">
                Also translate to every other language of each app
              </Label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setGenerateDialogOpen(false);
                  try {
                    const { results } = await generateListings.mutateAsync({
                      data: { translateToOthers },
                      groupId,
                    });
                    for (const r of results) {
                      const generated = Object.keys(r.generated).length;
                      const failed = r.errors.length;
                      if (failed === 0) {
                        const translated = r.translation?.translated;
                        toast.success(
                          `${r.appName} (${r.platform === "ios" ? "iOS" : "Android"}): ${generated} field${generated === 1 ? "" : "s"} generated${translated ? `, translated to ${translated} language${translated === 1 ? "" : "s"}` : ""}`,
                        );
                      } else {
                        toast.warning(
                          `${r.appName}: ${generated} generated, ${failed} failed — ${r.errors[0]?.message ?? ""}`,
                        );
                      }
                    }
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Generation failed",
                    );
                  }
                }}
                disabled={generateListings.isPending}
              >
                {generateListings.isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enable shared profile dialog */}
        <Dialog open={enableDialogOpen} onOpenChange={setEnableDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enable Shared ASO Profile</DialogTitle>
              <DialogDescription>
                All apps in this group will share a single ASO profile. Individual app profiles will become read-only.
              </DialogDescription>
            </DialogHeader>

            {group.members.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Start with profile from:
                </Label>
                <RadioGroup value={sourceAppId} onValueChange={setSourceAppId}>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="empty" id="source-empty" />
                    <Label htmlFor="source-empty" className="cursor-pointer text-sm">
                      Empty profile (start fresh)
                    </Label>
                  </div>
                  {group.members.map((member) => (
                    <div key={member.appId} className="flex items-center gap-3 rounded-lg border p-3">
                      <RadioGroupItem value={member.appId} id={`source-${member.appId}`} />
                      <Label htmlFor={`source-${member.appId}`} className="flex cursor-pointer items-center gap-2 text-sm">
                        {member.app.iconUrl && (
                          <img src={member.app.iconUrl} alt="" className="h-5 w-5 rounded object-cover" />
                        )}
                        {member.app.name}
                        <span className="text-muted-foreground">
                          ({member.app.platform === "ios" ? "iOS" : "Android"})
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEnableDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEnableSharedProfile} disabled={enableSharedProfile.isPending}>
                {enableSharedProfile.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Enable Shared Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Group profile form */}
        <AsoProfileForm
          set={set}
          str={str}
          arr={arr}
          disabled={!useSharedProfile}
        />

        {/* Per-app profiles (read-only) */}
        {useSharedProfile && group.members.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Apps
            </h2>
            {group.members.map((member) => (
              <AppProfileCollapsible key={member.appId} member={member} />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function AppProfileCollapsible({ member }: { member: { appId: string; app: { name: string; iconUrl: string | null; platform: string } } }) {
  const [open, setOpen] = useState(false);
  const profile = useAsoProfile(member.appId);

  const data = profile.data?.asoProfile;
  const form = profileToForm(data ?? null);

  const str = (key: keyof GroupAsoProfileInput): string => (form[key] as string) ?? "";
  const arr = (key: keyof GroupAsoProfileInput): string[] => (form[key] as string[]) ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none pb-2 transition-colors hover:bg-muted/50">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
              {member.app.iconUrl && (
                <img src={member.app.iconUrl} alt="" className="h-5 w-5 rounded object-cover" />
              )}
              {member.app.name}
              <span className="text-xs font-normal text-muted-foreground">
                ({member.app.platform === "ios" ? "iOS" : "Android"})
              </span>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {profile.isLoading ? (
              <Skeleton className="h-32 w-full rounded-lg" />
            ) : (
              <AsoProfileForm
                set={() => {}}
                str={str}
                arr={arr}
                disabled
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
