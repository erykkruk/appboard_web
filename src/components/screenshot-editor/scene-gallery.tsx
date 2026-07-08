"use client";

import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	useDeleteScreenshotScene,
	useScreenshotScenes,
} from "@/hooks/use-screenshot-scenes";
import { getDisplayTypeLabel } from "@/lib/screenshot-editor";
import type { ScreenshotScene } from "@/lib/types";

interface SceneGalleryProps {
	appId: string;
	language: string;
	displayType: string;
	onNew: () => void;
	onOpen: (scene: ScreenshotScene) => void;
}

/**
 * Gallery of saved editor scenes for the current language + display type, with
 * actions to start a new scene, reopen an existing one, or delete it.
 */
export function SceneGallery({
	appId,
	language,
	displayType,
	onNew,
	onOpen,
}: SceneGalleryProps) {
	const scenes = useScreenshotScenes(appId);
	const deleteScene = useDeleteScreenshotScene(appId);

	const filtered = (scenes.data ?? []).filter(
		(s) => s.language === language && s.displayType === displayType,
	);

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
				<Button size="sm" onClick={onNew} disabled={!language}>
					<Plus className="h-4 w-4" />
					Open editor
				</Button>
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
