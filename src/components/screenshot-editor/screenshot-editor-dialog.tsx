"use client";

import {
	Download,
	Languages,
	LayoutTemplate,
	Loader2,
	Redo2,
	Save,
	Undo2,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDeviceModel } from "@/hooks/use-device-model";
import { useSceneHistory } from "@/hooks/use-scene-history";
import {
	useCreateScreenshotScene,
	useUpdateScreenshotScene,
} from "@/hooks/use-screenshot-scenes";
import {
	useSplitUploadScreenshots,
	useUploadScreenshot,
	useVersionScreenshots,
} from "@/hooks/use-publishing";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getScreenshotDimensionError } from "@/lib/api";
import { Label } from "@/components/ui/label";
import {
	dedupeFontFamily,
	loadGoogleFont,
	registerCustomFont,
	sanitizeFontFamilyName,
} from "@/lib/scene-fonts";
import {
	applyOrientation,
	applyPanelCount,
	createDefaultAnnotation,
	createDefaultScene,
	createImageAnnotation,
	createShapeAnnotation,
	getDisplayTypeLabel,
	getPanelCount,
	getSceneOrientation,
	reorderById,
	type SceneOrientation,
} from "@/lib/screenshot-editor";
import { buildDimensionMessage } from "@/lib/screenshot-validation";
import {
	applyTemplate,
	SCENE_TEMPLATES,
	type SceneTemplate,
} from "@/lib/scene-templates";
import type {
	SceneAnnotation,
	SceneAnnotationType,
	SceneData,
	SceneShapeKind,
	SceneTextLayer,
	ScreenshotScene,
	VersionScreenshot,
} from "@/lib/types";

import { LayersPanel, PropertiesPanel } from "./editor-panels";
import { exportSceneToPng } from "./export-scene";
import type { RenderImages } from "./render-scene";
import { SceneCanvas, type SceneCanvasHandle } from "./scene-canvas";
import { SceneLocalizationDialog } from "./scene-localization-dialog";
import { ScenePreview } from "./scene-preview";
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

/** Decode an image source just to read its natural aspect (height / width). */
function readImageAspect(src: string): Promise<number> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () =>
			resolve(
				img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1,
			);
		img.onerror = () => resolve(1);
		img.src = src;
	});
}

let textLayerSeq = 0;
function nextTextLayerId(): string {
	textLayerSeq += 1;
	return `text-${Date.now()}-${textLayerSeq}`;
}

