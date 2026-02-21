"use client";

import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const TARGET_SIZES: Record<string, [number, number][]> = {
  APP_IPHONE_35: [[640, 1136], [1136, 640]],
  APP_IPHONE_40: [[640, 1136], [1136, 640]],
  APP_IPHONE_47: [[750, 1334], [1334, 750]],
  APP_IPHONE_55: [[1242, 2208], [2208, 1242]],
  APP_IPHONE_58: [[1125, 2436], [2436, 1125]],
  APP_IPHONE_61: [[828, 1792], [1792, 828], [1284, 2778], [2778, 1284]],
  APP_IPHONE_65: [[1242, 2688], [2688, 1242], [1284, 2778], [2778, 1284]],
  APP_IPHONE_67: [[1290, 2796], [2796, 1290]],
  APP_IPAD_PRO_129: [[2064, 2752], [2752, 2064], [2048, 2732], [2732, 2048]],
};

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Orientation = "portrait" | "landscape";

interface ScreenshotCropDialogProps {
  file: File | null;
  displayType: string;
  onConfirm: (file: File, crop: CropArea) => void;
  onCancel: () => void;
}

function getTargetForOrientation(
  displayType: string,
  orientation: Orientation,
): [number, number] {
  const sizes = TARGET_SIZES[displayType];
  if (!sizes?.length) return orientation === "portrait" ? [1242, 2688] : [2688, 1242];

  const candidates = sizes.filter(([w, h]) =>
    orientation === "portrait" ? h > w : w > h,
  );
  return candidates[0] ?? sizes[0];
}

export function ScreenshotCropDialog({
  file,
  displayType,
  onConfirm,
  onCancel,
}: ScreenshotCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

  const imageUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const targetDims = useMemo(
    () => getTargetForOrientation(displayType, orientation),
    [displayType, orientation],
  );

  const aspect = targetDims[0] / targetDims[1];

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleOrientationChange = (o: Orientation) => {
    setOrientation(o);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleConfirm = () => {
    if (!file || !croppedAreaPixels) return;
    onConfirm(file, croppedAreaPixels);
    resetState();
  };

  const handleCancel = () => {
    resetState();
    onCancel();
  };

  const resetState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setOrientation("portrait");
    setCroppedAreaPixels(null);
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Screenshot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Orientation toggle */}
          <div className="flex items-center justify-center gap-1 rounded-lg border border-border p-1 w-fit mx-auto">
            <button
              type="button"
              onClick={() => handleOrientationChange("portrait")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                orientation === "portrait"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Portrait
            </button>
            <button
              type="button"
              onClick={() => handleOrientationChange("landscape")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                orientation === "landscape"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Landscape
            </button>
          </div>

          <div className="relative h-[450px] w-full overflow-hidden rounded-lg bg-black">
            {imageUrl && (
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={false}
                style={{
                  cropAreaStyle: {
                    border: "2px solid rgba(255, 255, 255, 0.6)",
                  },
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-3 px-1">
            <span className="shrink-0 text-xs text-muted-foreground">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <span className="w-10 text-right text-xs text-muted-foreground">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Target: {targetDims[0]} x {targetDims[1]}px — drag to position, scroll or use slider to zoom
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!croppedAreaPixels}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
