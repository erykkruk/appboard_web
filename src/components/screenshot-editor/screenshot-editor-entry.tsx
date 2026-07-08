"use client";

import { useState } from "react";

import type { ScreenshotScene } from "@/lib/types";

import { SceneGallery } from "./scene-gallery";
import { ScreenshotEditorDialog } from "./screenshot-editor-dialog";

interface ScreenshotEditorEntryProps {
	appId: string;
	versionId: string;
	language: string;
	displayType: string;
}

/**
 * Drop-in entry point for the screenshot editor: shows the saved-scenes gallery
 * with an "Open editor" button and manages the full-screen editor dialog. A
 * `key` on the dialog forces a fresh editor state each time it opens so a new
 * scene never inherits the previous scene's layers.
 */
export function ScreenshotEditorEntry({
	appId,
	versionId,
	language,
	displayType,
}: ScreenshotEditorEntryProps) {
	const [open, setOpen] = useState(false);
	const [editingScene, setEditingScene] = useState<ScreenshotScene | null>(
		null,
	);

	const handleNew = () => {
		setEditingScene(null);
		setOpen(true);
	};

	const handleOpen = (scene: ScreenshotScene) => {
		setEditingScene(scene);
		setOpen(true);
	};

	return (
		<>
			<SceneGallery
				appId={appId}
				language={language}
				displayType={displayType}
				onNew={handleNew}
				onOpen={handleOpen}
			/>
			{open && (
				<ScreenshotEditorDialog
					key={editingScene?.id ?? "new"}
					open={open}
					onOpenChange={setOpen}
					appId={appId}
					versionId={versionId}
					language={language}
					displayType={displayType}
					editingScene={editingScene}
				/>
			)}
		</>
	);
}
