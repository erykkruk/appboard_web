"use client";

import {
	Download,
	Languages,
	LayoutTemplate,
	Loader2,
	LogIn,
	Redo2,
	Save,
	Undo2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { LayersPanel, PropertiesPanel } from "@/components/screenshot-editor/editor-panels";
import { exportSceneToPng } from "@/components/screenshot-editor/export-scene";
import type { RenderImages } from "@/components/screenshot-editor/render-scene";
import {
	SceneCanvas,
	type SceneCanvasHandle,
} from "@/components/screenshot-editor/scene-canvas";
import {
	GoogleFontDialog,
	TemplateGalleryDialog,
} from "@/components/screenshot-editor/screenshot-editor-dialog";
import { useSceneImages } from "@/components/screenshot-editor/use-scene-images";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDeviceModel } from "@/hooks/use-device-model";
import { useSceneHistory } from "@/hooks/use-scene-history";
import {
	dedupeFontFamily,
	loadGoogleFont,
	registerCustomFont,
	sanitizeFontFamilyName,
} from "@/lib/scene-fonts";
import {
	applyPanoramaTemplate,
	applyTemplate,
	type PanoramaTemplate,
	type SceneTemplate,
} from "@/lib/scene-templates";
import {
	applyOrientation,
	applyPanelCount,
	createDefaultAnnotation,
	createDefaultScene,
	createImageAnnotation,
	createShapeAnnotation,
	DISPLAY_TYPE_LABELS,
	getPanelCount,
	getSceneOrientation,
	reorderById,
	type SceneOrientation,
} from "@/lib/screenshot-editor";
import type {
	SceneAnnotation,
	SceneAnnotationType,
	SceneData,
	SceneShapeKind,
	SceneTextLayer,
} from "@/lib/types";

// Public, no-auth screenshot editor. NOTHING touches the backend: scenes live
// in localStorage, exports are local PNG downloads, and "Save to AppBoard"
// funnels guests to sign-up. The website's "Free editor" links land here.

const DRAFT_KEY = "appboard-guest-editor-draft";

/** Display types offered to guests (portrait store targets). */
const GUEST_DISPLAY_TYPES = [
	"APP_IPHONE_67",
	"APP_IPHONE_65",
	"APP_IPAD_PRO_129",
	"phone",
	"sevenInch",
	"tenInch",
];

interface GuestDraft {
	displayType: string;
	name: string;
	scene: SceneData;
}

