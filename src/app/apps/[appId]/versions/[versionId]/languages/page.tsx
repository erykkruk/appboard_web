"use client";

import { useParams } from "next/navigation";
import { Globe, Images, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  useAddLocalization,
  useAddLocalizationWithTranslation,
  useDeleteLocalization,
  useVersionDetail,
  useVersionScreenshots,
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
  const deleteLocalization = useDeleteLocalization(
    params.appId,
    params.versionId,
  );
  const screenshots = useVersionScreenshots(params.appId, params.versionId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState("");
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [sourceLocale, setSourceLocale] = useState("");
  const [copyScreenshotsMode, setCopyScreenshotsMode] = useState<"none" | "copy">("none");
  const [copyScreenshotsFrom, setCopyScreenshotsFrom] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{
    localizationId: string;
    language: string;
  } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const existingLocales = useMemo(
    () => new Set((detail.data?.localizations ?? []).map((l) => l.language)),
    [detail.data?.localizations],
  );

  const availableLanguages = useMemo(
    () =>
      APP_STORE_LANGUAGES.filter((lang) => !existingLocales.has(lang.locale)),
    [existingLocales],
  );

  const languagesWithScreenshots = useMemo(() => {
    const langs = new Set<string>();
    for (const s of screenshots.data ?? []) {
      langs.add(s.language);
    }
    return Array.from(langs).sort();
  }, [screenshots.data]);

  const isPending = addLocalization.isPending || addWithTranslation.isPending;

  const handleAdd = async () => {
    if (!selectedLocale) return;
    const screenshotSource =
      copyScreenshotsMode === "copy" && copyScreenshotsFrom
        ? copyScreenshotsFrom
        : undefined;
    try {
      if (translateEnabled && sourceLocale) {
        const result = await addWithTranslation.mutateAsync({
          locale: selectedLocale,
          sourceLocale,
          copyScreenshotsFrom: screenshotSource,
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
        await addLocalization.mutateAsync({
          locale: selectedLocale,
          copyScreenshotsFrom: screenshotSource,
        });
        toast.success(`Added ${getLanguageLabel(selectedLocale)}`);
      }
      setSelectedLocale("");
      setTranslateEnabled(false);
      setSourceLocale("");
      setCopyScreenshotsMode("none");
      setCopyScreenshotsFrom("");
      setAddDialogOpen(false);
    } catch {
      toast.error("Failed to add language");
    }
  };

  const deleteLabel = deleteTarget
    ? getLanguageLabel(deleteTarget.language)
    : "";
  const isDeleteConfirmed =
    deleteConfirmText.trim().toLowerCase() === deleteLabel.toLowerCase();

  const handleDelete = async () => {
    if (!deleteTarget || !isDeleteConfirmed) return;
    try {
      await deleteLocalization.mutateAsync(deleteTarget.localizationId);
      toast.success(`Removed ${deleteLabel}`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } catch {
      toast.error("Failed to remove language");
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

                {/* Screenshot copy section */}
                {languagesWithScreenshots.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Images className="h-4 w-4" />
                      <span>Screenshots</span>
                    </div>
                    <RadioGroup
                      value={copyScreenshotsMode}
                      onValueChange={(val) => {
                        setCopyScreenshotsMode(val as "none" | "copy");
                        if (val === "none") setCopyScreenshotsFrom("");
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="screenshots-none" />
                        <Label
                          htmlFor="screenshots-none"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Leave empty
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="copy" id="screenshots-copy" />
                        <Label
                          htmlFor="screenshots-copy"
                          className="text-sm font-normal cursor-pointer"
                        >
                          Copy screenshots from language
                        </Label>
                      </div>
                    </RadioGroup>

                    {copyScreenshotsMode === "copy" && (
                      <Select
                        value={copyScreenshotsFrom}
                        onValueChange={setCopyScreenshotsFrom}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Source language..." />
                        </SelectTrigger>
                        <SelectContent>
                          {languagesWithScreenshots.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {getLanguageLabel(lang)}
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
                    (translateEnabled && !sourceLocale) ||
                    (copyScreenshotsMode === "copy" && !copyScreenshotsFrom)
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      setDeleteTarget({
                        localizationId: loc.localizationId,
                        language: loc.language,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Language</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold text-foreground">
                {deleteLabel}
              </span>{" "}
              and all its localized content from this version in App Store
              Connect. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="text-sm">
              Type{" "}
              <span className="font-semibold text-foreground">
                {deleteLabel}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteLabel}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isDeleteConfirmed || deleteLocalization.isPending}
            >
              {deleteLocalization.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
