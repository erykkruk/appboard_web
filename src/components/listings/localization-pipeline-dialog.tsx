"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Globe,
  Languages,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useListing } from "@/hooks/use-listings";
import {
  type LanguageJob,
  type PipelineStage,
  useLocalizationPipeline,
} from "@/hooks/use-localization-pipeline";
import { cn } from "@/lib/utils";

export interface PipelineLanguage {
  /** Persistence id used by the caller's save handler. */
  localizationId: string;
  language: string;
  label: string;
}

export interface PipelineField {
  key: string;
  label: string;
}

interface LocalizationPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId: string;
  appName: string;
  platform: string;
  languages: PipelineLanguage[];
  /** AI-translatable fields (key + human label) to translate per language. */
  fields: PipelineField[];
  /** Read the current source-language field values when the run starts. */
  getSourceFields: (language: string) => Record<string, string>;
  /** Persist a reviewed result into a target language draft. */
  onSaveLanguage: (
    localizationId: string,
    fields: Record<string, string>,
  ) => Promise<void>;
}

function fieldLabelFor(fields: PipelineField[], key: string): string {
  return fields.find((f) => f.key === key)?.label ?? key;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  done: "Done",
  error: "Error",
  keywords: "Keywords…",
  pending: "Pending",
  "release-notes": "Release notes…",
  translating: "Translating…",
};

