"use client";

import { Loader2, Save, Upload } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	useCreateScreenshotScene,
	useUpdateScreenshotScene,
} from "@/hooks/use-screenshot-scenes";
import { useUploadScreenshot } from "@/hooks/use-publishing";
import { getScreenshotDimensionError } from "@/lib/api";
import {
	createDefaultScene,
	getDisplayTypeLabel,
	getTargetDimensions,
} from "@/lib/screenshot-editor";
import { buildDimensionMessage } from "@/lib/screenshot-validation";
import type {
	SceneData,
	SceneTextLayer,
	ScreenshotScene,
} from "@/lib/types";

import { LayersPanel, PropertiesPanel } from "./editor-panels";
import type { RenderImages } from "./render-scene";
import { SceneCanvas, type SceneCanvasHandle } from "./scene-canvas";
import { useSceneImages } from "./use-scene-images";

interface ScreenshotEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appId: string;
	versionId: string;
	language: string;
	displayType: string;
	/** Existing scene to reopen, or null to start a fresh scene. */
	editingScene?: ScreenshotScene | null;
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

let textLayerSeq = 0;
function nextTextLayerId(): string {
	textLayerSeq += 1;
	return `text-${Date.now()}-${textLayerSeq}`;
}

export function ScreenshotEditorDialog({
	open,
	onOpenChange,
	appId,
	versionId,
	language,
	displayType,
	editingScene,
}: ScreenshotEditorDialogProps) {
	const [scene, setScene] = useState<SceneData>(
		() => editingScene?.scene ?? createDefaultScene(displayType),
	);
	const [sceneName, setSceneName] = useState(
		() => editingScene?.name ?? "Nowa scena",
	);
	const [sceneId, setSceneId] = useState<string | null>(
		editingScene?.id ?? null,
	);
	const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
		"__device",
	);
	const [screenshotSrc, setScreenshotSrc] = useState<string | undefined>(
		editingScene?.scene.screenshot?.url,
	);

	const canvasRef = useRef<SceneCanvasHandle>(null);
	const bgFileRef = useRef<HTMLInputElement>(null);
	const screenshotFileRef = useRef<HTMLInputElement>(null);

	const createScene = useCreateScreenshotScene(appId);
	const updateScene = useUpdateScreenshotScene(appId);
	const uploadScreenshot = useUploadScreenshot(appId, versionId);

	const loaded = useSceneImages(scene, screenshotSrc);
	// Wrap each decoded image with its natural pixel dimensions so the renderer's
	// fit math is correct regardless of the element's layout size.
	const renderImages = useMemo<RenderImages>(
		() => ({
			background: loaded.background
				? {
						source: loaded.background.element,
						width: loaded.background.width,
						height: loaded.background.height,
					}
				: undefined,
			screenshot: loaded.screenshot
				? {
						source: loaded.screenshot.element,
						width: loaded.screenshot.width,
						height: loaded.screenshot.height,
					}
				: undefined,
		}),
		[loaded.background, loaded.screenshot],
	);
	const [target0, target1] = useMemo(
		() => getTargetDimensions(displayType),
		[displayType],
	);

	const patchScene = useCallback((patch: Partial<SceneData>) => {
		setScene((prev) => ({ ...prev, ...patch }));
	}, []);

	const patchTextLayer = useCallback(
		(id: string, patch: Partial<SceneTextLayer>) => {
			setScene((prev) => ({
				...prev,
				textLayers: prev.textLayers.map((l) =>
					l.id === id ? { ...l, ...patch } : l,
				),
			}));
		},
		[],
	);

	const moveTextLayer = useCallback((id: string, x: number, y: number) => {
		setScene((prev) => ({
			...prev,
			textLayers: prev.textLayers.map((l) =>
				l.id === id ? { ...l, x, y } : l,
			),
		}));
	}, []);

	const addTextLayer = useCallback(() => {
		const id = nextTextLayerId();
		setScene((prev) => ({
			...prev,
			textLayers: [
				...prev.textLayers,
				{
					id,
					text: "Nowy napis",
					x: 0.5,
					y: 0.2,
					fontFamily: "Inter, system-ui, sans-serif",
					fontSize: Math.round(prev.height * 0.035),
					color: "#ffffff",
					align: "center",
					weight: 600,
				},
			],
		}));
		setSelectedLayerId(id);
	}, []);

	const deleteTextLayer = useCallback(
		(id: string) => {
			setScene((prev) => ({
				...prev,
				textLayers: prev.textLayers.filter((l) => l.id !== id),
			}));
			if (selectedLayerId === id) setSelectedLayerId(null);
		},
		[selectedLayerId],
	);

	const handleBackgroundFile = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const dataUrl = await readFileAsDataUrl(file);
		patchScene({ background: { type: "image", value: dataUrl } });
	};

	const handleScreenshotFile = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const dataUrl = await readFileAsDataUrl(file);
		setScreenshotSrc(dataUrl);
		patchScene({
			screenshot: { ...scene.screenshot, url: dataUrl },
		});
	};

	const handleSave = async () => {
		try {
			if (sceneId) {
				await updateScene.mutateAsync({
					sceneId,
					data: { name: sceneName, scene },
				});
			} else {
				const created = await createScene.mutateAsync({
					displayType,
					language,
					name: sceneName,
					scene,
				});
				setSceneId(created.id);
			}
			toast.success("Scena zapisana");
		} catch {
			toast.error("Nie udało się zapisać sceny");
		}
	};

	const handleExportUpload = async () => {
		const blob = await canvasRef.current?.exportPng();
		if (!blob) {
			toast.error(
				"Nie można wyeksportować — obraz pochodzi ze zdalnego źródła bez nagłówków CORS. Wgraj plik lokalnie.",
			);
			return;
		}
		const [w, h] = [target0, target1];
		const file = new File([blob], `scene-${language}-${displayType}.png`, {
			type: "image/png",
		});
		try {
			await uploadScreenshot.mutateAsync({ displayType, file, language });
			toast.success(`Wgrano screenshot ${w}×${h}px`);
		} catch (err) {
			const dimErr = getScreenshotDimensionError(err);
			if (dimErr) {
				toast.error(buildDimensionMessage(dimErr));
			} else {
				toast.error("Nie udało się wgrać screenshotu");
			}
		}
	};

	const isSaving = createScene.isPending || updateScene.isPending;
	const isUploading = uploadScreenshot.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
			>
				<DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-border px-4 py-3">
					<div className="flex flex-1 items-center gap-3">
						<DialogTitle className="shrink-0">Edytor screenshotów</DialogTitle>
						<Input
							value={sceneName}
							onChange={(e) => setSceneName(e.target.value)}
							className="max-w-xs"
							placeholder="Nazwa sceny"
						/>
						<span className="text-sm text-muted-foreground">
							{getDisplayTypeLabel(displayType)} · {language} · {target0}×
							{target1}px
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							onClick={handleSave}
							disabled={isSaving}
						>
							{isSaving ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							Zapisz
						</Button>
						<Button onClick={handleExportUpload} disabled={isUploading}>
							{isUploading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Upload className="h-4 w-4" />
							)}
							Eksportuj i wgraj
						</Button>
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Zamknij
						</Button>
					</div>
				</DialogHeader>

				<div className="flex min-h-0 flex-1">
					<LayersPanel
						scene={scene}
						selectedLayerId={selectedLayerId}
						onSelectLayer={setSelectedLayerId}
						onAddText={addTextLayer}
						onDeleteText={deleteTextLayer}
					/>

					<div className="flex min-w-0 flex-1 items-center justify-center bg-muted/30 p-6">
						<SceneCanvas
							ref={canvasRef}
							scene={scene}
							images={renderImages}
							selectedLayerId={selectedLayerId}
							onSelectLayer={setSelectedLayerId}
							onMoveLayer={moveTextLayer}
						/>
					</div>

					<PropertiesPanel
						scene={scene}
						selectedLayerId={selectedLayerId}
						onPatchScene={patchScene}
						onPatchTextLayer={patchTextLayer}
						onPickBackgroundImage={() => bgFileRef.current?.click()}
						onPickScreenshot={() => screenshotFileRef.current?.click()}
					/>
				</div>

				<input
					ref={bgFileRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleBackgroundFile}
				/>
				<input
					ref={screenshotFileRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleScreenshotFile}
				/>
			</DialogContent>
		</Dialog>
	);
}