function loadDraft(): GuestDraft | null {
	try {
		const raw = window.localStorage.getItem(DRAFT_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as GuestDraft;
		if (!parsed?.scene?.width || !Array.isArray(parsed.scene.textLayers)) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

let guestSeq = 0;
function nextId(prefix: string): string {
	guestSeq += 1;
	return `${prefix}-${Date.now()}-${guestSeq}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

function readImageAspect(src: string): Promise<number> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () =>
			resolve(img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1);
		img.onerror = () => resolve(1);
		img.src = src;
	});
}

export default function GuestEditorPage() {
	const draft = useMemo(
		() => (typeof window === "undefined" ? null : loadDraft()),
		[],
	);
	const [displayType, setDisplayType] = useState(
		draft?.displayType ?? "APP_IPHONE_67",
	);
	const [sceneName, setSceneName] = useState(draft?.name ?? "My screenshot");
	const [scene, setScene, history] = useSceneHistory<SceneData>(
		() => draft?.scene ?? createDefaultScene("APP_IPHONE_67"),
	);
	const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
		"__device",
	);
	const [templatesOpen, setTemplatesOpen] = useState(false);
	const [savePromptOpen, setSavePromptOpen] = useState(false);
	const [downloading, setDownloading] = useState(false);

	const canvasRef = useRef<SceneCanvasHandle>(null);
	const bgFileRef = useRef<HTMLInputElement>(null);
	const screenshotFileRef = useRef<HTMLInputElement>(null);
	const imageLayerFileRef = useRef<HTMLInputElement>(null);
	const imageLayerTargetRef = useRef<string | null>(null);
	const fontFileRef = useRef<HTMLInputElement>(null);
	const fontTargetRef = useRef<string | null>(null);
	const [googleFontOpen, setGoogleFontOpen] = useState(false);
	const [googleFontLoading, setGoogleFontLoading] = useState(false);
	const googleFontTargetRef = useRef<string | null>(null);

	// Autosave the working draft locally — guests never lose work, we never
	// see it.
	useEffect(() => {
		const handle = window.setTimeout(() => {
			try {
				window.localStorage.setItem(
					DRAFT_KEY,
					JSON.stringify({ displayType, name: sceneName, scene }),
				);
			} catch {
				// Storage full/blocked — drafts are best-effort.
			}
		}, 400);
		return () => window.clearTimeout(handle);
	}, [scene, sceneName, displayType]);

	const loaded = useSceneImages(scene, scene.screenshot?.url);
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
							{ source: img.element, width: img.width, height: img.height },
						]),
					)
				: undefined,
		}),
		[loaded.background, loaded.screenshot, loaded.bezel, loaded.annotations, deviceModelImage],
	);

	const { undo, redo } = history;
	useEffect(() => {
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
	}, [undo, redo]);

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

	const moveTextLayer = useCallback(
		(id: string, x: number, y: number) => {
			setScene((prev) => ({
				...prev,
				textLayers: prev.textLayers.map((l) =>
					l.id === id ? { ...l, x, y } : l,
				),
			}));
		},
		[setScene],
	);

	const addTextLayer = useCallback(() => {
		const id = nextId("text");
		setScene((prev) => ({
			...prev,
			textLayers: [
				...prev.textLayers,
				{
					align: "center" as const,
					color: "#ffffff",
					fontFamily: "Inter, system-ui, sans-serif",
					fontSize: Math.round(prev.height * 0.035),
					id,
					text: "New text",
					weight: 600,
					x: 0.5,
					y: 0.2,
				},
			],
		}));
		setSelectedLayerId(id);
	}, [setScene]);

	const addEmoji = useCallback(
		(emoji: string) => {
			const id = nextId("text");
			setScene((prev) => ({
				...prev,
				textLayers: [
					...prev.textLayers,
					{
						align: "center" as const,
						color: "#ffffff",
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

	const moveAnnotation = useCallback(
		(id: string, x: number, y: number) => {
			setScene((prev) => ({
				...prev,
				annotations: (prev.annotations ?? []).map((a) =>
					a.id === id ? { ...a, x, y } : a,
				),
			}));
		},
		[setScene],
	);

	const moveCalloutTarget = useCallback(
		(id: string, targetX: number, targetY: number) => {
			setScene((prev) => ({
				...prev,
				annotations: (prev.annotations ?? []).map((a) =>
					a.id === id && a.type === "callout" ? { ...a, targetX, targetY } : a,
				),
			}));
		},
		[setScene],
	);

	const addAnnotation = useCallback(
		(type: SceneAnnotationType) => {
			const id = nextId("ann");
			setScene((prev) => ({
				...prev,
				annotations: [
					...(prev.annotations ?? []),
					createDefaultAnnotation(type, prev, id),
				],
			}));
			setSelectedLayerId(id);
		},
		[setScene],
	);

	const addShape = useCallback(
		(shape: SceneShapeKind) => {
			const id = nextId("ann");
			setScene((prev) => ({
				...prev,
				annotations: [
					...(prev.annotations ?? []),
					createShapeAnnotation(id, shape, prev),
				],
			}));
			setSelectedLayerId(id);
		},
		[setScene],
	);

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

	const nudge = (v: number) => Math.min(v + 0.03, 0.97);

	const duplicateTextLayer = useCallback(
		(id: string) => {
			const newId = nextId("text");
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
			const newId = nextId("ann");
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
							borderColor: source.borderColor,
							borderWidth: source.borderWidth,
							color: source.color,
							cornerRadius: source.cornerRadius,
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

	const moveDevice = useCallback(
		(offsetX: number, offsetY: number) => {
			setScene((prev) =>
				prev.device
					? { ...prev, device: { ...prev.device, offsetX, offsetY } }
					: prev,
			);
		},
		[setScene],
	);

	const handleDropImageFile = useCallback(
		async (
			dataUrl: string,
			drop: { nx: number; ny: number; overDevice: boolean },
		) => {
			if (drop.overDevice) {
				setScene((prev) => ({
					...prev,
					screenshot: { ...prev.screenshot, url: dataUrl },
				}));
				toast.success("Screenshot set from the dropped image");
				return;
			}
			const aspect = await readImageAspect(dataUrl);
			const id = nextId("ann");
			setScene((prev) => ({
				...prev,
				annotations: [
					...(prev.annotations ?? []),
					{ ...createImageAnnotation(id, dataUrl, aspect), x: drop.nx, y: drop.ny },
				],
			}));
			setSelectedLayerId(id);
		},
		[setScene],
	);

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
		const id = nextId("ann");
		setScene((prev) => ({
			...prev,
			annotations: [
				...(prev.annotations ?? []),
				createImageAnnotation(id, dataUrl, aspect),
			],
		}));
		setSelectedLayerId(id);
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

	const handleGoogleFontSubmit = async (family: string) => {
		const name = family.trim();
		if (!name) return;
		setGoogleFontLoading(true);
		const ok = await loadGoogleFont(name);
		setGoogleFontLoading(false);
		if (!ok) {
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
		patchScene({ screenshot: { ...scene.screenshot, url: dataUrl } });
	};

	const handleDisplayTypeChange = useCallback(
		(next: string) => {
			setDisplayType(next);
			setScene((prev) =>
				applyOrientation(
					applyPanelCount(prev, next, getPanelCount(prev)),
					next,
					getSceneOrientation(prev),
				),
			);
		},
		[setScene],
	);

	const orientation = getSceneOrientation(scene);
	const panels = getPanelCount(scene);
	const panelWidth = Math.round(scene.width / panels);

	const handleApplyTemplate = useCallback(
		(template: SceneTemplate) => {
			setScene((prev) => applyTemplate(template, prev, displayType));
			setSelectedLayerId("__device");
			setTemplatesOpen(false);
			toast.success(`Template "${template.name}" applied`);
		},
		[displayType, setScene],
	);

	const handleApplyPanorama = useCallback(
		(template: PanoramaTemplate, targetPanels: number) => {
			setScene((prev) =>
				applyPanoramaTemplate(template, targetPanels, prev, displayType),
			);
			setSelectedLayerId("__device");
			setTemplatesOpen(false);
			toast.success(`Panorama "${template.name}" ×${targetPanels} applied`);
		},
		[displayType, setScene],
	);

	const handleDownload = async (deviceOnly: boolean) => {
		setDownloading(true);
		try {
			const target: SceneData = deviceOnly
				? { ...scene, annotations: [], textLayers: [] }
				: scene;
			const blob = await exportSceneToPng(target);
			if (!blob) {
				toast.error("Export failed — a remote image blocks the canvas (CORS).");
				return;
			}
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${sceneName.replace(/\s+/g, "-").toLowerCase()}-${displayType}${deviceOnly ? "-device" : ""}.png`;
			link.click();
			URL.revokeObjectURL(url);
		} finally {
			setDownloading(false);
		}
	};

	return (
		<div className="flex h-screen flex-col bg-background">
			<header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
				<div className="flex min-w-0 items-center gap-3">
					<Link href="/" className="shrink-0 text-sm font-bold">
						AppBoard
					</Link>
					<span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
						Free editor · nothing leaves your browser
					</span>
					<Input
						value={sceneName}
						onChange={(e) => setSceneName(e.target.value)}
						className="h-8 max-w-44"
						aria-label="Scene name"
					/>
					<Select value={displayType} onValueChange={handleDisplayTypeChange}>
						<SelectTrigger className="w-[170px]" size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{GUEST_DISPLAY_TYPES.map((dt) => (
								<SelectItem key={dt} value={dt}>
									{DISPLAY_TYPE_LABELS[dt] ?? dt}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={orientation}
						onValueChange={(value) =>
							setScene((prev) =>
								applyOrientation(prev, displayType, value as SceneOrientation),
							)
						}
					>
						<SelectTrigger className="w-[120px]" size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="portrait">Portrait</SelectItem>
							<SelectItem value="landscape">Landscape</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={String(panels)}
						onValueChange={(value) =>
							setScene((prev) =>
								applyPanelCount(prev, displayType, Number.parseInt(value, 10)),
							)
						}
					>
						<SelectTrigger className="w-[140px]" size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="1">Single screen</SelectItem>
							{[2, 3, 4, 5, 6, 7, 8].map((n) => (
								<SelectItem key={n} value={String(n)}>
									Panorama × {n}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<span className="hidden text-xs text-muted-foreground lg:inline">
						{panelWidth}×{scene.height}px{panels > 1 ? ` × ${panels}` : ""}
					</span>
				</div>

				<div className="flex shrink-0 items-center gap-1.5">
					<Button
						variant="ghost"
						size="icon"
						onClick={undo}
						disabled={!history.canUndo}
						aria-label="Undo (Cmd+Z)"
					>
						<Undo2 className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={redo}
						disabled={!history.canRedo}
						aria-label="Redo (Cmd+Shift+Z)"
					>
						<Redo2 className="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
						<LayoutTemplate className="h-4 w-4" />
						Templates
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" disabled={downloading}>
								{downloading ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Download className="h-4 w-4" />
								)}
								Download
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
					<Button size="sm" onClick={() => setSavePromptOpen(true)}>
						<Save className="h-4 w-4" />
						Save
					</Button>
					<Button variant="ghost" size="sm" asChild>
						<Link href="/login">
							<LogIn className="h-4 w-4" />
							Sign in
						</Link>
					</Button>
				</div>
			</header>

			<div className="flex min-h-0 flex-1">
				<LayersPanel
					scene={scene}
					selectedLayerId={selectedLayerId}
					onSelectLayer={setSelectedLayerId}
					onAddText={addTextLayer}
					onDeleteText={deleteTextLayer}
					onAddAnnotation={addAnnotation}
					onAddShape={addShape}
					onAddImage={() => {
						imageLayerTargetRef.current = null;
						imageLayerFileRef.current?.click();
					}}
					onDeleteAnnotation={deleteAnnotation}
					onDuplicateText={duplicateTextLayer}
					onDuplicateAnnotation={duplicateAnnotation}
					onReorderText={reorderTextLayer}
					onReorderAnnotation={reorderAnnotation}
					onAddEmoji={addEmoji}
				/>

				<div className="flex min-w-0 flex-1 items-center justify-center bg-muted/30 p-4">
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
					onPickExistingScreenshot={() => setSavePromptOpen(true)}
					onUploadFont={() => {
						fontTargetRef.current = selectedLayerId;
						fontFileRef.current?.click();
					}}
					onAddGoogleFont={() => {
						googleFontTargetRef.current = selectedLayerId;
						setGoogleFontOpen(true);
					}}
					onReplaceAnnotationImage={(id) => {
						imageLayerTargetRef.current = id;
						imageLayerFileRef.current?.click();
					}}
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

			<TemplateGalleryDialog
				open={templatesOpen}
				onOpenChange={setTemplatesOpen}
				displayType={displayType}
				onPick={handleApplyTemplate}
				onPickPanorama={handleApplyPanorama}
			/>

			<GoogleFontDialog
				open={googleFontOpen}
				onOpenChange={setGoogleFontOpen}
				loading={googleFontLoading}
				onSubmit={handleGoogleFontSubmit}
			/>

			<Dialog open={savePromptOpen} onOpenChange={setSavePromptOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Save scenes with a free account</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						Your work is kept in this browser automatically. Create a free
						AppBoard account to save scenes in the cloud, translate them with
						AI{" "}
						<Languages className="inline h-3.5 w-3.5" /> and publish
						screenshots straight to the App Store and Google Play.
					</p>
					<div className="flex gap-2">
						<Button asChild className="flex-1">
							<Link href="/login">Create free account</Link>
						</Button>
						<Button asChild variant="outline" className="flex-1">
							<Link href="/login">Log in</Link>
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
