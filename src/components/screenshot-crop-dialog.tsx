"use client";

import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
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
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const TARGET_SIZES: Record<string, [number, number][]> = {
	APP_IPAD_PRO_129: [
		[2064, 2752],
		[2752, 2064],
		[2048, 2732],
		[2732, 2048],
	],
	APP_IPHONE_35: [
		[640, 1136],
		[1136, 640],
	],
	APP_IPHONE_40: [
		[640, 1136],
		[1136, 640],
	],
	APP_IPHONE_47: [
		[750, 1334],
		[1334, 750],
	],
	APP_IPHONE_55: [
		[1242, 2208],
		[2208, 1242],
	],
	APP_IPHONE_58: [
		[1125, 2436],
		[2436, 1125],
	],
	APP_IPHONE_61: [
		[828, 1792],
		[1792, 828],
		[1284, 2778],
		[2778, 1284],
	],
	APP_IPHONE_65: [
		[1242, 2688],
		[2688, 1242],
		[1284, 2778],
		[2778, 1284],
	],
	APP_IPHONE_67: [
		[1290, 2796],
		[2796, 1290],
	],
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

function getSizesForOrientation(
	displayType: string,
	orientation: Orientation,
): [number, number][] {
	const sizes = TARGET_SIZES[displayType];
	if (!sizes?.length)
		return orientation === "portrait" ? [[1242, 2688]] : [[2688, 1242]];

	const candidates = sizes.filter(([w, h]) =>
		orientation === "portrait" ? h > w : w > h,
	);
	return candidates.length > 0 ? candidates : [sizes[0]];
}

function getPreferredSize(
	displayType: string,
	orientation: Orientation,
): string {
	const sizes = getSizesForOrientation(displayType, orientation);
	const preferred = sizes.find(
		([w, h]) =>
			(w === 1284 && h === 2778) || (w === 2778 && h === 1284),
	);
	const [w, h] = preferred ?? sizes[0];
	return `${w}x${h}`;
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
	const [selectedSize, setSelectedSize] = useState(() =>
		getPreferredSize(displayType, "portrait"),
	);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
		null,
	);

	const availableSizes = useMemo(
		() => getSizesForOrientation(displayType, orientation),
		[displayType, orientation],
	);

	// Force react-easy-crop to recalculate crop area after mount
	useEffect(() => {
		if (!file) return;
		const timer = setTimeout(() => {
			setSelectedSize((prev) => {
				const sizes = getSizesForOrientation(displayType, orientation);
				const current = prev.split("x").map(Number) as [number, number];
				// Find an alternative size to toggle to, then toggle back
				const alt = sizes.find(
					([w, h]) => w !== current[0] || h !== current[1],
				);
				if (alt) {
					// Toggle to alt, then back to force recalc
					setTimeout(() => setSelectedSize(prev), 0);
					return `${alt[0]}x${alt[1]}`;
				}
				// Only one size available — nudge zoom instead
				setZoom(1.001);
				setTimeout(() => setZoom(1), 0);
				return prev;
			});
		}, 100);
		return () => clearTimeout(timer);
	}, [file, displayType, orientation]);

	const targetDims = useMemo(() => {
		if (!selectedSize) {
			return availableSizes[0] ?? [1242, 2688];
		}
		const [w, h] = selectedSize.split("x").map(Number);
		return [w, h] as [number, number];
	}, [selectedSize, availableSizes]);

	const aspect = targetDims[0] / targetDims[1];

	const imageUrl = useMemo(() => {
		if (!file) return null;
		return URL.createObjectURL(file);
	}, [file]);

	useEffect(() => {
		return () => {
			if (imageUrl) URL.revokeObjectURL(imageUrl);
		};
	}, [imageUrl]);

	const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
		setCroppedAreaPixels(croppedPixels);
	}, []);

	const handleOrientationChange = (o: Orientation) => {
		setOrientation(o);
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		setSelectedSize(getPreferredSize(displayType, o));
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
		setSelectedSize(getPreferredSize(displayType, "portrait"));
		setCroppedAreaPixels(null);
	};

	return (
		<Dialog open={!!file} onOpenChange={(open) => !open && handleCancel()}>
			<DialogContent className="inset-0 flex h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none border-none p-4 sm:max-w-none">
				<DialogHeader>
					<DialogTitle>Crop Screenshot</DialogTitle>
				</DialogHeader>

				{/* Orientation toggle */}
				<div className="mx-auto flex w-fit items-center justify-center gap-1 rounded-lg border border-border p-1">
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

				{/* Crop area */}
				<div className="relative flex-1 overflow-hidden rounded-lg bg-black">
					{imageUrl && (
						<Cropper
							image={imageUrl}
							crop={crop}
							zoom={zoom}
							minZoom={1}
							maxZoom={5}
							aspect={aspect}
							objectFit="cover"
							restrictPosition
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

				{/* Controls */}
				<div className="flex flex-col gap-3">
					{/* Zoom slider */}
					<div className="flex items-center gap-3">
						<span className="w-8 shrink-0 text-xs text-muted-foreground">
							Zoom
						</span>
						<Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
						<Slider
							value={[zoom]}
							min={1}
							max={5}
							step={0.01}
							onValueChange={([v]) => setZoom(v)}
							className="flex-1"
						/>
						<Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
						<span className="w-12 text-right text-xs text-muted-foreground">
							{zoom.toFixed(1)}x
						</span>
					</div>

					{/* Resolution + info */}
					<div className="flex flex-wrap items-center gap-4">
						{availableSizes.length > 1 && (
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">
									Resolution
								</span>
								<Select
									value={selectedSize}
									onValueChange={setSelectedSize}
								>
									<SelectTrigger className="w-36">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{availableSizes.map(([w, h]) => {
											const key = `${w}x${h}`;
											return (
												<SelectItem key={key} value={key}>
													{w} x {h}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>
						)}
						<span className="text-xs text-muted-foreground">
							Target: {targetDims[0]} x {targetDims[1]}px
						</span>
					</div>
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
