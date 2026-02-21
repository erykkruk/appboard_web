"use client";

import { useParams } from "next/navigation";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Info, Loader2, Smartphone, Tablet, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import {
  useDeleteAllScreenshots,
  useDeleteScreenshot,
  useReorderScreenshots,
  useUploadScreenshot,
  useVersionDetail,
  useVersionScreenshots,
} from "@/hooks/use-publishing";
import { cn } from "@/lib/utils";
import { APP_STORE_LANGUAGES, type VersionScreenshot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScreenshotCropDialog } from "@/components/screenshot-crop-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATE_COLORS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "bg-yellow-400",
  READY_FOR_SALE: "bg-green-400",
  WAITING_FOR_REVIEW: "bg-blue-400",
  IN_REVIEW: "bg-blue-400",
  DEVELOPER_REJECTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  PENDING_DEVELOPER_RELEASE: "bg-purple-400",
};

const IPHONE_65_DISPLAY = "APP_IPHONE_65";
const IPAD_PRO_129_DISPLAY = "APP_IPAD_PRO_129";
const MAX_SCREENSHOTS = 10;

function SortableScreenshot({
  screenshot,
  index,
  onDelete,
  isDeleting,
}: {
  screenshot: VersionScreenshot;
  index: number;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: screenshot.externalId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative shrink-0 cursor-grab active:cursor-grabbing",
        isDragging && "z-10 opacity-70",
      )}
      {...attributes}
      {...listeners}
    >
      <img
        src={screenshot.url || undefined}
        alt={`Screenshot ${index + 1}`}
        className="h-[340px] w-auto rounded-lg border border-border object-contain"
        loading="lazy"
        draggable={false}
      />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onDelete(screenshot.externalId)}
        disabled={isDeleting}
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function VersionScreenshotsPage() {
  const params = useParams<{ appId: string; versionId: string }>();
  const detail = useVersionDetail(params.appId, params.versionId);
  const screenshots = useVersionScreenshots(params.appId, params.versionId);
  const deleteScreenshot = useDeleteScreenshot(params.appId, params.versionId);
  const reorderScreenshots = useReorderScreenshots(
    params.appId,
    params.versionId,
  );
  const deleteAll = useDeleteAllScreenshots(params.appId, params.versionId);
  const uploadScreenshot = useUploadScreenshot(params.appId, params.versionId);

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [uploadsInProgress, setUploadsInProgress] = useState(0);
  const uploadDisplayTypeRef = useRef(IPHONE_65_DISPLAY);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current file being cropped = first in queue
  const cropFile = fileQueue[0] ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Languages from version localizations (always available, even without screenshots)
  const versionLanguages = useMemo(
    () =>
      (detail.data?.localizations ?? [])
        .map((l) => l.language)
        .sort(),
    [detail.data?.localizations],
  );

  // Group screenshots by language, filter iPhone 6.5" only
  const { screenshotsByLanguage } = useMemo(() => {
    const byLang = new Map<string, VersionScreenshot[]>();

    for (const s of screenshots.data ?? []) {
      if (s.displayType !== IPHONE_65_DISPLAY) continue;
      if (!byLang.has(s.language)) {
        byLang.set(s.language, []);
      }
      byLang.get(s.language)!.push(s);
    }

    return { screenshotsByLanguage: byLang };
  }, [screenshots.data]);

  // Localized = languages from version localizations (from ASC)
  const localizedLanguages = versionLanguages;

  // Auto-select first language
  const activeLang = selectedLanguage
    ? selectedLanguage
    : localizedLanguages[0] ?? "";

  const currentScreenshots = useMemo(
    () => screenshotsByLanguage.get(activeLang) ?? [],
    [screenshotsByLanguage, activeLang],
  );

  const screenshotSetId = currentScreenshots[0]?.screenshotSetId ?? "";

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = currentScreenshots.map((s) => s.externalId);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const newOrder = arrayMove(ids, oldIndex, newIndex);

      // Save reorder immediately
      if (screenshotSetId) {
        reorderScreenshots.mutate({
          screenshotSetId,
          screenshotIds: newOrder,
        });
      }
    },
    [currentScreenshots, screenshotSetId, reorderScreenshots],
  );

  const handleDelete = (screenshotId: string) => {
    deleteScreenshot.mutate(screenshotId);
  };

  const handleDeleteAll = () => {
    if (!screenshotSetId) return;
    deleteAll.mutate(screenshotSetId);
  };

  const handleChooseFile = (displayType: string) => {
    if (!activeLang) return;
    setUploadError(null);
    uploadDisplayTypeRef.current = displayType;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !activeLang) return;

    const selected = Array.from(files);
    e.target.value = "";

    setUploadError(null);
    setFileQueue((prev) => [...prev, ...selected]);
  };

  const advanceQueue = () => {
    setFileQueue((prev) => prev.slice(1));
  };

  const handleCropConfirm = (
    file: File,
    crop: { x: number; y: number; width: number; height: number },
  ) => {
    const displayType = uploadDisplayTypeRef.current;
    advanceQueue();

    // Upload immediately to ASC — use mutateAsync so .finally() fires per-call
    setUploadsInProgress((n) => n + 1);
    uploadScreenshot
      .mutateAsync({
        language: activeLang,
        displayType,
        file,
        crop,
      })
      .catch((err) => {
        setUploadError(
          err instanceof Error ? err.message : "Upload failed",
        );
      })
      .finally(() => setUploadsInProgress((n) => n - 1));
  };

  const handleCropCancel = () => {
    // Skip this file, move to next
    advanceQueue();
  };

  const notLocalizedLanguages = useMemo(
    () =>
      APP_STORE_LANGUAGES.filter(
        (lang) => !localizedLanguages.includes(lang),
      ),
    [localizedLanguages],
  );

  if (detail.isLoading || screenshots.isLoading) {
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

  const { versionString, state } = detail.data;
  const isUploading = uploadsInProgress > 0;
  const count = currentScreenshots.length;
  const hasLanguage = !!activeLang;

  return (
    <div className="space-y-5 p-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-8 w-1.5 rounded-full",
            STATE_COLORS[state] ?? "bg-muted-foreground",
          )}
        />
        <div>
          <h1 className="text-xl font-bold">Previews & Screenshots</h1>
          <p className="text-sm text-muted-foreground">
            Version {versionString}
          </p>
        </div>
      </div>

      {/* Tabs: iPhone / iPad */}
      <Tabs defaultValue="iphone">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="iphone" className="gap-1.5">
              <Smartphone className="h-4 w-4" />
              iPhone
            </TabsTrigger>
            <TabsTrigger value="ipad" className="gap-1.5">
              <Tablet className="h-4 w-4" />
              iPad
            </TabsTrigger>
          </TabsList>

          {/* Language selector */}
          <Select value={activeLang} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {localizedLanguages.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Localized</SelectLabel>
                  {localizedLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {localizedLanguages.length > 0 &&
                notLocalizedLanguages.length > 0 && <SelectSeparator />}
              {notLocalizedLanguages.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Not Localized</SelectLabel>
                  {notLocalizedLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* iPhone Tab */}
        <TabsContent value="iphone" className="mt-4">
          <div className="rounded-xl border border-border p-5">
            <div className="mb-4 flex items-center gap-1.5">
              <p className="text-sm font-medium">
                iPhone
                <br />
                <span className="text-muted-foreground">
                  6.5&quot; Display
                </span>
              </p>
              {count > 0 && (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Info className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs text-center">
                    <p>
                      Drag up to 3 app previews and 10 screenshots here.
                    </p>
                    <p className="mt-0.5 text-muted-foreground">
                      (1242 × 2688px, 2688 × 1242px, 1284 × 2778px or 2778 ×
                      1284px)
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {count === 0 && !isUploading ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center text-muted-foreground">
                <p className="text-sm">
                  Drag up to 3 app previews and 10 screenshots here.
                </p>
                <p className="mt-1 text-xs opacity-60">
                  (1242 × 2688px, 2688 × 1242px, 1284 × 2778px or 2778 ×
                  1284px)
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={currentScreenshots.map((s) => s.externalId)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {currentScreenshots.map((s, i) => (
                      <SortableScreenshot
                        key={s.externalId}
                        screenshot={s}
                        index={i}
                        onDelete={handleDelete}
                        isDeleting={deleteScreenshot.isPending}
                      />
                    ))}
                    {isUploading && (
                      <div className="flex h-[340px] w-[157px] shrink-0 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30">
                        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                        {uploadsInProgress > 1 && (
                          <span className="text-xs text-muted-foreground">
                            {uploadsInProgress} uploading
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Bottom bar — ASC style */}
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>
                {count} of {MAX_SCREENSHOTS} Screenshots
              </span>
              <span className="mx-1">|</span>
              <button
                type="button"
                onClick={() => handleChooseFile(IPHONE_65_DISPLAY)}
                disabled={isUploading || count >= MAX_SCREENSHOTS || !hasLanguage}
                className="text-primary hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
              >
                {isUploading
                  ? `Uploading${uploadsInProgress > 1 ? ` (${uploadsInProgress})` : ""}...`
                  : "Choose File"}
              </button>
              {count > 0 && (
                <>
                  <span className="mx-1">|</span>
                  <button
                    type="button"
                    onClick={handleDeleteAll}
                    disabled={deleteAll.isPending}
                    className="text-primary hover:underline disabled:text-muted-foreground/50"
                  >
                    {deleteAll.isPending ? "Deleting..." : "Delete All"}
                  </button>
                </>
              )}
            </div>
            {uploadError && (
              <p className="mt-2 text-xs text-destructive">{uploadError}</p>
            )}
          </div>
        </TabsContent>

        {/* iPad Tab */}
        <TabsContent value="ipad" className="mt-4">
          <div className="rounded-xl border border-border p-5">
            <p className="mb-4 text-sm font-medium">
              iPad
              <br />
              <span className="text-muted-foreground">
                12.9&quot; or 13&quot; Displays
              </span>
            </p>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-14 text-center text-muted-foreground">
              <p className="text-sm">
                Drag up to 3 app previews and 10 screenshots here for iPad
                12.9&quot; or 13&quot; Displays.
              </p>
              <p className="mt-1 text-xs opacity-60">
                (2064 × 2752px, 2752 × 2064px, 2048 × 2732px or 2732 ×
                2048px)
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>0 of 10 Screenshots</span>
              <span className="mx-1">|</span>
              <button
                type="button"
                onClick={() => handleChooseFile(IPAD_PRO_129_DISPLAY)}
                disabled={isUploading || !hasLanguage}
                className="text-primary hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
              >
                Choose File
              </button>
              <span className="mx-1">|</span>
              <span className="text-muted-foreground/50">Delete All</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Crop dialog */}
      <ScreenshotCropDialog
        file={cropFile}
        displayType={uploadDisplayTypeRef.current}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  );
}