let annotationSeq = 0;
function nextAnnotationId(): string {
	annotationSeq += 1;
	return `ann-${Date.now()}-${annotationSeq}`;
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
	const [scene, setScene, history] = useSceneHistory<SceneData>(
		() => editingScene?.scene ?? createDefaultScene(displayType),
	);
	const [sceneName, setSceneName] = useState(
		() => editingScene?.name ?? "New scene",
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
	const [localizeOpen, setLocalizeOpen] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [templatesOpen, setTemplatesOpen] = useState(false);

	const canvasRef = useRef<SceneCanvasHandle>(null);
	const bgFileRef = useRef<HTMLInputElement>(null);
	const screenshotFileRef = useRef<HTMLInputElement>(null);
	const imageLayerFileRef = useRef<HTMLInputElement>(null);
	// Annotation id whose image is being replaced; null = add a new image layer.
	const imageLayerTargetRef = useRef<string | null>(null);
	const fontFileRef = useRef<HTMLInputElement>(null);
	// Text layer that requested the font upload; its family is set on success.
	const fontTargetRef = useRef<string | null>(null);
	// Add-Google-Font flow: mini dialog state + the text layer that opened it.
	const [googleFontOpen, setGoogleFontOpen] = useState(false);
	const [googleFontLoading, setGoogleFontLoading] = useState(false);
	const googleFontTargetRef = useRef<string | null>(null);

	const createScene = useCreateScreenshotScene(appId);
	const updateScene = useUpdateScreenshotScene(appId);
	const uploadScreenshot = useUploadScreenshot(appId, versionId);
	const splitUpload = useSplitUploadScreenshots(appId, versionId);
	// Screenshots already uploaded for this app/version (incl. panorama splits),
	// so the editor can reuse them as the device screenshot from the DB.
	const existingScreenshots = useVersionScreenshots(appId, versionId);

	const loaded = useSceneImages(scene, screenshotSrc);
	const deviceModelImage = useDeviceModel(
		scene,
		loaded.screenshot
			? {
					source: loaded.screenshot.element,
					width: loaded.screenshot.width,
					height: loaded.screenshot.height,
				}
			: undefined,
	);
	// Wrap each decoded image with its natural pixel dimensions so the renderer's
	// fit math is correct regardless of the element's layout size.
	const renderImages = useMemo<RenderImages>(
		() => ({
			deviceModel: deviceModelImage,
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
			bezel: loaded.bezel
				? {
						source: loaded.bezel.element,
						width: loaded.bezel.width,
						height: loaded.bezel.height,
					}
				: undefined,
			annotations: loaded.annotations
				? Object.fromEntries(
						Object.entries(loaded.annotations).map(([id, img]) => [
							id,
							{
								source: img.element,
								width: img.width,
								height: img.height,
							},
						]),
					)
				: undefined,
		}),
		[
			loaded.background,
			loaded.screenshot,
			loaded.bezel,
			loaded.annotations,
			deviceModelImage,
		],
	);
	// Current per-panel export dimensions, derived from the scene itself so the
	// header and uploads always match the real canvas (orientation-aware).
	const orientation = getSceneOrientation(scene);
	const panelWidth = Math.round(scene.width / getPanelCount(scene));
	const panelHeight = scene.height;

	// Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z (or Ctrl+Y) redo — skipped while typing.
	const { undo, redo } = history;
	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (!e.metaKey && !e.ctrlKey) return;
			const key = e.key.toLowerCase();
			if (key !== "z" && key !== "y") return;
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}
			e.preventDefault();
			if (key === "y" || e.shiftKey) redo();
			else undo();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, undo, redo]);

	const patchScene = useCallback(
		(patch: Partial<SceneData>) => {
			setScene((prev) => ({ ...prev, ...patch }));
		},
		[setScene],
	);

	const patchTextLayer = useCallback(
		(id: string, patch: Partial<SceneTextLayer>) => {
			setScene((prev) => ({
				...prev,
				textLayers: prev.textLayers.map((l) =>
					l.id === id ? { ...l, ...patch } : l,
				),
			}));
		},
		[setScene],
	);

	const moveTextLayer = useCallback((id: string, x: number, y: number) => {
		setScene((prev) => ({
			...prev,
			textLayers: prev.textLayers.map((l) =>
				l.id === id ? { ...l, x, y } : l,
			),
		}));
	}, [setScene]);

	const addTextLayer = useCallback(() => {
		const id = nextTextLayerId();
		setScene((prev) => ({
			...prev,
			textLayers: [
				...prev.textLayers,
				{
					id,
					text: "New text",
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
	}, [setScene]);

	const addEmoji = useCallback(
		(emoji: string) => {
			const id = nextTextLayerId();
			setScene((prev) => ({
				...prev,
				textLayers: [
					...prev.textLayers,
					{
						align: "center" as const,
						color: "#ffffff",
						// Emoji glyphs are colored by the font itself; keep verbatim
						// across language variants.
						doNotTranslate: true,
						fontFamily: "Inter, system-ui, sans-serif",
						fontSize: Math.round(prev.height * 0.07),
						id,
						text: emoji,
						x: 0.5,
						y: 0.4,
					},
				],
			}));
			setSelectedLayerId(id);
		},
		[setScene],
	);

	const deleteTextLayer = useCallback(
		(id: string) => {
			setScene((prev) => ({
				...prev,
				textLayers: prev.textLayers.filter((l) => l.id !== id),
			}));
			if (selectedLayerId === id) setSelectedLayerId(null);
		},
		[selectedLayerId, setScene],
	);

	const patchAnnotation = useCallback(
		(id: string, patch: Partial<SceneAnnotation>) => {
			setScene((prev) => ({
				...prev,
				annotations: (prev.annotations ?? []).map((a) =>
					a.id === id ? ({ ...a, ...patch } as SceneAnnotation) : a,
				),
			}));
		},
		[setScene],
	);

	const moveAnnotation = useCallback((id: string, x: number, y: number) => {
		setScene((prev) => ({
			...prev,
			annotations: (prev.annotations ?? []).map((a) =>
				a.id === id ? { ...a, x, y } : a,
			),
		}));
	}, [setScene]);

	const moveCalloutTarget = useCallback(
		(id: string, targetX: number, targetY: number) => {
			setScene((prev) => ({
				...prev,
				annotations: (prev.annotations ?? []).map((a) =>
					a.id === id && a.type === "callout"
						? { ...a, targetX, targetY }
						: a,
				),
			}));
		},
		[setScene],
	);

	const addAnnotation = useCallback((type: SceneAnnotationType) => {
		const id = nextAnnotationId();
		setScene((prev) => ({
			...prev,
			annotations: [
				...(prev.annotations ?? []),
				createDefaultAnnotation(type, prev, id),
			],
		}));
		setSelectedLayerId(id);
	}, [setScene]);

	const addShape = useCallback((shape: SceneShapeKind) => {
		const id = nextAnnotationId();
		setScene((prev) => ({
			...prev,
			annotations: [
				...(prev.annotations ?? []),
				createShapeAnnotation(id, shape, prev),
			],
		}));
		setSelectedLayerId(id);
	}, [setScene]);

	const deleteAnnotation = useCallback(
		(id: string) => {
			setScene((prev) => ({
				...prev,
				annotations: (prev.annotations ?? []).filter((a) => a.id !== id),
			}));
			if (selectedLayerId === id) setSelectedLayerId(null);
		},
		[selectedLayerId, setScene],
	);

	/**
	 * Copy the source layer's STYLE (never its text/position) onto every other
	 * text layer — the "copy text style" flow ButterKit users asked for.
	 */
	const applyTextStyleToAll = useCallback(
		(sourceId: string) => {
			setScene((prev) => {
				const source = prev.textLayers.find((l) => l.id === sourceId);
				if (!source) return prev;
				return {
					...prev,
					textLayers: prev.textLayers.map((l) =>
						l.id === sourceId || l.locked
							? l
							: {
									...l,
									accentColor: source.accentColor,
									align: source.align,
									bg: source.bg,
									color: source.color,
									curve: source.curve,
									fontFamily: source.fontFamily,
									gradient: source.gradient,
									highlight: source.highlight,
									letterSpacing: source.letterSpacing,
									lineHeight: source.lineHeight,
									shadowBlur: source.shadowBlur,
									shadowColor: source.shadowColor,
									shadowOffsetX: source.shadowOffsetX,
									shadowOffsetY: source.shadowOffsetY,
									strokeColor: source.strokeColor,
									strokeWidth: source.strokeWidth,
									weight: source.weight,
								},
					),
				};
			});
			toast.success("Style applied to all text layers");
		},
		[setScene],
	);

	/**
	 * Copy the source annotation's STYLE onto every other annotation of the
	 * same type ("Copy a Callout's style" from the ButterKit changelog, asked
	 * for by users). Content (text/author) and positions are never copied.
	 */
	const applyAnnotationStyleToAll = useCallback(
		(sourceId: string) => {
			setScene((prev) => {
				const source = (prev.annotations ?? []).find((a) => a.id === sourceId);
				if (!source || source.type === "image" || source.type === "shape") {
					return prev;
				}
				return {
					...prev,
					annotations: (prev.annotations ?? []).map((a) => {
						if (a.id === sourceId || a.type !== source.type) return a;
						const styled = {
							...a,
							bg: source.bg,
							color: source.color,
							fontFamily: source.fontFamily,
							fontSize: source.fontSize,
							weight: source.weight,
						} as SceneAnnotation;
						if (styled.type === "label" && source.type === "label") {
							styled.showBackground = source.showBackground;
						}
						if (styled.type === "review" && source.type === "review") {
							styled.showBackground = source.showBackground;
							styled.showQuoteMark = source.showQuoteMark;
							styled.stars = source.stars;
						}
						return styled;
					}),
				};
			});
			toast.success("Style applied to all annotations of this type");
		},
		[setScene],
	);

	const reorderTextLayer = useCallback(
		(id: string, delta: -1 | 1) => {
			setScene((prev) => ({
				...prev,
				textLayers: reorderById(prev.textLayers, id, delta),
			}));
		},
		[setScene],
	);

	const reorderAnnotation = useCallback(
		(id: string, delta: -1 | 1) => {
			setScene((prev) => ({
				...prev,
				annotations: reorderById(prev.annotations ?? [], id, delta),
			}));
		},
		[setScene],
	);

	/** Clamp a normalized coordinate so a duplicate stays on the canvas. */
	const nudge = (v: number) => Math.min(v + 0.03, 0.97);

	const duplicateTextLayer = useCallback(
		(id: string) => {
			const newId = nextTextLayerId();
			setScene((prev) => {
				const source = prev.textLayers.find((l) => l.id === id);
				if (!source) return prev;
				return {
					...prev,
					textLayers: [
						...prev.textLayers,
						{ ...source, id: newId, x: nudge(source.x), y: nudge(source.y) },
					],
				};
			});
			setSelectedLayerId(newId);
		},
		[setScene],
	);

	const duplicateAnnotation = useCallback(
		(id: string) => {
			const newId = nextAnnotationId();
			setScene((prev) => {
				const source = (prev.annotations ?? []).find((a) => a.id === id);
				if (!source) return prev;
				const copy: SceneAnnotation =
					source.type === "callout"
						? {
								...source,
								id: newId,
								targetX: nudge(source.targetX),
								targetY: nudge(source.targetY),
								x: nudge(source.x),
								y: nudge(source.y),
							}
						: { ...source, id: newId, x: nudge(source.x), y: nudge(source.y) };
				return { ...prev, annotations: [...(prev.annotations ?? []), copy] };
			});
			setSelectedLayerId(newId);
		},
		[setScene],
	);

	const moveDevice = useCallback((offsetX: number, offsetY: number) => {
		setScene((prev) =>
			prev.device
				? { ...prev, device: { ...prev.device, offsetX, offsetY } }
				: prev,
		);
	}, [setScene]);

	const handleAddImageLayer = useCallback(() => {
		imageLayerTargetRef.current = null;
		imageLayerFileRef.current?.click();
	}, []);

	const handleDropImageFile = useCallback(
		async (
			dataUrl: string,
			drop: { nx: number; ny: number; overDevice: boolean },
		) => {
			if (drop.overDevice) {
				setScreenshotSrc(dataUrl);
				setScene((prev) => ({
					...prev,
					screenshot: { ...prev.screenshot, url: dataUrl },
				}));
				toast.success("Screenshot set from the dropped image");
				return;
			}
			const aspect = await readImageAspect(dataUrl);
			const id = nextAnnotationId();
			setScene((prev) => ({
				...prev,
				annotations: [
					...(prev.annotations ?? []),
					{
						...createImageAnnotation(id, dataUrl, aspect),
						x: drop.nx,
						y: drop.ny,
					},
				],
			}));
			setSelectedLayerId(id);
		},
		[setScene],
	);

	const handleReplaceAnnotationImage = useCallback((id: string) => {
		imageLayerTargetRef.current = id;
		imageLayerFileRef.current?.click();
	}, []);

	const handleImageLayerFile = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		const dataUrl = await readFileAsDataUrl(file);
		const aspect = await readImageAspect(dataUrl);
		const targetId = imageLayerTargetRef.current;
		imageLayerTargetRef.current = null;
		if (targetId) {
			setScene((prev) => ({
				...prev,
				annotations: (prev.annotations ?? []).map((a) =>
					a.id === targetId && a.type === "image"
						? { ...a, url: dataUrl, aspect }
						: a,
				),
			}));
			return;
		}
		const id = nextAnnotationId();
		setScene((prev) => ({
			...prev,
			annotations: [
				...(prev.annotations ?? []),
				createImageAnnotation(id, dataUrl, aspect),
			],
		}));
		setSelectedLayerId(id);
	};

	const handleUploadFont = useCallback(() => {
		fontTargetRef.current = selectedLayerId;
		fontFileRef.current?.click();
	}, [selectedLayerId]);

	const handleAddGoogleFont = useCallback(() => {
		googleFontTargetRef.current = selectedLayerId;
		setGoogleFontOpen(true);
	}, [selectedLayerId]);

	const handleGoogleFontSubmit = async (family: string) => {
		const name = family.trim();
		if (!name) return;
		setGoogleFontLoading(true);
		const loaded = await loadGoogleFont(name);
		setGoogleFontLoading(false);
		if (!loaded) {
			toast.error(`"${name}" was not found on Google Fonts`);
			return;
		}
		const targetId = googleFontTargetRef.current;
		googleFontTargetRef.current = null;
		setScene((prev) => ({
			...prev,
			googleFonts: (prev.googleFonts ?? []).includes(name)
				? prev.googleFonts
				: [...(prev.googleFonts ?? []), name],
			textLayers: targetId
				? prev.textLayers.map((l) =>
						l.id === targetId ? { ...l, fontFamily: name } : l,
					)
				: prev.textLayers,
		}));
		setGoogleFontOpen(false);
		toast.success(`Google Font "${name}" added`);
	};

	const handleFontFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		try {
			const dataUrl = await readFileAsDataUrl(file);
			const family = dedupeFontFamily(
				sanitizeFontFamilyName(file.name),
				(scene.customFonts ?? []).map((f) => f.family),
			);
			const font = { dataUrl, family };
			// Register up front so the canvas can draw with the new family
			// immediately after the state update.
			await registerCustomFont(font);
			const targetId = fontTargetRef.current;
			fontTargetRef.current = null;
			setScene((prev) => ({
				...prev,
				customFonts: [...(prev.customFonts ?? []), font],
				textLayers: targetId
					? prev.textLayers.map((l) =>
							l.id === targetId ? { ...l, fontFamily: family } : l,
						)
					: prev.textLayers,
			}));
			toast.success(`Font "${family}" added`);
		} catch {
			toast.error("Failed to load the font file");
		}
	};

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

	const handlePickExistingScreenshot = useCallback(
		(shot: VersionScreenshot) => {
			setScreenshotSrc(shot.url);
			setScene((prev) => ({
				...prev,
				screenshot: {
					...prev.screenshot,
					assetId: shot.externalId,
					url: shot.url,
				},
			}));
			setPickerOpen(false);
		},
		[setScene],
	);

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
			toast.success("Scene saved");
		} catch {
			toast.error("Failed to save the scene");
		}
	};

	const handleApplyTemplate = useCallback(
		(template: SceneTemplate) => {
			setScene((prev) => applyTemplate(template, prev, displayType));
			setSelectedLayerId("__device");
			setTemplatesOpen(false);
			toast.success(`Template "${template.name}" applied`);
		},
		[displayType, setScene],
	);

	const panels = getPanelCount(scene);

	const handlePanelsChange = useCallback(
		(value: string) => {
			const count = Number.parseInt(value, 10);
			if (!Number.isFinite(count) || count < 1) return;
			setScene((prev) => applyPanelCount(prev, displayType, count));
		},
		[displayType, setScene],
	);

	const handleOrientationChange = useCallback(
		(value: string) => {
			setScene((prev) =>
				applyOrientation(prev, displayType, value as SceneOrientation),
			);
		},
		[displayType, setScene],
	);

	/**
	 * Local PNG download. `deviceOnly` strips texts and annotations before the
	 * off-screen render — ButterKit's "Include text & images" toggle, useful
	 * for websites and marketing posts.
	 */
	const handleDownload = async (deviceOnly: boolean) => {
		const target: SceneData = deviceOnly
			? { ...scene, annotations: [], textLayers: [] }
			: scene;
		const blob = await exportSceneToPng(target);
		if (!blob) {
			toast.error(
				"Cannot export — the image comes from a remote source without CORS headers. Upload the file locally.",
			);
			return;
		}
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${sceneName.replace(/\s+/g, "-").toLowerCase()}-${language}-${displayType}${deviceOnly ? "-device" : ""}.png`;
		link.click();
		URL.revokeObjectURL(url);
	};

	const handleExportUpload = async () => {
		const blob = await canvasRef.current?.exportPng();
		if (!blob) {
			toast.error(
				"Cannot export — the image comes from a remote source without CORS headers. Upload the file locally.",
			);
			return;
		}
		const [w, h] = [panelWidth, panelHeight];
		const file = new File([blob], `scene-${language}-${displayType}.png`, {
			type: "image/png",
		});
		try {
			if (panels > 1) {
				// Panorama: upload the wide PNG once; the backend slices it into
				// `panels` store screenshots at the exact target size.
				await splitUpload.mutateAsync({
					displayType,
					file,
					language,
					parts: panels,
					targetHeight: h,
					targetWidth: w,
				});
				toast.success(`Uploaded panorama as ${panels} screenshots ${w}×${h}px`);
			} else {
				await uploadScreenshot.mutateAsync({ displayType, file, language });
				toast.success(`Uploaded screenshot ${w}×${h}px`);
			}
		} catch (err) {
			const dimErr = getScreenshotDimensionError(err);
			if (dimErr) {
				toast.error(buildDimensionMessage(dimErr));
			} else {
				toast.error("Failed to upload the screenshot");
			}
		}
	};

	const isSaving = createScene.isPending || updateScene.isPending;
	const isUploading = uploadScreenshot.isPending || splitUpload.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="flex h-[92vh] w-[96vw] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]"
			>
				<DialogHeader className="flex flex-row items-center justify-between gap-4 border-b border-border px-4 py-3">
					<div className="flex flex-1 items-center gap-3">
						<DialogTitle className="shrink-0">Screenshot editor</DialogTitle>
						<Input
							value={sceneName}
							onChange={(e) => setSceneName(e.target.value)}
							className="max-w-xs"
							placeholder="Scene name"
						/>
						<span className="text-sm text-muted-foreground">
							{getDisplayTypeLabel(displayType)} · {language} · {panelWidth}×
							{panelHeight}px
							{panels > 1 ? ` × ${panels}` : ""}
						</span>
						<Select value={orientation} onValueChange={handleOrientationChange}>
							<SelectTrigger className="w-[130px]" size="sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="portrait">Portrait</SelectItem>
								<SelectItem value="landscape">Landscape</SelectItem>
							</SelectContent>
						</Select>
						<Select value={String(panels)} onValueChange={handlePanelsChange}>
							<SelectTrigger className="w-[150px]" size="sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1">Single screen</SelectItem>
								{[2, 3, 4, 5].map((n) => (
									<SelectItem key={n} value={String(n)}>
										Panorama × {n}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={undo}
							disabled={!history.canUndo}
							aria-label="Undo (Cmd+Z)"
							title="Undo (Cmd+Z)"
						>
							<Undo2 className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							onClick={redo}
							disabled={!history.canRedo}
							aria-label="Redo (Cmd+Shift+Z)"
							title="Redo (Cmd+Shift+Z)"
						>
							<Redo2 className="h-4 w-4" />
						</Button>
						<Button variant="outline" onClick={() => setTemplatesOpen(true)}>
							<LayoutTemplate className="h-4 w-4" />
							Templates
						</Button>
						<Button
							variant="outline"
							onClick={() => setLocalizeOpen(true)}
							disabled={
								scene.textLayers.length === 0 &&
								!(scene.annotations ?? []).some(
									(a) => a.type !== "image" && a.type !== "shape",
								)
							}
						>
							<Languages className="h-4 w-4" />
							Language variants
						</Button>
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
							Save
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" aria-label="Download PNG">
									<Download className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onSelect={() => handleDownload(false)}>
									Download PNG
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={() => handleDownload(true)}>
									Download PNG (device only)
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<Button onClick={handleExportUpload} disabled={isUploading}>
							{isUploading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Upload className="h-4 w-4" />
							)}
							Export and upload
						</Button>
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							Close
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
						onAddAnnotation={addAnnotation}
						onAddShape={addShape}
						onAddImage={handleAddImageLayer}
						onDeleteAnnotation={deleteAnnotation}
						onDuplicateText={duplicateTextLayer}
						onDuplicateAnnotation={duplicateAnnotation}
						onReorderText={reorderTextLayer}
						onReorderAnnotation={reorderAnnotation}
						onAddEmoji={addEmoji}
					/>

					<div className="flex min-w-0 flex-1 items-center justify-center bg-muted/30 p-6">
						<SceneCanvas
							ref={canvasRef}
							scene={scene}
							images={renderImages}
							selectedLayerId={selectedLayerId}
							onSelectLayer={setSelectedLayerId}
							onMoveLayer={moveTextLayer}
							onMoveAnnotation={moveAnnotation}
							onMoveCalloutTarget={moveCalloutTarget}
							onMoveDevice={moveDevice}
							onDropImageFile={handleDropImageFile}
						/>
					</div>

					<PropertiesPanel
						scene={scene}
						selectedLayerId={selectedLayerId}
						onPatchScene={patchScene}
						onPatchTextLayer={patchTextLayer}
						onPatchAnnotation={patchAnnotation}
						onPickBackgroundImage={() => bgFileRef.current?.click()}
						onPickScreenshot={() => screenshotFileRef.current?.click()}
						onPickExistingScreenshot={() => setPickerOpen(true)}
						onUploadFont={handleUploadFont}
						onAddGoogleFont={handleAddGoogleFont}
						onReplaceAnnotationImage={handleReplaceAnnotationImage}
						onDeleteAnnotation={deleteAnnotation}
						onApplyTextStyleToAll={applyTextStyleToAll}
						onApplyAnnotationStyleToAll={applyAnnotationStyleToAll}
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
				<input
					ref={imageLayerFileRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleImageLayerFile}
				/>
				<input
					ref={fontFileRef}
					type="file"
					accept=".ttf,.otf,.woff,.woff2"
					className="hidden"
					onChange={handleFontFile}
				/>

				{localizeOpen && (
					<SceneLocalizationDialog
						open={localizeOpen}
						onOpenChange={setLocalizeOpen}
						appId={appId}
						versionId={versionId}
						sourceScene={scene}
						sourceName={sceneName}
						sourceLanguage={language}
						displayType={displayType}
					/>
				)}

				<ExistingScreenshotPicker
					open={pickerOpen}
					onOpenChange={setPickerOpen}
					screenshots={existingScreenshots.data ?? []}
					loading={existingScreenshots.isLoading}
					displayType={displayType}
					onPick={handlePickExistingScreenshot}
				/>

				<TemplateGalleryDialog
					open={templatesOpen}
					onOpenChange={setTemplatesOpen}
					displayType={displayType}
					onPick={handleApplyTemplate}
				/>

				<GoogleFontDialog
					open={googleFontOpen}
					onOpenChange={setGoogleFontOpen}
					loading={googleFontLoading}
					onSubmit={handleGoogleFontSubmit}
				/>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Template gallery: live canvas thumbnails of every built-in template rendered
 * at the CURRENT display type, so the preview matches what applying it does.
 * Applying replaces the scene layout but keeps the screenshot and fonts.
 */
function TemplateGalleryDialog({
	open,
	onOpenChange,
	displayType,
	onPick,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	displayType: string;
	onPick: (template: SceneTemplate) => void;
}) {
	// Build preview scenes lazily — only while the dialog is open.
	const previews = useMemo(
		() =>
			open
				? SCENE_TEMPLATES.map((template) => ({
						scene: template.build(displayType),
						template,
					}))
				: [],
		[open, displayType],
	);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>Scene templates</DialogTitle>
				</DialogHeader>
				<p className="text-xs text-muted-foreground">
					Applying a template replaces the current layout. Your screenshot and
					fonts are kept.
				</p>
				<div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-4">
					{previews.map(({ template, scene }) => (
						<button
							key={template.id}
							type="button"
							onClick={() => onPick(template)}
							className="group flex flex-col items-center gap-1.5 rounded-lg border border-border p-2 transition-colors hover:border-primary hover:bg-accent/40"
						>
							<ScenePreview scene={scene} className="max-h-56" />
							<span className="text-xs font-medium">{template.name}</span>
							<span className="text-center text-[10px] text-muted-foreground">
								{template.description}
							</span>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Minimal add-Google-Font prompt: type any family name from fonts.google.com
 * (e.g. "Luckiest Guy") and it is fetched, registered on document.fonts and
 * added to the scene's font list.
 */
function GoogleFontDialog({
	open,
	onOpenChange,
	loading,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	loading: boolean;
	onSubmit: (family: string) => void;
}) {
	const [family, setFamily] = useState("");
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Add Google Font</DialogTitle>
				</DialogHeader>
				<form
					className="flex flex-col gap-3"
					onSubmit={(e) => {
						e.preventDefault();
						onSubmit(family);
					}}
				>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="google-font-name" className="text-xs">
							Font name (as on fonts.google.com)
						</Label>
						<Input
							id="google-font-name"
							value={family}
							placeholder="e.g. Luckiest Guy"
							autoFocus
							onChange={(e) => setFamily(e.target.value)}
						/>
					</div>
					<Button type="submit" disabled={loading || !family.trim()}>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" /> Loading…
							</>
						) : (
							"Add font"
						)}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Picker for screenshots already uploaded to the store (including panorama
 * splits). Prefers screenshots for the current device size, falling back to all
 * of them, so a user can reuse an existing image as the device screenshot.
 */
function ExistingScreenshotPicker({
	open,
	onOpenChange,
	screenshots,
	loading,
	displayType,
	onPick,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	screenshots: VersionScreenshot[];
	loading: boolean;
	displayType: string;
	onPick: (shot: VersionScreenshot) => void;
}) {
	const sameDevice = screenshots.filter((s) => s.displayType === displayType);
	const list = sameDevice.length > 0 ? sameDevice : screenshots;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Choose from uploaded screenshots</DialogTitle>
				</DialogHeader>
				{loading ? (
					<div className="flex items-center justify-center py-12 text-muted-foreground">
						<Loader2 className="h-5 w-5 animate-spin" />
					</div>
				) : list.length === 0 ? (
					<p className="py-12 text-center text-sm text-muted-foreground">
						No uploaded screenshots for this app.
					</p>
				) : (
					<div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4">
						{list.map((shot) => (
							<button
								key={shot.externalId}
								type="button"
								onClick={() => onPick(shot)}
								className="group flex flex-col items-center gap-1 rounded-lg border border-border p-1.5 transition-colors hover:border-primary hover:bg-accent/40"
							>
								{/* Plain <img>: asset URLs are remote (CDN); next/image not used here. */}
								<img
									src={shot.url}
									alt={shot.language}
									className="h-40 w-full rounded object-contain"
								/>
								<span className="text-[10px] text-muted-foreground">
									{shot.language}
								</span>
							</button>
						))}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
