"use client";

import { useState } from "react";

import type { ScreenshotScene } from "@/lib/types";

import { SceneGallery } from "./scene-gallery";
import { ScreenshotEditorDialog } from "./screenshot-editor-dialog";

interface ScreenshotEditorEntryProps {
	appId: string;
	/**
	 * Empty for an app that has no store version yet (a link import, or an app
	 * not published at all). The editor still works: scenes are app-scoped and
	 * the base screenshots come from the app's synced assets. Only uploading
	 * back to the store needs a version.
	 */
	versionId?: string;
	language: string;
	displayType: string;
	/** Open the editor straight away - the fix queue sends people here to edit, not to browse. */
	autoOpen?: boolean;
	/** Store screenshot to start a fresh scene from (gallery click, or the first one from the queue). */
	seedScreenshot?: { externalId: string; url: string } | null;
}

/**
 * Drop-in entry point for the screenshot editor: shows the saved-scenes gallery
 * with an "Open editor" button and manages the full-screen editor dialog. A
 * `key` on the dialog forces a fresh editor state each time it opens so a new
 * scene never inherits the previous scene's layers.
 */
export function ScreenshotEditorEntry({
	appId,
	versionId = "",
	language,
	displayType,
	autoOpen = false,
	seedScreenshot = null,
}: ScreenshotEditorEntryProps) {
	const [open, setOpen] = useState(autoOpen);
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
				versionId={versionId}
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
					seedScreenshot={editingScene ? null : seedScreenshot}
					language={language}
					displayType={displayType}
					editingScene={editingScene}
				/>
			)}
		</>
	);
}
