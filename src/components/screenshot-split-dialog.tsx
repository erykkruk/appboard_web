"use client";

import { Loader2, Minus, Plus } from "lucide-react";
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
import {
	useSplitPreview,
	useSplitUploadScreenshots,
} from "@/hooks/use-publishing";

const MIN_PARTS = 2;
const MAX_PARTS = 10;
const PREFERRED_SIZE = { h: 2778, w: 1284 };

interface CropArea {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface ScreenshotSplitDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	file: File | null;
	displayType: string;
	language: string;
	versionId: string;
	appId: string;
	existingCount: number;
	onSuccess: () => void;
}

export function ScreenshotSplitDialog({
	open,
	onOpenChange,
	file,
	displayType,
	language,
	versionId,
	appId,
	existingCount,
	onSuccess,
}: ScreenshotSplitDialogProps) {
	const [parts, setParts] = useState(3);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [selectedSize, setSelectedSize] = useState("");
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
		null,
	);
	const splitPreview = useSplitPreview(appId);
	const splitUpload = useSplitUploadScreenshots(appId, versionId);

	const preview = splitPreview.data;
	const maxParts = Math.max(MIN_PARTS, MAX_PARTS - existingCount);

	const imageUrl = useMemo(() => {
		if (!file) return null;
		return URL.createObjectURL(file);
	}, [file]);

	useEffect(() => {
		return () => {
			if (imageUrl) URL.revokeObjectURL(imageUrl);
		};
	}, [imageUrl]);

	// Fetch preview when dialog opens (for metadata: suggestedParts, availableSizes)
	useEffect(() => {
		if (!open || !file) return;
		splitPreview.mutate(
			{ displayType, file, parts },
			{
				onSuccess: (data) => {
					setParts(
						Math.min(data.suggestedParts, MAX_PARTS - existingCount),
					);
					if (data.availableSizes?.length) {
						const preferred = data.availableSizes.find(
							(s) =>
								s.width === PREFERRED_SIZE.w &&
								s.height === PREFERRED_SIZE.h,
						);
						const s = preferred ?? data.availableSizes[0];
						setSelectedSize(`${s.width}x${s.height}`);
					}
				},
			},
		);
		setZoom(1);
		setCrop({ x: 0, y: 0 });
		setSelectedSize("");
		setCroppedAreaPixels(null);
		// biome-ignore lint/correctness/useExhaustiveDependencies: initial fetch only
	}, [open, file]);

	// Parse selected target size
	const targetSize = useMemo(() => {
		if (!selectedSize) return null;
		const [w, h] = selectedSize.split("x").map(Number);
		return { h, w };
	}, [selectedSize]);

	// Combined aspect ratio for all parts side by side (N portrait frames)
	const aspect = useMemo(() => {
		if (targetSize) {
			return (targetSize.w * parts) / targetSize.h;
		}
		// Fallback: assume ~9:19.5 portrait ratio per part
		return (9 * parts) / 19.5;
	}, [targetSize, parts]);

	// Build background-image CSS for dashed split lines directly on the crop area.
	// This draws vertical dashed lines at each 1/N boundary inside the crop area.
	// We use repeating-linear-gradient to simulate a dashed line (4px white, 6px gap).
	const splitLinesCss = useMemo(() => {
		if (parts <= 1) return {};

		const gradients: string[] = [];
		const positions: string[] = [];

		for (let i = 1; i < parts; i++) {
			const pct = (i / parts) * 100;
			// Each "line" is a 2px wide repeating vertical dashed pattern
			gradients.push(
				"repeating-linear-gradient(to bottom, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 8px, transparent 8px, transparent 16px)",
			);
			positions.push(`${pct}% 0%`);
		}

		return {
			backgroundImage: gradients.join(", "),
			backgroundPosition: positions.join(", "),
			backgroundRepeat: "no-repeat",
			backgroundSize: gradients.map(() => "2px 100%").join(", "),
		} as React.CSSProperties;
	}, [parts]);

	const handlePartsChange = useCallback(
		(value: string) => {
			const newParts = Number(value);
			setParts(newParts);
			setCrop({ x: 0, y: 0 });
			setZoom(1);
			setCroppedAreaPixels(null);
			if (file) {
				splitPreview.mutate({
					displayType,
					file,
					parts: newParts,
					targetHeight: targetSize?.h,
					targetWidth: targetSize?.w,
				});
			}
		},
		[file, displayType, splitPreview, targetSize],
	);

	const handleSizeChange = useCallback(
		(value: string) => {
			setSelectedSize(value);
			setCrop({ x: 0, y: 0 });
			setZoom(1);
			setCroppedAreaPixels(null);
			if (file) {
				const [w, h] = value.split("x").map(Number);
				splitPreview.mutate({
					displayType,
					file,
					parts,
					targetHeight: h,
					targetWidth: w,
				});
			}
		},
		[file, displayType, parts, splitPreview],
	);

	const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
		setCroppedAreaPixels(croppedPixels);
	}, []);

	const handleUpload = () => {
		if (!file || !croppedAreaPixels) return;
		splitUpload.mutate(
			{
				crop: croppedAreaPixels,
				displayType,
				file,
				insertAt: existingCount,
				language,
				parts,
				targetHeight: targetSize?.h,
				targetWidth: targetSize?.w,
			},
			{
				onSuccess: () => {
					onSuccess();
					onOpenChange(false);
				},
			},
		);
	};

	const handleClose = () => {
		if (splitUpload.isPending) return;
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="inset-0 flex h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none border-none p-4 sm:max-w-none">
				<DialogHeader>
					<DialogTitle>Split Panorama</DialogTitle>
				</DialogHeader>

				{/* Crop area with dashed split lines */}
				<div className="relative flex-1 overflow-hidden rounded-lg bg-black">
					{imageUrl && (
						<Cropper
							image={imageUrl}
							crop={crop}
							zoom={zoom}
							minZoom={1}
							maxZoom={5}
							aspect={aspect}
							restrictPosition
							onCropChange={setCrop}
							onZoomChange={setZoom}
							onCropComplete={onCropComplete}
							showGrid={false}
							style={{
								cropAreaStyle: {
									border: "2px solid rgba(255, 255, 255, 0.6)",
									...splitLinesCss,
								},
							}}
						/>
					)}

					{!imageUrl && (
						<div className="flex h-full items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
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

					{/* Parts + resolution */}
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">
								Split into
							</span>
							<Select
								value={String(parts)}
								onValueChange={handlePartsChange}
								disabled={splitPreview.isPending && !preview}
							>
								<SelectTrigger className="w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from(
										{ length: maxParts - MIN_PARTS + 1 },
										(_, i) => {
											const n = MIN_PARTS + i;
											return (
												<SelectItem
													key={n}
													value={String(n)}
												>
													{n}
												</SelectItem>
											);
										},
									)}
								</SelectContent>
							</Select>
							<span className="text-sm text-muted-foreground">
								parts
							</span>
						</div>

						{/* Resolution selector */}
						{preview?.availableSizes &&
							preview.availableSizes.length > 0 && (
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">
										Resolution
									</span>
									<Select
										value={selectedSize}
										onValueChange={handleSizeChange}
									>
										<SelectTrigger className="w-36">
											<SelectValue placeholder="Auto" />
										</SelectTrigger>
										<SelectContent>
											{preview.availableSizes.map((s) => {
												const key = `${s.width}x${s.height}`;
												return (
													<SelectItem
														key={key}
														value={key}
													>
														{s.width} x {s.height}
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</div>
							)}

						{preview && (
							<span className="text-xs text-muted-foreground">
								Each part: {preview.partWidth} x{" "}
								{preview.partHeight}px
							</span>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={handleClose}
						disabled={splitUpload.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleUpload}
						disabled={
							!file ||
							!croppedAreaPixels ||
							splitUpload.isPending ||
							splitPreview.isPending
						}
					>
						{splitUpload.isPending ? (
							<>
								<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
								Uploading...
							</>
						) : (
							`Split & Upload (${parts})`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