function StageIndicator({ job }: { job: LanguageJob }) {
  if (job.stage === "done") {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (job.stage === "error") {
    return <AlertCircle className="h-4 w-4 text-destructive" />;
  }
  if (job.stage === "pending") {
    return <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />;
  }
  return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
}

export function LocalizationPipelineDialog({
  open,
  onOpenChange,
  appId,
  appName,
  platform,
  languages,
  fields,
  getSourceFields,
  onSaveLanguage,
}: LocalizationPipelineDialogProps) {
  const pipeline = useLocalizationPipeline();

  const [sourceLanguage, setSourceLanguage] = useState<string>(
    languages[0]?.language ?? "",
  );
  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [includeKeywords, setIncludeKeywords] = useState(false);
  const [includeReleaseNotes, setIncludeReleaseNotes] = useState(false);
  const [releaseNotesChanges, setReleaseNotesChanges] = useState("");
  const [savingLanguage, setSavingLanguage] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Surface which fields the source language keeps verbatim (Do Not Translate);
  // the backend enforces this, so this is purely informational.
  const sourceListing = useListing(appId, sourceLanguage);
  const doNotTranslateLabels = useMemo(() => {
    const keys = sourceListing.data?.doNotTranslateFields ?? [];
    return keys.map((key) => fieldLabelFor(fields, key));
  }, [sourceListing.data?.doNotTranslateFields, fields]);

  const fieldLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const field of fields) {
      map[field.key] = field.label;
    }
    return map;
  }, [fields]);

  const availableTargets = useMemo(
    () => languages.filter((l) => l.language !== sourceLanguage),
    [languages, sourceLanguage],
  );

  const languageById = useMemo(() => {
    const map: Record<string, PipelineLanguage> = {};
    for (const lang of languages) {
      map[lang.language] = lang;
    }
    return map;
  }, [languages]);

  const toggleTarget = (language: string, checked: boolean) => {
    setTargets((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(language);
      } else {
        next.delete(language);
      }
      return next;
    });
  };

  const selectAllTargets = () => {
    setTargets(new Set(availableTargets.map((l) => l.language)));
  };

  const handleRun = async () => {
    const targetList = [...targets].filter((l) => l !== sourceLanguage);
    if (targetList.length === 0) {
      toast.error("Select at least one target language");
      return;
    }

    const sourceFields = getSourceFields(sourceLanguage);
    const hasContent = Object.values(sourceFields).some((v) => v?.trim());
    if (!hasContent) {
      toast.error(
        `No content in the source language (${sourceLanguage}) to translate`,
      );
      return;
    }

    await pipeline.run(targetList, {
      appId,
      appName,
      includeKeywords,
      includeReleaseNotes,
      platform,
      releaseNotesChanges,
      sourceFields,
      sourceLanguage,
    });
  };

  const handleSaveLanguage = async (language: string) => {
    const job = pipeline.jobs[language];
    const target = languageById[language];
    if (!job || job.stage !== "done" || !target) return;

    setSavingLanguage(language);
    try {
      await onSaveLanguage(target.localizationId, job.result);
      pipeline.markSaved(language);
      toast.success(`Saved translation: ${target.label}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Save failed";
      toast.error(`${target.label}: ${message}`);
    } finally {
      setSavingLanguage(null);
    }
  };

  const handleSaveAll = async () => {
    const savable = Object.values(pipeline.jobs).filter(
      (job) => job.stage === "done" && !job.saved,
    );
    if (savable.length === 0) return;

    setIsSavingAll(true);
    let saved = 0;
    for (const job of savable) {
      const target = languageById[job.language];
      if (!target) continue;
      try {
        await onSaveLanguage(target.localizationId, job.result);
        pipeline.markSaved(job.language);
        saved++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Save failed";
        toast.error(`${target.label}: ${message}`);
      }
    }
    setIsSavingAll(false);
    if (saved > 0) {
      toast.success(`Saved ${saved} language(s)`);
    }
  };

  const jobList = useMemo(
    () =>
      [...targets]
        .map((language) => pipeline.jobs[language])
        .filter((job): job is LanguageJob => job !== undefined),
    [targets, pipeline.jobs],
  );

  const hasResults = jobList.length > 0;
  const doneCount = jobList.filter((j) => j.stage === "done").length;
  const errorCount = jobList.filter((j) => j.stage === "error").length;
  const unsavedDone = jobList.filter(
    (j) => j.stage === "done" && !j.saved,
  ).length;

  const handleDialogChange = (next: boolean) => {
    if (!next && pipeline.isRunning) return; // don't close mid-run
    if (!next) {
      pipeline.reset();
      setTargets(new Set());
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Localization
          </DialogTitle>
          <DialogDescription>
            Translate the listing from the source language into the selected
            languages, optionally generate keywords and release notes, then save
            the results.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-6">
            {/* Source language */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Source language</Label>
              <Select
                value={sourceLanguage}
                onValueChange={(value) => {
                  setSourceLanguage(value);
                  setTargets((prev) => {
                    const next = new Set(prev);
                    next.delete(value);
                    return next;
                  });
                }}
                disabled={pipeline.isRunning}
              >
                <SelectTrigger className="w-full">
                  <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.language} value={lang.language}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {doNotTranslateLabels.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Skipped fields (Do not translate):{" "}
                  <span className="font-medium text-foreground">
                    {doNotTranslateLabels.join(", ")}
                  </span>{" "}
                  — copied verbatim from the source.
                </p>
              )}
            </div>

            {/* Target languages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Target languages</Label>
                {availableTargets.length > 0 && (
                  <Button
                    className="h-7 px-2 text-xs"
                    onClick={selectAllTargets}
                    disabled={pipeline.isRunning}
                    size="sm"
                    variant="ghost"
                  >
                    Select all
                  </Button>
                )}
              </div>
              {availableTargets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other languages. Add languages in the Languages tab.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableTargets.map((lang) => {
                    const id = `target-${lang.language}`;
                    return (
                      <div
                        className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2"
                        key={lang.language}
                      >
                        <Checkbox
                          checked={targets.has(lang.language)}
                          disabled={pipeline.isRunning}
                          id={id}
                          onCheckedChange={(checked) =>
                            toggleTarget(lang.language, checked === true)
                          }
                        />
                        <Label
                          className="cursor-pointer text-sm font-normal"
                          htmlFor={id}
                        >
                          {lang.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pipeline options */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Additional steps
              </Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={includeKeywords}
                  disabled={pipeline.isRunning}
                  id="step-keywords"
                  onCheckedChange={(checked) =>
                    setIncludeKeywords(checked === true)
                  }
                />
                <Label
                  className="cursor-pointer text-sm font-normal"
                  htmlFor="step-keywords"
                >
                  Generate keywords for each language
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={includeReleaseNotes}
                  disabled={pipeline.isRunning}
                  id="step-release-notes"
                  onCheckedChange={(checked) =>
                    setIncludeReleaseNotes(checked === true)
                  }
                />
                <Label
                  className="cursor-pointer text-sm font-normal"
                  htmlFor="step-release-notes"
                >
                  Generate release notes (What&apos;s New)
                </Label>
              </div>
              {includeReleaseNotes && (
                <Textarea
                  className="resize-none border-border bg-[#0f0f0f] text-sm"
                  disabled={pipeline.isRunning}
                  onChange={(e) => setReleaseNotesChanges(e.target.value)}
                  placeholder="List of changes in this version (one per line) — the basis for generating release notes."
                  rows={3}
                  value={releaseNotesChanges}
                />
              )}
            </div>

            {/* Per-language progress + preview */}
            {hasResults && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Progress
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {doneCount}/{jobList.length} done
                    {errorCount > 0 && ` · ${errorCount} error(s)`}
                  </span>
                </div>
                <div className="space-y-2">
                  {jobList.map((job) => {
                    const target = languageById[job.language];
                    return (
                      <div
                        className="rounded-lg border border-border bg-[#1a1a1a] p-3"
                        key={job.language}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <StageIndicator job={job} />
                            <span className="text-sm font-medium">
                              {target?.label ?? job.language}
                            </span>
                            <span
                              className={cn(
                                "text-xs",
                                job.stage === "error"
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                              )}
                            >
                              {STAGE_LABELS[job.stage]}
                            </span>
                            {job.saved && (
                              <Badge
                                className="h-5 gap-1 px-1.5 text-[10px]"
                                variant="secondary"
                              >
                                <Check className="h-3 w-3" /> Saved
                              </Badge>
                            )}
                          </div>
                          {job.stage === "done" && (
                            <Button
                              className="h-7 gap-1.5 px-2 text-xs"
                              disabled={
                                job.saved ||
                                savingLanguage === job.language ||
                                isSavingAll
                              }
                              onClick={() => handleSaveLanguage(job.language)}
                              size="sm"
                              variant="outline"
                            >
                              {savingLanguage === job.language ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              Save
                            </Button>
                          )}
                        </div>

                        {job.stage === "error" && job.error && (
                          <p className="mt-2 text-xs text-destructive">
                            {job.error}
                          </p>
                        )}

                        {job.stage === "done" && (
                          <div className="mt-3 space-y-2">
                            {Object.entries(job.result)
                              .filter(([, value]) => value?.trim())
                              .map(([key, value]) => (
                                <div className="space-y-0.5" key={key}>
                                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {fieldLabels[key] ?? key}
                                  </p>
                                  <p className="line-clamp-3 whitespace-pre-wrap text-xs text-foreground/90">
                                    {value}
                                  </p>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border p-6 pt-4">
          <div className="flex items-center gap-2">
            {hasResults && unsavedDone > 0 && (
              <Button
                disabled={isSavingAll || pipeline.isRunning}
                onClick={handleSaveAll}
                variant="outline"
              >
                {isSavingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save all ({unsavedDone})
              </Button>
            )}
          </div>
          <Button
            disabled={pipeline.isRunning || targets.size === 0}
            onClick={handleRun}
          >
            {pipeline.isRunning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {pipeline.isRunning ? "Processing…" : "Run pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
