"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSplitPreview, useSplitUploadScreenshots } from "@/hooks/use-publishing";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const MIN_PARTS = 2;
const MAX_PARTS = 10;

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
	const splitPreview = useSplitPreview(appId);
	const splitUpload = useSplitUploadScreenshots(appId, versionId);

	const preview = splitPreview.data;

	// Fetch preview when dialog opens with a file
	useEffect(() => {
		if (!open || !file) return;
		splitPreview.mutate(
			{ displayType, file, parts },
			{
				onSuccess: (data) => {
					setParts(data.suggestedParts);
				},
			},
		);
		// Only run on open/file change, not on parts change
		// biome-ignore lint/correctness/useExhaustiveDependencies: initial fetch only
	}, [open, file]);

	// Re-fetch preview when parts changes (after initial load)
	const handlePartsChange = useCallback(
		(value: number[]) => {
			const newParts = value[0];
			setParts(newParts);
			if (file) {
				splitPreview.mutate({ displayType, file, parts: newParts });
			}
		},
		[file, displayType, splitPreview],
	);

	const handleUpload = () => {
		if (!file) return;
		splitUpload.mutate(
			{
				language,
				displayType,
				file,
				parts,
				insertAt: existingCount,
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

	// Split line positions as percentages
	const splitLines = useMemo(() => {
		const lines: number[] = [];
		for (let i = 1; i < parts; i++) {
			lines.push((i / parts) * 100);
		}
		return lines;
	}, [parts]);

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Split Panorama</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					{/* Preview area */}
					<div className="relative overflow-hidden rounded-lg bg-black">
						{splitPreview.isPending && !preview ? (
							<div className="flex h-[300px] items-center justify-center">
								<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
							</div>
						) : preview ? (
							<div className="relative">
								<img
									src={preview.previewUrl}
									alt="Panorama preview"
									className="w-full"
									draggable={false}
								/>
								{/* Split lines overlay */}
								{splitLines.map((pct) => (
									<div
										key={pct}
										className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-white/60"
										style={{ left: `${pct}%` }}
									/>
								))}
							</div>
						) : splitPreview.isError ? (
							<div className="flex h-[200px] items-center justify-center text-sm text-destructive">
								Failed to generate preview
							</div>
						) : null}
					</div>

					{/* Parts slider */}
					<div className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								Split into parts
							</span>
							<span className="font-medium">{parts}</span>
						</div>
						<Slider
							value={[parts]}
							min={MIN_PARTS}
							max={MAX_PARTS}
							step={1}
							onValueChange={handlePartsChange}
							disabled={splitPreview.isPending && !preview}
						/>
					</div>

					{/* Dimensions info */}
					{preview && (
						<p className="text-center text-xs text-muted-foreground">
							Each part: {preview.partWidth} x {preview.partHeight}px
							{" "}(target: {preview.targetWidth} x {preview.targetHeight}px)
						</p>
					)}
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
						disabled={!preview || splitUpload.isPending || splitPreview.isPending}
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
