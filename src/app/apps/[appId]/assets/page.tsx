"use client";

import { useParams } from "next/navigation";
import {
  GripVertical,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAssets,
  useDeleteAsset,
  useReorderAssets,
  useSyncAssets,
  useUploadAsset,
} from "@/hooks/use-assets";
import type { Asset } from "@/lib/types";

const ASSET_TYPES = [
  { value: "screenshot", label: "Screenshots" },
  { value: "icon", label: "Icon" },
  { value: "feature_graphic", label: "Feature Graphic" },
  { value: "app_preview", label: "App Preview" },
] as const;

const DEVICE_TYPES = [
  { value: "", label: "All Devices" },
  { value: "phone", label: "Phone" },
  { value: "tablet", label: "Tablet" },
  { value: "tv", label: "TV" },
  { value: "wear", label: "Wear" },
] as const;

export default function AssetsManager() {
  const routeParams = useParams<{ appId: string }>();
  const appId = routeParams.appId;
  const [language] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [assetType, setAssetType] = useState("screenshot");
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const assets = useAssets(appId, {
    language: language || undefined,
    deviceType: deviceType || undefined,
    assetType: assetType || undefined,
  });
  const uploadAsset = useUploadAsset(appId);
  const deleteAsset = useDeleteAsset(appId);
  const reorderAssets = useReorderAssets(appId);
  const syncAssets = useSyncAssets(appId);

  const filtered = assets.data ?? [];

  const handleUpload = useCallback(
    async (files: FileList) => {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (language) formData.append("language", language);
        if (deviceType) formData.append("deviceType", deviceType);
        formData.append("assetType", assetType);
        try {
          await uploadAsset.mutateAsync(formData);
          toast.success(`Uploaded ${file.name}`);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    },
    [uploadAsset, language, deviceType, assetType],
  );

  const handleDelete = async (assetId: string) => {
    try {
      await deleteAsset.mutateAsync(assetId);
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete asset");
    }
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newOrder = [...filtered];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    setDragIdx(idx);
    reorderAssets.mutate(newOrder.map((a) => a.id));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleUpload(files);
      }
      setDragIdx(null);
    },
    [handleUpload],
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={assetType} onValueChange={setAssetType}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={deviceType} onValueChange={setDeviceType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Device" />
          </SelectTrigger>
          <SelectContent>
            {DEVICE_TYPES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => syncAssets.mutate()}
          disabled={syncAssets.isPending}
        >
          {syncAssets.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync
        </Button>
        <Button size="sm" onClick={() => fileInputRef.current?.click()}>
          <Plus className="mr-2 h-4 w-4" />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {assets.isLoading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-lg" />
          ))}
        </div>
      )}

      {assets.isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-sm text-muted-foreground">
            Failed to load assets.
          </p>
          <Button variant="outline" onClick={() => assets.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {!assets.isLoading && !assets.isError && filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag and drop files here, or click Upload
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div
          className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {filtered.map((asset, idx) => (
            <div
              key={asset.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              className="group relative overflow-hidden rounded-lg border bg-muted transition-colors hover:border-primary"
            >
              <div className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded bg-background/80 text-xs font-medium">
                {idx + 1}
              </div>
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleDelete(asset.id)}
                  className="flex h-7 w-7 items-center justify-center rounded bg-destructive text-destructive-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100">
                <GripVertical className="h-6 w-6 text-muted-foreground" />
              </div>
              <button
                type="button"
                className="w-full"
                onClick={() => setPreviewAsset(asset)}
              >
                <img
                  src={asset.url}
                  alt={`Asset ${idx + 1}`}
                  className="aspect-[9/16] w-full object-cover"
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={previewAsset !== null}
        onOpenChange={() => setPreviewAsset(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Asset Preview</DialogTitle>
          </DialogHeader>
          {previewAsset && (
            <div className="flex items-center justify-center">
              <img
                src={previewAsset.url}
                alt="Preview"
                className="max-h-[70vh] rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
