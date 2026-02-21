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

const REQUIRED_SIZES: Record<string, [number, number][]> = {
  [IPHONE_65_DISPLAY]: [
    [1242, 2688],
    [2688, 1242],
    [1284, 2778],
    [2778, 1284],
  ],
  [IPAD_PRO_129_DISPLAY]: [
    [2064, 2752],
    [2752, 2064],
    [2048, 2732],
    [2732, 2048],
  ],
};

function pickTargetSize(
  imgW: number,
  imgH: number,
  displayType: string,
  existing: VersionScreenshot[],
): [number, number] {
  // If we have existing screenshots, match their size
  const first = existing.find((s) => s.width && s.height);
  if (first?.width && first?.height) {
    return [first.width, first.height];
  }

  // Otherwise pick the closest required size based on orientation
  const sizes = REQUIRED_SIZES[displayType] ?? REQUIRED_SIZES[IPHONE_65_DISPLAY];
  const isPortrait = imgH >= imgW;

  // Filter to same orientation, fallback to all
  const candidates = sizes.filter(([w, h]) =>
    isPortrait ? h >= w : w >= h,
  );
  const pool = candidates.length > 0 ? candidates : sizes;

  // Pick closest by aspect ratio
  const imgAspect = imgW / imgH;
  let best = pool[0];
  let bestDiff = Math.abs(best[0] / best[1] - imgAspect);
  for (const size of pool) {
    const diff = Math.abs(size[0] / size[1] - imgAspect);
    if (diff < bestDiff) {
      best = size;
      bestDiff = diff;
    }
  }
  return best;
}

function cropAndResize(
  file: File,
  targetW: number,
  targetH: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: sw, naturalHeight: sh } = img;

      // Calculate crop region (center crop to target aspect ratio)
      const targetAspect = targetW / targetH;
      const srcAspect = sw / sh;

      let cropW: number;
      let cropH: number;
      if (srcAspect > targetAspect) {
        // Source is wider — crop sides
        cropH = sh;
        cropW = sh * targetAspect;
      } else {
        // Source is taller — crop top/bottom
        cropW = sw;
        cropH = sw / targetAspect;
      }
      const cropX = (sw - cropW) / 2;
      const cropY = (sh - cropH) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          resolve(
            new File([blob], file.name.replace(/\.\w+$/, ".png"), {
              type: "image/png",
            }),
          );
        },
        "image/png",
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

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
        src={screenshot.url}
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
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadDisplayTypeRef = useRef(IPHONE_65_DISPLAY);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const { screenshotLanguages, screenshotsByLanguage } = useMemo(() => {
    const byLang = new Map<string, VersionScreenshot[]>();

    for (const s of screenshots.data ?? []) {
      if (s.displayType !== IPHONE_65_DISPLAY) continue;
      if (!byLang.has(s.language)) {
        byLang.set(s.language, []);
      }
      byLang.get(s.language)!.push(s);
    }

    return {
      screenshotLanguages: new Set(byLang.keys()),
      screenshotsByLanguage: byLang,
    };
  }, [screenshots.data]);

  // Localized = languages from version localizations (from ASC)
  const localizedLanguages = versionLanguages;

  // Auto-select first language
  const activeLang = selectedLanguage
    ? selectedLanguage
    : localizedLanguages[0] ?? "";

  const originalScreenshots = useMemo(
    () => screenshotsByLanguage.get(activeLang) ?? [],
    [screenshotsByLanguage, activeLang],
  );

  const currentScreenshots = useMemo(() => {
    if (!localOrder) return originalScreenshots;

    const byId = new Map(originalScreenshots.map((s) => [s.externalId, s]));
    return localOrder
      .map((id) => byId.get(id))
      .filter((s): s is VersionScreenshot => !!s);
  }, [originalScreenshots, localOrder]);

  const hasOrderChanges = useMemo(() => {
    if (!localOrder) return false;
    const originalIds = originalScreenshots.map((s) => s.externalId);
    return localOrder.some((id, i) => id !== originalIds[i]);
  }, [localOrder, originalScreenshots]);

  const screenshotSetId = currentScreenshots[0]?.screenshotSetId ?? "";

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setLocalOrder(null);
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const ids = currentScreenshots.map((s) => s.externalId);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      setLocalOrder(arrayMove(ids, oldIndex, newIndex));
    },
    [currentScreenshots],
  );

  const handleSave = () => {
    if (!localOrder || !screenshotSetId) return;
    reorderScreenshots.mutate(
      { screenshotSetId, screenshotIds: localOrder },
      { onSuccess: () => setLocalOrder(null) },
    );
  };

  const handleDiscard = () => {
    setLocalOrder(null);
  };

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !activeLang) return;

    const displayType = uploadDisplayTypeRef.current;

    for (const file of Array.from(files)) {
      let fileToUpload = file;

      try {
        const dims = await getImageDimensions(file);
        const [tw, th] = pickTargetSize(
          dims.width,
          dims.height,
          displayType,
          currentScreenshots,
        );

        if (dims.width !== tw || dims.height !== th) {
          fileToUpload = await cropAndResize(file, tw, th);
        }
      } catch {
        // Use original if crop fails
      }

      uploadScreenshot.mutate(
        {
          language: activeLang,
          displayType,
          file: fileToUpload,
        },
        {
          onError: (err) => {
            setUploadError(
              err instanceof Error ? err.message : "Upload failed",
            );
          },
        },
      );
    }

    e.target.value = "";
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
  const isSaving = reorderScreenshots.isPending;
  const isUploading = uploadScreenshot.isPending;
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

            {count === 0 ? (
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
                {isUploading && uploadDisplayTypeRef.current === IPHONE_65_DISPLAY
                  ? "Uploading..."
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
                {isUploading && uploadDisplayTypeRef.current === IPAD_PRO_129_DISPLAY
                  ? "Uploading..."
                  : "Choose File"}
              </button>
              <span className="mx-1">|</span>
              <span className="text-muted-foreground/50">Delete All</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save / Discard bar */}
      {hasOrderChanges && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
          <p className="mr-2 text-sm text-muted-foreground">
            Unsaved order changes
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscard}
            disabled={isSaving}
          >
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
