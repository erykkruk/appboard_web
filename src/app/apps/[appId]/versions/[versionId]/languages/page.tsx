"use client";

import { useParams } from "next/navigation";
import { ExternalLink, Globe, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  useAddLocalization,
  useAddLocalizationWithTranslation,
  useVersionDetail,
} from "@/hooks/use-publishing";
import { APP_STORE_LANGUAGES } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_COLORS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "bg-yellow-400",
  READY_FOR_SALE: "bg-green-400",
  WAITING_FOR_REVIEW: "bg-blue-400",
  IN_REVIEW: "bg-blue-400",
  DEVELOPER_REJECTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  PENDING_DEVELOPER_RELEASE: "bg-purple-400",
};

const STATE_LABELS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "Prepare for Submission",
  READY_FOR_SALE: "Ready for Sale",
  WAITING_FOR_REVIEW: "Waiting for Review",
  IN_REVIEW: "In Review",
  DEVELOPER_REJECTED: "Developer Rejected",
  REJECTED: "Rejected",
  PENDING_DEVELOPER_RELEASE: "Pending Developer Release",
};

const EDITABLE_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
]);

function getLanguageLabel(locale: string): string {
  const found = APP_STORE_LANGUAGES.find((l) => l.locale === locale);
  return found ? found.label : locale;
}

export default function LanguagesPage() {
  const params = useParams<{ appId: string; versionId: string }>();
  const detail = useVersionDetail(params.appId, params.versionId);
  const addLocalization = useAddLocalization(params.appId, params.versionId);
  const addWithTranslation = useAddLocalizationWithTranslation(
    params.appId,
    params.versionId,
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState("");
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [sourceLocale, setSourceLocale] = useState("");

  const existingLocales = useMemo(
    () => new Set((detail.data?.localizations ?? []).map((l) => l.language)),
    [detail.data?.localizations],
  );

  const availableLanguages = useMemo(
    () =>
      APP_STORE_LANGUAGES.filter((lang) => !existingLocales.has(lang.locale)),
    [existingLocales],
  );

  const isPending = addLocalization.isPending || addWithTranslation.isPending;

  const handleAdd = async () => {
    if (!selectedLocale) return;
    try {
      if (translateEnabled && sourceLocale) {
        const result = await addWithTranslation.mutateAsync({
          locale: selectedLocale,
          sourceLocale,
        });
        if (result.translated) {
          toast.success(
            `Added ${getLanguageLabel(selectedLocale)} with translations from ${getLanguageLabel(sourceLocale)}`,
          );
        } else {
          toast.success(
            `Added ${getLanguageLabel(selectedLocale)} (no text to translate)`,
          );
        }
      } else {
        await addLocalization.mutateAsync(selectedLocale);
        toast.success(`Added ${getLanguageLabel(selectedLocale)}`);
      }
      setSelectedLocale("");
      setTranslateEnabled(false);
      setSourceLocale("");
      setAddDialogOpen(false);
    } catch {
      toast.error("Failed to add language");
    }
  };

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Version not found
      </div>
    );
  }

  const { versionString, state, localizations } = detail.data;
  const isEditable = EDITABLE_STATES.has(state);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-8 w-1.5 rounded-full",
              STATE_COLORS[state] ?? "bg-muted-foreground",
            )}
          />
          <div>
            <h1 className="text-xl font-bold">
              Version {versionString} — Languages
            </h1>
            <p className="text-sm text-muted-foreground">
              {STATE_LABELS[state] ?? state} &middot; {localizations.length}{" "}
              {localizations.length === 1 ? "language" : "languages"}
            </p>
          </div>
        </div>

        {isEditable && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Language
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Language</DialogTitle>
                <DialogDescription>
                  Select a language to add to this version.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedLocale} onValueChange={setSelectedLocale}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map((lang) => (
                      <SelectItem key={lang.locale} value={lang.locale}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {localizations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="translate"
                        checked={translateEnabled}
                        onCheckedChange={(checked) => {
                          setTranslateEnabled(checked === true);
                          if (!checked) setSourceLocale("");
                        }}
                      />
                      <Label
                        htmlFor="translate"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Generate translations from existing language
                      </Label>
                    </div>

                    {translateEnabled && (
                      <Select
                        value={sourceLocale}
                        onValueChange={setSourceLocale}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Source language..." />
                        </SelectTrigger>
                        <SelectContent>
                          {localizations
                            .slice()
                            .sort((a, b) =>
                              a.language.localeCompare(b.language),
                            )
                            .map((loc) => (
                              <SelectItem
                                key={loc.language}
                                value={loc.language}
                              >
                                {getLanguageLabel(loc.language)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={
                    !selectedLocale ||
                    isPending ||
                    (translateEnabled && !sourceLocale)
                  }
                >
                  {isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : null}
                  {isPending
                    ? "Translating..."
                    : translateEnabled
                      ? "Add & Translate"
                      : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Language list */}
      {localizations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No languages added to this version yet.
        </p>
      ) : (
        <div className="space-y-2">
          {localizations
            .slice()
            .sort((a, b) => a.language.localeCompare(b.language))
            .map((loc) => (
              <div
                key={loc.localizationId}
                className="flex items-center justify-between rounded-lg border border-border bg-[#1a1a1a] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {getLanguageLabel(loc.language)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {loc.language}
                    </p>
                  </div>
                </div>
                {isEditable && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground cursor-not-allowed opacity-50"
                          disabled
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Removing languages is currently only available via App Store Connect</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Info banner */}
      {isEditable && localizations.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-[#1a1a1a] px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Removing languages is currently only available directly in{" "}
            <a
              href="https://appstoreconnect.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground underline underline-offset-2 hover:text-primary"
            >
              App Store Connect
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
