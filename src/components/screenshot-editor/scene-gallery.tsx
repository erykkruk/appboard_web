"use client";

import { Loader2, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	useSplitUploadScreenshots,
	useUploadScreenshot,
} from "@/hooks/use-publishing";
import {
	useDeleteScreenshotScene,
	useScreenshotScenes,
} from "@/hooks/use-screenshot-scenes";
import { getDisplayTypeLabel, getPanelCount } from "@/lib/screenshot-editor";
import type { ScreenshotScene } from "@/lib/types";

import { exportSceneToPng } from "./export-scene";

interface SceneGalleryProps {
	appId: string;
	versionId: string;
	language: string;
	displayType: string;
	onNew: () => void;
	onOpen: (scene: ScreenshotScene) => void;
}

/**
 * Gallery of saved editor scenes for the current language + display type, with
 * actions to start a new scene, reopen an existing one, delete it — or export
 * and upload ALL of them to the store in one click (panoramas are split
 * server-side into their store screenshots).
 */
export function SceneGallery({
	appId,
	versionId,
	language,
	displayType,
	onNew,
	onOpen,
}: SceneGalleryProps) {
	const scenes = useScreenshotScenes(appId);
	const deleteScene = useDeleteScreenshotScene(appId);
	const uploadScreenshot = useUploadScreenshot(appId, versionId);
	const splitUpload = useSplitUploadScreenshots(appId, versionId);
	// Batch export progress: null = idle, otherwise done/total counters.
	const [exporting, setExporting] = useState<{
		done: number;
		total: number;
	} | null>(null);

	const filtered = (scenes.data ?? [])
		.filter((s) => s.language === language && s.displayType === displayType)
		.sort((a, b) => a.sortOrder - b.sortOrder);

	const handleExportAll = async () => {
		if (filtered.length === 0 || exporting) return;
		setExporting({ done: 0, total: filtered.length });
		let uploaded = 0;
		let failed = 0;
		// Sequential on purpose: uploads hit store rate limits when parallelized,
		// and the progress counter stays meaningful.
		for (const row of filtered) {
			const blob = await exportSceneToPng(row.scene);
			if (!blob) {
				failed += 1;
			} else {
				const safeName = row.name.replace(/\s+/g, "-").toLowerCase();
				const file = new File(
					[blob],
					`${safeName}-${language}-${displayType}.png`,
					{ type: "image/png" },
				);
				const panels = getPanelCount(row.scene);
				try {
					if (panels > 1) {
						// Per-panel size straight from the scene (orientation-aware).
						await splitUpload.mutateAsync({
							displayType,
							file,
							language,
							parts: panels,
							targetHeight: row.scene.height,
							targetWidth: Math.round(row.scene.width / panels),
						});
					} else {
						await uploadScreenshot.mutateAsync({ displayType, file, language });
					}
					uploaded += 1;
				} catch {
					failed += 1;
				}
			}
			setExporting((prev) =>
				prev ? { ...prev, done: prev.done + 1 } : prev,
			);
		}
		setExporting(null);
		if (failed === 0) {
			toast.success(
				`Exported and uploaded ${uploaded} scene${uploaded === 1 ? "" : "s"}`,
			);
		} else {
			toast.error(
				`Uploaded ${uploaded}, failed ${failed} — check remote images (CORS) and store screenshot limits`,
			);
		}
	};

	return (
		<div className="rounded-lg border border-border p-4">
			<div className="mb-3 flex items-center justify-between">
				<div>
					<h3 className="text-sm font-semibold">Screenshot editor</h3>
					<p className="text-xs text-muted-foreground">
						Create {getDisplayTypeLabel(displayType)} graphics in the browser and
						export at exact dimensions.
					</p>
				</div>
				<div className="flex items-center gap-2">
					{filtered.length > 0 && (
						<Button
							size="sm"
							variant="outline"
							onClick={handleExportAll}
							disabled={!language || exporting !== null}
						>
							{exporting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									{exporting.done}/{exporting.total}
								</>
							) : (
								<>
									<UploadCloud className="h-4 w-4" />
									Export all
								</>
							)}
						</Button>
					)}
					<Button size="sm" onClick={onNew} disabled={!language}>
						<Plus className="h-4 w-4" />
						Open editor
					</Button>
				</div>
			</div>

			{scenes.isLoading && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading scenes…
				</div>
			)}

			{!scenes.isLoading && filtered.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No saved scenes for this language and device.
				</p>
			)}

			{filtered.length > 0 && (
				<ul className="flex flex-col gap-1.5">
					{filtered.map((scene) => (
						<li
							key={scene.id}
							className="flex items-center justify-between rounded-md border border-border px-3 py-2"
						>
							<span className="truncate text-sm">{scene.name}</span>
							<div className="flex items-center gap-1">
								<Button
									size="sm"
									variant="ghost"
									onClick={() => onOpen(scene)}
								>
									<Pencil className="h-3.5 w-3.5" />
									Edit
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => deleteScene.mutate(scene.id)}
									disabled={deleteScene.isPending}
									aria-label="Delete scene"
								>
									<Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
