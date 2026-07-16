"use client";

import {
	ArrowUpRight,
	Award,
	Check,
	ChevronDown,
	ChevronUp,
	Circle,
	CopyPlus,
	Droplet,
	Heart,
	Lock,
	Quote,
	Image as ImageIcon,
	MessageSquare,
	Minus,
	Plus,
	Smartphone,
	Sparkles,
	Star,
	Tag,
	Trash2,
	Type,
	Waves,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	BACKGROUND_PRESETS,
	cssPreviewForBackground,
} from "@/lib/background-presets";
import { DEFAULT_BEZEL_ID, DEVICE_BEZELS } from "@/lib/device-bezels";
import { DEFAULT_MODEL_ID, DEVICE_MODELS } from "@/lib/device-models";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
	SceneAnnotation,
	SceneAnnotationType,
	SceneBackgroundFit,
	SceneBackgroundPatternType,
	SceneCustomFont,
	SceneData,
	SceneDeviceColor,
	SceneDeviceFrame,
	SceneDeviceStyle,
	SceneGradientType,
	SceneImageAnnotation,
	SceneShapeAnnotation,
	SceneShapeKind,
	SceneTextAlign,
	SceneTextAnnotation,
	SceneTextLayer,
} from "@/lib/types";

const WEB_SAFE_FONTS = [
	{ label: "Inter / Sans", value: "Inter, system-ui, sans-serif" },
	{ label: "Arial", value: "Arial, sans-serif" },
	{ label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
	{ label: "Georgia (serif)", value: "Georgia, serif" },
	{ label: "Times", value: '"Times New Roman", Times, serif' },
	{ label: "Courier (mono)", value: '"Courier New", monospace' },
	{ label: "Verdana", value: "Verdana, sans-serif" },
];

const FONT_WEIGHTS = [
	{ label: "Regular", value: 400 },
	{ label: "Medium", value: 500 },
	{ label: "Semibold", value: 600 },
	{ label: "Bold", value: 700 },
	{ label: "Black", value: 900 },
];

/** Icon + label for each annotation variant, shared by list and menu. */
const ANNOTATION_META: Record<
	SceneAnnotationType,
	{ label: string; icon: typeof Tag }
> = {
	badge: { label: "Badge", icon: Tag },
	callout: { label: "Callout", icon: MessageSquare },
	label: { label: "Label", icon: Type },
	laurel: { label: "Award laurel", icon: Award },
	review: { label: "Review card", icon: Quote },
};

/** Icon + label for each decorative shape, shared by list and add-menu. */
const SHAPE_META: Record<SceneShapeKind, { label: string; icon: typeof Tag }> =
	{
		arrow: { icon: ArrowUpRight, label: "Arrow" },
		blob: { icon: Droplet, label: "Blob" },
		check: { icon: Check, label: "Checkmark" },
		circle: { icon: Circle, label: "Circle mark" },
		heart: { icon: Heart, label: "Heart" },
		rating: { icon: Star, label: "5-star rating" },
		sparkle: { icon: Sparkles, label: "Sparkle" },
		squiggle: { icon: Waves, label: "Squiggle" },
		star: { icon: Star, label: "Star" },
		underline: { icon: Minus, label: "Underline" },
	};

/** List/panel meta for any annotation, including image and shape layers. */
function annotationMeta(annotation: SceneAnnotation): {
	label: string;
	icon: typeof Tag;
} {
	if (annotation.type === "image") {
		return { label: "Image", icon: ImageIcon };
	}
	if (annotation.type === "shape") {
		return SHAPE_META[annotation.shape];
	}
	return ANNOTATION_META[annotation.type];
}

/** Curated emoji stickers added as big text layers (render on any canvas). */
const EMOJI_STICKERS = [
	"🔥",
	"⭐",
	"🚀",
	"❤️",
	"✨",
	"🎉",
	"👍",
	"🏆",
	"💎",
	"⚡",
	"😍",
	"🎯",
	"💰",
	"📈",
	"🔒",
	"🎁",
];

/**
 * One-click text style combos. Each patch fully overrides the style-bearing
 * fields (explicit `undefined` clears leftovers from the previous style), so
 * presets are idempotent regardless of what the layer looked like before.
 */
const TEXT_STYLE_PRESETS: {
	label: string;
	patch: (sceneHeight: number) => Partial<SceneTextLayer>;
}[] = [
	{
		label: "Hero",
		patch: (h) => ({
			color: "#ffffff",
			fontSize: Math.round(h * 0.05),
			gradient: undefined,
			highlight: undefined,
			shadowBlur: Math.round(h * 0.008),
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: Math.round(h * 0.003),
			strokeColor: undefined,
			strokeWidth: undefined,
			weight: 900,
		}),
	},
	{
		label: "Subtitle",
		patch: (h) => ({
			color: "#e2e8f0",
			fontSize: Math.round(h * 0.024),
			gradient: undefined,
			highlight: undefined,
			shadowBlur: undefined,
			shadowColor: undefined,
			shadowOffsetX: undefined,
			shadowOffsetY: undefined,
			strokeColor: undefined,
			strokeWidth: undefined,
			weight: 500,
		}),
	},
	{
		label: "Sticker",
		patch: (h) => ({
			fontSize: Math.round(h * 0.045),
			gradient: { from: "#fde047", to: "#f97316" },
			highlight: undefined,
			shadowBlur: 0,
			shadowColor: "#000000",
			shadowOffsetX: 0,
			shadowOffsetY: Math.round(h * 0.0035),
			strokeColor: "#1c1917",
			strokeWidth: Math.max(3, Math.round(h * 0.004)),
			weight: 900,
		}),
	},
	{
		label: "Marker",
		patch: (h) => ({
			color: "#111827",
			fontSize: Math.round(h * 0.032),
			gradient: undefined,
			highlight: "#fde047",
			shadowBlur: undefined,
			shadowColor: undefined,
			shadowOffsetX: undefined,
			shadowOffsetY: undefined,
			strokeColor: undefined,
			strokeWidth: undefined,
			weight: 700,
		}),
	},
];

/** One-click 3D pose presets (degrees) for the device rotation section. */
const DEVICE_POSE_PRESETS: {
	label: string;
	x: number;
	y: number;
	z: number;
}[] = [
	{ label: "Front", x: 0, y: 0, z: 0 },
	{ label: "Tilt left", x: 4, y: 22, z: 0 },
	{ label: "Tilt right", x: 4, y: -22, z: 0 },
	{ label: "Hero", x: 18, y: 26, z: -8 },
	{ label: "Lean back", x: -16, y: 0, z: 0 },
];

/** The Select value that triggers the custom-font upload flow. */
const UPLOAD_FONT_VALUE = "__upload-font";

/** The Select value that triggers the add-Google-Font flow. */
const ADD_GOOGLE_FONT_VALUE = "__add-google-font";

interface LayersPanelProps {
	scene: SceneData;
	selectedLayerId: string | null;
	onSelectLayer: (id: string | null) => void;
	onAddText: () => void;
	onDeleteText: (id: string) => void;
	onAddAnnotation: (type: SceneAnnotationType) => void;
	onAddShape: (shape: SceneShapeKind) => void;
	onAddImage: () => void;
	onDeleteAnnotation: (id: string) => void;
	onDuplicateText: (id: string) => void;
	onDuplicateAnnotation: (id: string) => void;
	onReorderText: (id: string, delta: -1 | 1) => void;
	onReorderAnnotation: (id: string, delta: -1 | 1) => void;
	onAddEmoji: (emoji: string) => void;
}

/** Chevron pair moving a layer down/up the draw order (later = on top). */
function ReorderButtons({
	onMove,
	label,
}: {
	onMove: (delta: -1 | 1) => void;
	label: string;
}) {
	return (
		<span className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
			<button
				type="button"
				onClick={() => onMove(1)}
				aria-label={`Move ${label} up (draw above)`}
			>
				<ChevronUp className="h-3 w-3 text-muted-foreground hover:text-foreground" />
			</button>
			<button
				type="button"
				onClick={() => onMove(-1)}
				aria-label={`Move ${label} down (draw below)`}
			>
				<ChevronDown className="h-3 w-3 text-muted-foreground hover:text-foreground" />
			</button>
		</span>
	);
}

/** Left-side layer list: background, device, screenshot and each text layer. */
export function LayersPanel({
	scene,
	selectedLayerId,
	onSelectLayer,
	onAddText,
	onDeleteText,
	onAddAnnotation,
	onAddShape,
	onAddImage,
	onDeleteAnnotation,
	onDuplicateText,
	onDuplicateAnnotation,
	onReorderText,
	onReorderAnnotation,
	onAddEmoji,
}: LayersPanelProps) {
	const annotations = scene.annotations ?? [];
	return (
		<div className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border p-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-semibold">Layers</span>
				<div className="flex items-center">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="sm" variant="ghost" aria-label="Add emoji sticker">
								😀
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<div className="grid grid-cols-4 gap-0.5 p-1">
								{EMOJI_STICKERS.map((emoji) => (
									<button
										key={emoji}
										type="button"
										onClick={() => onAddEmoji(emoji)}
										className="rounded-md p-1.5 text-xl hover:bg-accent"
										aria-label={`Add ${emoji} sticker`}
									>
										{emoji}
									</button>
								))}
							</div>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button size="sm" variant="ghost" onClick={onAddText}>
						<Plus className="h-4 w-4" />
						Text
					</Button>
				</div>
			</div>

			<button
				type="button"
				onClick={() => onSelectLayer("__background")}
				className={cn(
					"flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
					selectedLayerId === "__background"
						? "bg-accent"
						: "hover:bg-accent/50",
				)}
			>
				<ImageIcon className="h-4 w-4 text-muted-foreground" />
				Background
			</button>

			<button
				type="button"
				onClick={() => onSelectLayer("__device")}
				className={cn(
					"flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
					selectedLayerId === "__device" ? "bg-accent" : "hover:bg-accent/50",
				)}
			>
				<Smartphone className="h-4 w-4 text-muted-foreground" />
				Device + screenshot
			</button>

			<div className="mt-1 text-xs font-medium text-muted-foreground">
				Text layers
			</div>
			{scene.textLayers.length === 0 && (
				<p className="px-2 text-xs text-muted-foreground">No text layers.</p>
			)}
			{scene.textLayers.map((layer) => (
				<div
					key={layer.id}
					className={cn(
						"group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
						selectedLayerId === layer.id ? "bg-accent" : "hover:bg-accent/50",
					)}
				>
					<button
						type="button"
						onClick={() => onSelectLayer(layer.id)}
						className="flex min-w-0 flex-1 items-center gap-2 text-left"
					>
						<Type className="h-4 w-4 shrink-0 text-muted-foreground" />
						<span className="truncate">{layer.text || "Empty text"}</span>
						{layer.locked && (
							<Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
						)}
					</button>
					<ReorderButtons
						label="text layer"
						onMove={(delta) => onReorderText(layer.id, delta)}
					/>
					<button
						type="button"
						onClick={() => onDuplicateText(layer.id)}
						className="opacity-0 transition-opacity group-hover:opacity-100"
						aria-label="Duplicate text layer"
					>
						<CopyPlus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
					</button>
					<button
						type="button"
						onClick={() => onDeleteText(layer.id)}
						className="opacity-0 transition-opacity group-hover:opacity-100"
						aria-label="Delete text layer"
					>
						<Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
					</button>
				</div>
			))}

			<div className="mt-2 flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">
					Annotations
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm" variant="ghost">
							<Plus className="h-4 w-4" />
							Add
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={onAddImage}>
							<ImageIcon className="h-4 w-4" />
							Image
						</DropdownMenuItem>
						{(Object.keys(ANNOTATION_META) as SceneAnnotationType[]).map(
							(type) => {
								const { label, icon: Icon } = ANNOTATION_META[type];
								return (
									<DropdownMenuItem
										key={type}
										onSelect={() => onAddAnnotation(type)}
									>
										<Icon className="h-4 w-4" />
										{label}
									</DropdownMenuItem>
								);
							},
						)}
						{(Object.keys(SHAPE_META) as SceneShapeKind[]).map((shape) => {
							const { label, icon: Icon } = SHAPE_META[shape];
							return (
								<DropdownMenuItem
									key={shape}
									onSelect={() => onAddShape(shape)}
								>
									<Icon className="h-4 w-4" />
									{label}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{annotations.length === 0 && (
				<p className="px-2 text-xs text-muted-foreground">No annotations.</p>
			)}
			{annotations.map((annotation) => {
				const { label, icon: Icon } = annotationMeta(annotation);
				return (
					<div
						key={annotation.id}
						className={cn(
							"group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
							selectedLayerId === annotation.id
								? "bg-accent"
								: "hover:bg-accent/50",
						)}
					>
						<button
							type="button"
							onClick={() => onSelectLayer(annotation.id)}
							className="flex min-w-0 flex-1 items-center gap-2 text-left"
						>
							<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
							<span className="truncate">
								{annotation.type === "image" || annotation.type === "shape"
									? label
									: annotation.text || label}
							</span>
						</button>
						<ReorderButtons
							label="annotation"
							onMove={(delta) => onReorderAnnotation(annotation.id, delta)}
						/>
						<button
							type="button"
							onClick={() => onDuplicateAnnotation(annotation.id)}
							className="opacity-0 transition-opacity group-hover:opacity-100"
							aria-label="Duplicate annotation"
						>
							<CopyPlus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
						</button>
						<button
							type="button"
							onClick={() => onDeleteAnnotation(annotation.id)}
							className="opacity-0 transition-opacity group-hover:opacity-100"
							aria-label="Delete annotation"
						>
							<Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
						</button>
					</div>
				);
			})}
		</div>
	);
}

interface PropertiesPanelProps {
	scene: SceneData;
	selectedLayerId: string | null;
	onPatchScene: (patch: Partial<SceneData>) => void;
	onPatchTextLayer: (id: string, patch: Partial<SceneTextLayer>) => void;
	onPatchAnnotation: (id: string, patch: Partial<SceneAnnotation>) => void;
	onPickBackgroundImage: () => void;
	onPickScreenshot: () => void;
	onPickExistingScreenshot: () => void;
	onUploadFont: () => void;
	onAddGoogleFont: () => void;
	onReplaceAnnotationImage: (id: string) => void;
	onDeleteAnnotation: (id: string) => void;
	/** Copy the selected text layer's style onto every other text layer. */
	onApplyTextStyleToAll?: (sourceId: string) => void;
	/** Copy the selected annotation's style onto all of the same type. */
	onApplyAnnotationStyleToAll?: (sourceId: string) => void;
}

/** Right-side contextual properties for the currently selected layer. */
export function PropertiesPanel({
	scene,
	selectedLayerId,
	onPatchScene,
	onPatchTextLayer,
	onPatchAnnotation,
	onPickBackgroundImage,
	onPickScreenshot,
	onPickExistingScreenshot,
	onUploadFont,
	onAddGoogleFont,
	onReplaceAnnotationImage,
	onDeleteAnnotation,
	onApplyTextStyleToAll,
	onApplyAnnotationStyleToAll,
}: PropertiesPanelProps) {
	const selectedText = scene.textLayers.find((l) => l.id === selectedLayerId);
	const selectedAnnotation = (scene.annotations ?? []).find(
		(a) => a.id === selectedLayerId,
	);

	return (
		<div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border p-4">
			{selectedLayerId === "__background" && (
				<BackgroundProperties
					scene={scene}
					onPatchScene={onPatchScene}
					onPickBackgroundImage={onPickBackgroundImage}
				/>
			)}
			{selectedLayerId === "__device" && (
				<DeviceProperties
					scene={scene}
					onPatchScene={onPatchScene}
					onPickScreenshot={onPickScreenshot}
					onPickExistingScreenshot={onPickExistingScreenshot}
				/>
			)}
			{selectedText && (
				<TextProperties
					layer={selectedText}
					sceneHeight={scene.height}
					customFonts={scene.customFonts}
					googleFonts={scene.googleFonts}
					onPatch={(patch) => onPatchTextLayer(selectedText.id, patch)}
					onUploadFont={onUploadFont}
					onAddGoogleFont={onAddGoogleFont}
					onApplyStyleToAll={
						scene.textLayers.length > 1 && onApplyTextStyleToAll
							? () => onApplyTextStyleToAll(selectedText.id)
							: undefined
					}
				/>
			)}
			{selectedAnnotation && selectedAnnotation.type === "image" && (
				<ImageAnnotationProperties
					annotation={selectedAnnotation}
					onPatch={(patch) => onPatchAnnotation(selectedAnnotation.id, patch)}
					onReplaceImage={() =>
						onReplaceAnnotationImage(selectedAnnotation.id)
					}
					onDelete={() => onDeleteAnnotation(selectedAnnotation.id)}
				/>
			)}
			{selectedAnnotation && selectedAnnotation.type === "shape" && (
				<ShapeAnnotationProperties
					annotation={selectedAnnotation}
					onPatch={(patch) => onPatchAnnotation(selectedAnnotation.id, patch)}
					onDelete={() => onDeleteAnnotation(selectedAnnotation.id)}
				/>
			)}
			{selectedAnnotation &&
				selectedAnnotation.type !== "image" &&
				selectedAnnotation.type !== "shape" && (
					<AnnotationProperties
						annotation={selectedAnnotation}
						onPatch={(patch) => onPatchAnnotation(selectedAnnotation.id, patch)}
						onApplyStyleToAll={
							onApplyAnnotationStyleToAll &&
							(scene.annotations ?? []).filter(
								(a) => a.type === selectedAnnotation.type,
							).length > 1
								? () => onApplyAnnotationStyleToAll(selectedAnnotation.id)
								: undefined
						}
					/>
				)}
			{!selectedLayerId && (
				<p className="text-sm text-muted-foreground">
					Select a layer from the list on the left, or click a text layer in
					the preview to edit its properties.
				</p>
			)}
		</div>
	);
}

function BackgroundProperties({
	scene,
	onPatchScene,
	onPickBackgroundImage,
}: {
	scene: SceneData;
	onPatchScene: (patch: Partial<SceneData>) => void;
	onPickBackgroundImage: () => void;
}) {
	const bg = scene.background;
	return (
		<div className="flex flex-col gap-3">
			<h4 className="text-sm font-semibold">Background</h4>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Presets</Label>
				<div className="grid grid-cols-6 gap-1.5">
					{BACKGROUND_PRESETS.map((preset) => (
						<button
							key={preset.name}
							type="button"
							title={preset.name}
							aria-label={`Background preset: ${preset.name}`}
							onClick={() =>
								onPatchScene({ background: { ...preset.background } })
							}
							className="h-8 w-full rounded-md border border-border/60 transition-transform hover:scale-110"
							style={{ background: cssPreviewForBackground(preset.background) }}
						/>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Type</Label>
				<Select
					value={bg.type}
					onValueChange={(type) => {
						if (type === "gradient") {
							onPatchScene({
								background: {
									type: "gradient",
									value: bg.gradient?.from ?? "#6366f1",
									gradient: bg.gradient ?? {
										from: "#6366f1",
										to: "#8b5cf6",
										angle: 135,
									},
								},
							});
						} else if (type === "color") {
							onPatchScene({
								background: { type: "color", value: bg.value || "#111827" },
							});
						} else {
							onPatchScene({
								background: { type: "image", value: bg.value },
							});
						}
					}}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="color">Solid color</SelectItem>
						<SelectItem value="gradient">Gradient</SelectItem>
						<SelectItem value="image">Image</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{bg.type === "color" && (
				<ColorField
					label="Color"
					value={bg.value}
					onChange={(value) =>
						onPatchScene({ background: { type: "color", value } })
					}
				/>
			)}

			{bg.type === "gradient" && bg.gradient && (
				<>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs">Gradient style</Label>
						<Select
							value={bg.gradientType ?? "linear"}
							onValueChange={(gradientType) =>
								onPatchScene({
									background: {
										...bg,
										gradientType: gradientType as SceneGradientType,
										mesh:
											gradientType === "mesh"
												? (bg.mesh ?? [bg.gradient!.to, "#ec4899", "#312e81"])
												: bg.mesh,
									},
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="linear">Linear</SelectItem>
								<SelectItem value="radial">Radial</SelectItem>
								<SelectItem value="mesh">Mesh (soft blobs)</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<ColorField
						label={(bg.gradientType ?? "linear") === "mesh" ? "Base" : "From"}
						value={bg.gradient.from}
						onChange={(from) =>
							onPatchScene({
								background: {
									...bg,
									value: from,
									gradient: { ...bg.gradient!, from },
								},
							})
						}
					/>

					{(bg.gradientType ?? "linear") === "mesh" ? (
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Blob colors</Label>
							<div className="flex flex-wrap items-center gap-1.5">
								{(bg.mesh ?? []).map((color, i) => (
									<input
										// Index keys are fine: slots are appended/removed at the end only.
										key={`mesh-${i}`}
										type="color"
										value={color}
										onChange={(e) => {
											const next = [...(bg.mesh ?? [])];
											next[i] = e.target.value;
											onPatchScene({ background: { ...bg, mesh: next } });
										}}
										className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
										aria-label={`Mesh blob color ${i + 1}`}
									/>
								))}
								{(bg.mesh ?? []).length < 5 && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-8 px-2"
										onClick={() =>
											onPatchScene({
												background: {
													...bg,
													mesh: [...(bg.mesh ?? []), "#8b5cf6"],
												},
											})
										}
									>
										<Plus className="h-3.5 w-3.5" />
									</Button>
								)}
								{(bg.mesh ?? []).length > 1 && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-8 px-2"
										onClick={() =>
											onPatchScene({
												background: {
													...bg,
													mesh: (bg.mesh ?? []).slice(0, -1),
												},
											})
										}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								)}
							</div>
						</div>
					) : (
						<>
							<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
								<Checkbox
									id="bg-via"
									checked={bg.via != null}
									onCheckedChange={(checked) =>
										onPatchScene({
											background: {
												...bg,
												via: checked === true ? (bg.via ?? "#a78bfa") : undefined,
											},
										})
									}
								/>
								<Label htmlFor="bg-via" className="flex-1 text-xs">
									Middle color stop
								</Label>
								{bg.via != null && (
									<input
										type="color"
										value={bg.via}
										onChange={(e) =>
											onPatchScene({
												background: { ...bg, via: e.target.value },
											})
										}
										className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
										aria-label="Middle gradient color"
									/>
								)}
							</div>
							<ColorField
								label="To"
								value={bg.gradient.to}
								onChange={(to) =>
									onPatchScene({
										background: {
											...bg,
											gradient: { ...bg.gradient!, to },
										},
									})
								}
							/>
						</>
					)}

					{(bg.gradientType ?? "linear") === "linear" && (
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Angle: {bg.gradient.angle}°</Label>
							<Slider
								min={0}
								max={360}
								step={1}
								value={[bg.gradient.angle]}
								onValueChange={([angle]) =>
									onPatchScene({
										background: {
											...bg,
											gradient: { ...bg.gradient!, angle },
										},
									})
								}
							/>
						</div>
					)}
				</>
			)}

			{bg.type === "image" && (
				<>
					<Button variant="outline" size="sm" onClick={onPickBackgroundImage}>
						<ImageIcon className="h-4 w-4" />
						{bg.value ? "Change background image" : "Upload background image"}
					</Button>

					<div className="flex flex-col gap-1.5">
						<Label className="text-xs">Fit</Label>
						<Select
							value={bg.fit ?? "cover"}
							onValueChange={(fit) =>
								onPatchScene({
									background: { ...bg, fit: fit as SceneBackgroundFit },
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="cover">Fill (cover)</SelectItem>
								<SelectItem value="contain">Fit (contain)</SelectItem>
								<SelectItem value="stretch">Stretch</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{(bg.fit ?? "cover") === "cover" && (
						<>
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs">
									Horizontal focus: {Math.round((bg.offsetX ?? 0) * 100)}%
								</Label>
								<Slider
									min={-100}
									max={100}
									step={1}
									value={[Math.round((bg.offsetX ?? 0) * 100)]}
									onValueChange={([v]) =>
										onPatchScene({
											background: { ...bg, offsetX: v / 100 },
										})
									}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs">
									Vertical focus: {Math.round((bg.offsetY ?? 0) * 100)}%
								</Label>
								<Slider
									min={-100}
									max={100}
									step={1}
									value={[Math.round((bg.offsetY ?? 0) * 100)]}
									onValueChange={([v]) =>
										onPatchScene({
											background: { ...bg, offsetY: v / 100 },
										})
									}
								/>
							</div>
						</>
					)}
				</>
			)}

			<div className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5">
				<div className="flex items-center gap-2">
					<Checkbox
						id="bg-pattern"
						checked={bg.pattern != null}
						onCheckedChange={(checked) =>
							onPatchScene({
								background: {
									...bg,
									pattern:
										checked === true
											? (bg.pattern ?? {
													color: "#ffffff",
													opacity: 0.12,
													scale: 1,
													type: "dots",
												})
											: undefined,
								},
							})
						}
					/>
					<Label htmlFor="bg-pattern" className="flex-1 text-xs">
						Pattern overlay
					</Label>
					{bg.pattern != null && (
						<input
							type="color"
							value={bg.pattern.color}
							onChange={(e) =>
								onPatchScene({
									background: {
										...bg,
										pattern: { ...bg.pattern!, color: e.target.value },
									},
								})
							}
							className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
							aria-label="Pattern color"
						/>
					)}
				</div>
				{bg.pattern != null && (
					<>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Pattern</Label>
							<Select
								value={bg.pattern.type}
								onValueChange={(type) =>
									onPatchScene({
										background: {
											...bg,
											pattern: {
												...bg.pattern!,
												type: type as SceneBackgroundPatternType,
											},
										},
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="dots">Dots</SelectItem>
									<SelectItem value="grid">Grid</SelectItem>
									<SelectItem value="diagonal">Diagonal lines</SelectItem>
									<SelectItem value="waves">Waves</SelectItem>
									<SelectItem value="rings">Rings</SelectItem>
									<SelectItem value="noise">Noise (grain)</SelectItem>
									<SelectItem value="topo">Topographic map</SelectItem>
									<SelectItem value="dunes">Dunes (layered hills)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">
								Opacity: {Math.round(bg.pattern.opacity * 100)}%
							</Label>
							<Slider
								min={2}
								max={100}
								step={1}
								value={[Math.round(bg.pattern.opacity * 100)]}
								onValueChange={([v]) =>
									onPatchScene({
										background: {
											...bg,
											pattern: { ...bg.pattern!, opacity: v / 100 },
										},
									})
								}
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">
								Density: {Math.round((bg.pattern.scale || 1) * 100)}%
							</Label>
							<Slider
								min={30}
								max={300}
								step={5}
								value={[Math.round((bg.pattern.scale || 1) * 100)]}
								onValueChange={([v]) =>
									onPatchScene({
										background: {
											...bg,
											pattern: { ...bg.pattern!, scale: v / 100 },
										},
									})
								}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function DeviceProperties({
	scene,
	onPatchScene,
	onPickScreenshot,
	onPickExistingScreenshot,
}: {
	scene: SceneData;
	onPatchScene: (patch: Partial<SceneData>) => void;
	onPickScreenshot: () => void;
	onPickExistingScreenshot: () => void;
}) {
	const device = scene.device ?? {
		frame: "iphone" as SceneDeviceFrame,
		scale: 0.72,
		offsetX: 0,
		offsetY: 0.12,
		rotation: 0,
	};
	return (
		<div className="flex flex-col gap-3">
			<h4 className="text-sm font-semibold">Device</h4>
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Frame</Label>
				<Select
					value={device.frame}
					onValueChange={(frame) =>
						onPatchScene({
							device: { ...device, frame: frame as SceneDeviceFrame },
						})
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="iphone">iPhone</SelectItem>
						<SelectItem value="android">Android phone</SelectItem>
						<SelectItem value="ipad">iPad</SelectItem>
						<SelectItem value="android-tablet">Android tablet</SelectItem>
						<SelectItem value="apple-watch">Apple Watch</SelectItem>
						<SelectItem value="laptop">Laptop</SelectItem>
						<SelectItem value="none">None (full screen)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{device.frame !== "none" && (
				<>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs">Style</Label>
						<Select
							value={device.style ?? "realistic"}
							onValueChange={(style) =>
								onPatchScene({
									device: {
										...device,
										bezelId:
											style === "photo"
												? (device.bezelId ?? DEFAULT_BEZEL_ID)
												: device.bezelId,
										modelId:
											style === "3d"
												? (device.modelId ?? DEFAULT_MODEL_ID)
												: device.modelId,
										style: style as SceneDeviceStyle,
									},
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="3d">3D model (rotates for real)</SelectItem>
								<SelectItem value="photo">Photo (real iPhone)</SelectItem>
								<SelectItem value="realistic">Realistic (drawn)</SelectItem>
								<SelectItem value="clay">Clay (custom color)</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{device.style === "3d" && (
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Model</Label>
							<Select
								value={device.modelId ?? DEFAULT_MODEL_ID}
								onValueChange={(modelId) =>
									onPatchScene({ device: { ...device, modelId } })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DEVICE_MODELS.map((model) => (
										<SelectItem key={model.id} value={model.id}>
											{model.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-[10px] text-muted-foreground">
								True WebGL render — use the 3D rotation sliders below.
							</p>
						</div>
					)}

					{device.style === "photo" && (
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Model</Label>
							<Select
								value={device.bezelId ?? DEFAULT_BEZEL_ID}
								onValueChange={(bezelId) =>
									onPatchScene({ device: { ...device, bezelId } })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DEVICE_BEZELS.map((bezel) => (
										<SelectItem key={bezel.id} value={bezel.id}>
											{bezel.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-[10px] text-muted-foreground">
								Official Apple product bezels (developer.apple.com/design).
							</p>
						</div>
					)}

					{(device.style ?? "realistic") === "clay" ? (
						<ColorField
							label="Clay color"
							value={device.clayColor ?? "#8282b2"}
							onChange={(clayColor) =>
								onPatchScene({ device: { ...device, clayColor } })
							}
						/>
					) : device.style === "photo" || device.style === "3d" ? null : (
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs">Frame color</Label>
							<Select
								value={
									device.color ??
									(device.frame === "android" ||
									device.frame === "android-tablet"
										? "black"
										: "silver")
								}
								onValueChange={(color) =>
									onPatchScene({
										device: { ...device, color: color as SceneDeviceColor },
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="silver">Silver</SelectItem>
									<SelectItem value="black">Black</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
				</>
			)}

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">
					Size: {Math.round(device.scale * 100)}%
				</Label>
				<Slider
					min={20}
					max={100}
					step={1}
					value={[Math.round(device.scale * 100)]}
					onValueChange={([v]) =>
						onPatchScene({ device: { ...device, scale: v / 100 } })
					}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Horizontal position</Label>
				<Slider
					min={-40}
					max={40}
					step={1}
					value={[Math.round(device.offsetX * 100)]}
					onValueChange={([v]) =>
						onPatchScene({ device: { ...device, offsetX: v / 100 } })
					}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Vertical position</Label>
				<Slider
					min={-40}
					max={40}
					step={1}
					value={[Math.round(device.offsetY * 100)]}
					onValueChange={([v]) =>
						onPatchScene({ device: { ...device, offsetY: v / 100 } })
					}
				/>
			</div>

			{device.frame !== "none" && (
				<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
					<Checkbox
						id="device-ground-shadow"
						checked={device.groundShadow ?? false}
						onCheckedChange={(checked) =>
							onPatchScene({
								device: { ...device, groundShadow: checked === true },
							})
						}
					/>
					<Label htmlFor="device-ground-shadow" className="flex-1 text-xs">
						Ground shadow under device
					</Label>
				</div>
			)}

			{device.frame !== "none" && (
				<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
					<Checkbox
						id="device-glare"
						checked={device.glare ?? false}
						onCheckedChange={(checked) =>
							onPatchScene({
								device: { ...device, glare: checked === true },
							})
						}
					/>
					<Label htmlFor="device-glare" className="flex-1 text-xs">
						Screen glare (glass reflection)
					</Label>
				</div>
			)}

			<div className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5">
				<div className="flex items-center justify-between">
					<Label className="text-xs font-medium">3D rotation</Label>
					{((device.rotation ?? 0) !== 0 ||
						(device.rotationX ?? 0) !== 0 ||
						(device.rotationY ?? 0) !== 0) && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs"
							onClick={() =>
								onPatchScene({
									device: {
										...device,
										rotation: 0,
										rotationX: 0,
										rotationY: 0,
									},
								})
							}
						>
							Reset
						</Button>
					)}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs">
						Tilt X (pitch): {Math.round(device.rotationX ?? 0)}°
					</Label>
					<Slider
						min={-45}
						max={45}
						step={1}
						value={[Math.round(device.rotationX ?? 0)]}
						onValueChange={([v]) =>
							onPatchScene({ device: { ...device, rotationX: v } })
						}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs">
						Tilt Y (yaw): {Math.round(device.rotationY ?? 0)}°
					</Label>
					<Slider
						min={-45}
						max={45}
						step={1}
						value={[Math.round(device.rotationY ?? 0)]}
						onValueChange={([v]) =>
							onPatchScene({ device: { ...device, rotationY: v } })
						}
					/>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs">
						Rotation Z (roll): {Math.round(device.rotation ?? 0)}°
					</Label>
					<Slider
						min={-45}
						max={45}
						step={1}
						value={[Math.round(device.rotation ?? 0)]}
						onValueChange={([v]) =>
							onPatchScene({ device: { ...device, rotation: v } })
						}
					/>
				</div>

				<div className="flex flex-wrap gap-1">
					{DEVICE_POSE_PRESETS.map((pose) => (
						<Button
							key={pose.label}
							type="button"
							size="sm"
							variant="outline"
							className="h-6 px-2 text-[11px]"
							onClick={() =>
								onPatchScene({
									device: {
										...device,
										rotation: pose.z,
										rotationX: pose.x,
										rotationY: pose.y,
									},
								})
							}
						>
							{pose.label}
						</Button>
					))}
				</div>
			</div>

			<Button variant="outline" size="sm" onClick={onPickScreenshot}>
				<ImageIcon className="h-4 w-4" />
				{scene.screenshot?.url ? "Change screenshot" : "Upload screenshot"}
			</Button>

			<Button variant="outline" size="sm" onClick={onPickExistingScreenshot}>
				<ImageIcon className="h-4 w-4" />
				Choose from uploaded
			</Button>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Screenshot fit</Label>
				<Select
					value={scene.screenshot?.fit ?? "cover"}
					onValueChange={(fit) =>
						onPatchScene({
							screenshot: {
								...scene.screenshot,
								fit: fit as "cover" | "contain",
							},
						})
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="cover">Fill (cover)</SelectItem>
						<SelectItem value="contain">Fit (contain)</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

function TextProperties({
	layer,
	sceneHeight,
	customFonts,
	googleFonts,
	onPatch,
	onUploadFont,
	onAddGoogleFont,
	onApplyStyleToAll,
}: {
	layer: SceneTextLayer;
	sceneHeight: number;
	customFonts?: SceneCustomFont[];
	googleFonts?: string[];
	onPatch: (patch: Partial<SceneTextLayer>) => void;
	onUploadFont: () => void;
	onAddGoogleFont: () => void;
	onApplyStyleToAll?: () => void;
}) {
	return (
		<div className="flex flex-col gap-3">
			<h4 className="text-sm font-semibold">Text</h4>
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Content</Label>
				<Textarea
					value={layer.text}
					rows={2}
					onChange={(e) => onPatch({ text: e.target.value })}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Style presets</Label>
				<div className="flex flex-wrap gap-1">
					{TEXT_STYLE_PRESETS.map((preset) => (
						<Button
							key={preset.label}
							type="button"
							size="sm"
							variant="outline"
							className="h-6 px-2 text-[11px]"
							onClick={() => onPatch(preset.patch(sceneHeight))}
						>
							{preset.label}
						</Button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Font</Label>
				<Select
					value={layer.fontFamily}
					onValueChange={(fontFamily) => {
						if (fontFamily === UPLOAD_FONT_VALUE) {
							onUploadFont();
							return;
						}
						if (fontFamily === ADD_GOOGLE_FONT_VALUE) {
							onAddGoogleFont();
							return;
						}
						onPatch({ fontFamily });
					}}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{WEB_SAFE_FONTS.map((f) => (
							<SelectItem key={f.value} value={f.value}>
								{f.label}
							</SelectItem>
						))}
						{(googleFonts ?? []).map((family) => (
							<SelectItem key={family} value={family}>
								{family}
							</SelectItem>
						))}
						{(customFonts ?? []).map((f) => (
							<SelectItem key={f.family} value={f.family}>
								{f.family}
							</SelectItem>
						))}
						<SelectItem value={ADD_GOOGLE_FONT_VALUE}>
							Add Google Font…
						</SelectItem>
						<SelectItem value={UPLOAD_FONT_VALUE}>Upload font…</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex gap-2">
				<div className="flex flex-1 flex-col gap-1.5">
					<Label className="text-xs">Size</Label>
					<Input
						type="number"
						value={layer.fontSize}
						min={8}
						onChange={(e) =>
							onPatch({ fontSize: Number(e.target.value) || layer.fontSize })
						}
					/>
				</div>
				<ColorField
					label="Color"
					value={layer.color}
					onChange={(color) => onPatch({ color })}
				/>
			</div>

			<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
				<Checkbox
					id={`grad-${layer.id}`}
					checked={layer.gradient != null}
					onCheckedChange={(checked) =>
						onPatch({
							gradient:
								checked === true
									? (layer.gradient ?? { from: "#fde047", to: "#f97316" })
									: undefined,
						})
					}
				/>
				<Label htmlFor={`grad-${layer.id}`} className="flex-1 text-xs">
					Gradient text
				</Label>
				{layer.gradient != null && (
					<>
						<input
							type="color"
							value={layer.gradient.from}
							onChange={(e) =>
								onPatch({
									gradient: { ...layer.gradient!, from: e.target.value },
								})
							}
							className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
							aria-label="Text gradient top color"
						/>
						<input
							type="color"
							value={layer.gradient.to}
							onChange={(e) =>
								onPatch({
									gradient: { ...layer.gradient!, to: e.target.value },
								})
							}
							className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
							aria-label="Text gradient bottom color"
						/>
					</>
				)}
			</div>

			<div className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5">
				<div className="flex items-center gap-2">
					<Checkbox
						id={`accent-${layer.id}`}
						checked={layer.accentColor != null}
						onCheckedChange={(checked) =>
							onPatch({
								accentColor:
									checked === true ? (layer.accentColor ?? "#fde047") : undefined,
								accentWords: checked === true ? layer.accentWords : undefined,
							})
						}
					/>
					<Label htmlFor={`accent-${layer.id}`} className="flex-1 text-xs">
						Accent words (second color)
					</Label>
					{layer.accentColor != null && (
						<input
							type="color"
							value={layer.accentColor}
							onChange={(e) => onPatch({ accentColor: e.target.value })}
							className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
							aria-label="Accent color"
						/>
					)}
				</div>
				{layer.accentColor != null && (
					<div className="flex flex-col gap-1.5">
						<Input
							value={layer.accentWords ?? ""}
							placeholder="precise, loops (comma separated)"
							onChange={(e) => onPatch({ accentWords: e.target.value })}
						/>
						<p className="text-[10px] text-muted-foreground">
							Listed words render in the accent color. Not applied while a
							gradient or curve is active.
						</p>
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
				<Checkbox
					id={`hl-${layer.id}`}
					checked={layer.highlight != null}
					onCheckedChange={(checked) =>
						onPatch({
							highlight: checked === true ? (layer.highlight ?? "#fde047") : undefined,
						})
					}
				/>
				<Label htmlFor={`hl-${layer.id}`} className="flex-1 text-xs">
					Highlight (marker)
				</Label>
				{layer.highlight != null && (
					<input
						type="color"
						value={layer.highlight}
						onChange={(e) => onPatch({ highlight: e.target.value })}
						className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
						aria-label="Highlight color"
					/>
				)}
			</div>

			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<Label className="text-xs">Curve: {Math.round(layer.curve ?? 0)}°</Label>
					{(layer.curve ?? 0) !== 0 && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs"
							onClick={() => onPatch({ curve: 0 })}
						>
							Reset
						</Button>
					)}
				</div>
				<Slider
					min={-180}
					max={180}
					step={5}
					value={[Math.round(layer.curve ?? 0)]}
					onValueChange={([v]) => onPatch({ curve: v })}
				/>
			</div>

			<div className="flex gap-2">
				<div className="flex flex-1 flex-col gap-1.5">
					<Label className="text-xs">Letter spacing</Label>
					<Input
						type="number"
						value={layer.letterSpacing ?? 0}
						onChange={(e) =>
							onPatch({ letterSpacing: Number(e.target.value) || 0 })
						}
					/>
				</div>
				<div className="flex flex-1 flex-col gap-1.5">
					<Label className="text-xs">Line height</Label>
					<Input
						type="number"
						step={0.05}
						min={0.6}
						value={layer.lineHeight ?? 1.2}
						onChange={(e) =>
							onPatch({ lineHeight: Number(e.target.value) || 1.2 })
						}
					/>
				</div>
			</div>

			<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
				<Checkbox
					id={`bg-${layer.id}`}
					checked={layer.bg != null}
					onCheckedChange={(checked) =>
						onPatch({ bg: checked === true ? (layer.bg ?? "#000000") : undefined })
					}
				/>
				<Label htmlFor={`bg-${layer.id}`} className="flex-1 text-xs">
					Background behind text
				</Label>
				{layer.bg != null && (
					<input
						type="color"
						value={layer.bg}
						onChange={(e) => onPatch({ bg: e.target.value })}
						className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
						aria-label="Text background color"
					/>
				)}
			</div>

			<div className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5">
				<div className="flex items-center gap-2">
					<Checkbox
						id={`stroke-${layer.id}`}
						checked={layer.strokeColor != null}
						onCheckedChange={(checked) =>
							onPatch(
								checked === true
									? {
											strokeColor: layer.strokeColor ?? "#000000",
											strokeWidth:
												layer.strokeWidth ??
												Math.max(2, Math.round(layer.fontSize * 0.1)),
										}
									: { strokeColor: undefined, strokeWidth: undefined },
							)
						}
					/>
					<Label htmlFor={`stroke-${layer.id}`} className="flex-1 text-xs">
						Stroke (outline)
					</Label>
					{layer.strokeColor != null && (
						<input
							type="color"
							value={layer.strokeColor}
							onChange={(e) => onPatch({ strokeColor: e.target.value })}
							className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
							aria-label="Stroke color"
						/>
					)}
				</div>
				{layer.strokeColor != null && (
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs">Stroke width</Label>
						<Input
							type="number"
							min={1}
							value={layer.strokeWidth ?? 0}
							onChange={(e) =>
								onPatch({ strokeWidth: Math.max(1, Number(e.target.value) || 1) })
							}
						/>
					</div>
				)}
			</div>

			<div className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5">
				<div className="flex items-center gap-2">
					<Checkbox
						id={`shadow-${layer.id}`}
						checked={layer.shadowColor != null}
						onCheckedChange={(checked) =>
							onPatch(
								checked === true
									? {
											shadowColor: layer.shadowColor ?? "#000000",
											shadowOffsetX: layer.shadowOffsetX ?? 0,
											// Default reads as a shadow cast BELOW the text.
											shadowOffsetY:
												layer.shadowOffsetY ??
												Math.max(2, Math.round(layer.fontSize * 0.08)),
											shadowBlur: layer.shadowBlur ?? 0,
										}
									: {
											shadowColor: undefined,
											shadowOffsetX: undefined,
											shadowOffsetY: undefined,
											shadowBlur: undefined,
										},
							)
						}
					/>
					<Label htmlFor={`shadow-${layer.id}`} className="flex-1 text-xs">
						Drop shadow
					</Label>
					{layer.shadowColor != null && (
						<input
							type="color"
							value={layer.shadowColor}
							onChange={(e) => onPatch({ shadowColor: e.target.value })}
							className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
							aria-label="Shadow color"
						/>
					)}
				</div>
				{layer.shadowColor != null && (
					<div className="flex gap-2">
						<div className="flex flex-1 flex-col gap-1.5">
							<Label className="text-xs">Offset X</Label>
							<Input
								type="number"
								value={layer.shadowOffsetX ?? 0}
								onChange={(e) =>
									onPatch({ shadowOffsetX: Number(e.target.value) || 0 })
								}
							/>
						</div>
						<div className="flex flex-1 flex-col gap-1.5">
							<Label className="text-xs">Offset Y</Label>
							<Input
								type="number"
								value={layer.shadowOffsetY ?? 0}
								onChange={(e) =>
									onPatch({ shadowOffsetY: Number(e.target.value) || 0 })
								}
							/>
						</div>
						<div className="flex flex-1 flex-col gap-1.5">
							<Label className="text-xs">Blur</Label>
							<Input
								type="number"
								min={0}
								value={layer.shadowBlur ?? 0}
								onChange={(e) =>
									onPatch({
										shadowBlur: Math.max(0, Number(e.target.value) || 0),
									})
								}
							/>
						</div>
					</div>
				)}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Weight</Label>
				<Select
					value={String(layer.weight ?? 400)}
					onValueChange={(w) => onPatch({ weight: Number(w) })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{FONT_WEIGHTS.map((w) => (
							<SelectItem key={w.value} value={String(w.value)}>
								{w.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Alignment</Label>
				<div className="flex gap-1">
					{(["left", "center", "right"] as SceneTextAlign[]).map((align) => (
						<Button
							key={align}
							type="button"
							size="sm"
							variant={layer.align === align ? "default" : "outline"}
							className="flex-1"
							onClick={() => onPatch({ align })}
						>
							{align === "left" ? "Left" : align === "center" ? "Center" : "Right"}
						</Button>
					))}
				</div>
			</div>

			<div className="flex items-start gap-2 rounded-md border border-border/60 p-2.5">
				<Checkbox
					id={`lock-${layer.id}`}
					checked={layer.locked ?? false}
					onCheckedChange={(checked) => onPatch({ locked: checked === true })}
				/>
				<div className="flex flex-col gap-0.5">
					<Label
						htmlFor={`lock-${layer.id}`}
						className="cursor-pointer text-xs font-medium"
					>
						Lock layer
					</Label>
					<p className="text-[11px] text-muted-foreground">
						Locked texts can&apos;t be dragged on the canvas and are skipped by
						&quot;apply style to all&quot;.
					</p>
				</div>
			</div>

			{onApplyStyleToAll && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onApplyStyleToAll}
				>
					<CopyPlus className="h-4 w-4" />
					Apply this style to all texts
				</Button>
			)}

			<div className="flex items-start gap-2 rounded-md border border-border/60 p-2.5">
				<Checkbox
					id={`dnt-${layer.id}`}
					checked={layer.doNotTranslate ?? false}
					onCheckedChange={(checked) =>
						onPatch({ doNotTranslate: checked === true })
					}
				/>
				<div className="flex flex-col gap-0.5">
					<Label
						htmlFor={`dnt-${layer.id}`}
						className="cursor-pointer text-xs font-medium"
					>
						Do not translate
					</Label>
					<p className="text-[11px] text-muted-foreground">
						This text is copied verbatim when generating language variants
						(e.g. brand name, price).
					</p>
				</div>
			</div>
		</div>
	);
}

/**
 * Properties for a user image layer: size, opacity, rotation, replace/delete.
 * Text-related controls don't apply here, so image layers get their own panel.
 */
function ImageAnnotationProperties({
	annotation,
	onPatch,
	onReplaceImage,
	onDelete,
}: {
	annotation: SceneImageAnnotation;
	onPatch: (patch: Partial<SceneImageAnnotation>) => void;
	onReplaceImage: () => void;
	onDelete: () => void;
}) {
	return (
		<div className="flex flex-col gap-3">
			<h4 className="text-sm font-semibold">Image layer</h4>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">
					Width: {Math.round(annotation.width * 100)}%
				</Label>
				<Slider
					min={5}
					max={100}
					step={1}
					value={[Math.round(annotation.width * 100)]}
					onValueChange={([v]) => onPatch({ width: v / 100 })}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">X: {Math.round(annotation.x * 100)}%</Label>
				<Slider
					min={0}
					max={100}
					step={1}
					value={[Math.round(annotation.x * 100)]}
					onValueChange={([v]) => onPatch({ x: v / 100 })}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Y: {Math.round(annotation.y * 100)}%</Label>
				<Slider
					min={0}
					max={100}
					step={1}
					value={[Math.round(annotation.y * 100)]}
					onValueChange={([v]) => onPatch({ y: v / 100 })}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">
					Opacity: {Math.round((annotation.opacity ?? 1) * 100)}%
				</Label>
				<Slider
					min={0}
					max={100}
					step={1}
					value={[Math.round((annotation.opacity ?? 1) * 100)]}
					onValueChange={([v]) => onPatch({ opacity: v / 100 })}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<Label className="text-xs">
						Rotation: {Math.round(annotation.rotation ?? 0)}°
					</Label>
					{(annotation.rotation ?? 0) !== 0 && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs"
							onClick={() => onPatch({ rotation: 0 })}
						>
							Reset
						</Button>
					)}
				</div>
				<Slider
					min={-180}
					max={180}
					step={1}
					value={[Math.round(annotation.rotation ?? 0)]}
					onValueChange={([v]) => onPatch({ rotation: v })}
				/>
			</div>

			<Button variant="outline" size="sm" onClick={onReplaceImage}>
				<ImageIcon className="h-4 w-4" />
				Replace image
			</Button>

			<Button
				variant="outline"
				size="sm"
				className="text-red-500 hover:text-red-600"
				onClick={onDelete}
			>
				<Trash2 className="h-4 w-4" />
				Delete
			</Button>
		</div>
	);
}

/** Properties for a decorative shape: kind, color, size, stroke, rotation. */
function ShapeAnnotationProperties({
	annotation,
	onPatch,
	onDelete,
}: {
	annotation: SceneShapeAnnotation;
	onPatch: (patch: Partial<SceneShapeAnnotation>) => void;
	onDelete: () => void;
}) {
	const isStroked =
		annotation.shape === "arrow" ||
		annotation.shape === "underline" ||
		annotation.shape === "squiggle" ||
		annotation.shape === "circle";
	return (
		<div className="flex flex-col gap-3">
			<h4 className="text-sm font-semibold">
				Shape · {SHAPE_META[annotation.shape].label}
			</h4>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Shape</Label>
				<Select
					value={annotation.shape}
					onValueChange={(shape) =>
						onPatch({ shape: shape as SceneShapeKind })
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{(Object.keys(SHAPE_META) as SceneShapeKind[]).map((shape) => (
							<SelectItem key={shape} value={shape}>
								{SHAPE_META[shape].label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<ColorField
				label="Color"
				value={annotation.color}
				onChange={(color) => onPatch({ color })}
			/>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">
					Width: {Math.round(annotation.width * 100)}%
				</Label>
				<Slider
					min={3}
					max={100}
					step={1}
					value={[Math.round(annotation.width * 100)]}
					onValueChange={([v]) => onPatch({ width: v / 100 })}
				/>
			</div>

			{isStroked && (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs">Stroke width</Label>
					<Input
						type="number"
						min={1}
						value={annotation.strokeWidth ?? 6}
						onChange={(e) =>
							onPatch({
								strokeWidth: Math.max(1, Number(e.target.value) || 1),
							})
						}
					/>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<Label className="text-xs">
						Rotation: {Math.round(annotation.rotation ?? 0)}°
					</Label>
					{(annotation.rotation ?? 0) !== 0 && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs"
							onClick={() => onPatch({ rotation: 0 })}
						>
							Reset
						</Button>
					)}
				</div>
				<Slider
					min={-180}
					max={180}
					step={1}
					value={[Math.round(annotation.rotation ?? 0)]}
					onValueChange={([v]) => onPatch({ rotation: v })}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">
					Opacity: {Math.round((annotation.opacity ?? 1) * 100)}%
				</Label>
				<Slider
					min={5}
					max={100}
					step={1}
					value={[Math.round((annotation.opacity ?? 1) * 100)]}
					onValueChange={([v]) => onPatch({ opacity: v / 100 })}
				/>
			</div>

			<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
				<Checkbox
					id={`flip-${annotation.id}`}
					checked={annotation.flip ?? false}
					onCheckedChange={(checked) => onPatch({ flip: checked === true })}
				/>
				<Label htmlFor={`flip-${annotation.id}`} className="text-xs">
					Flip horizontally
				</Label>
			</div>

			<Button
				variant="outline"
				size="sm"
				className="text-red-500 hover:text-red-600"
				onClick={onDelete}
			>
				<Trash2 className="h-4 w-4" />
				Delete
			</Button>
		</div>
	);
}

function AnnotationProperties({
	annotation,
	onPatch,
	onApplyStyleToAll,
}: {
	annotation: SceneTextAnnotation;
	onPatch: (patch: Partial<SceneTextAnnotation>) => void;
	onApplyStyleToAll?: () => void;
}) {
	const { label } = ANNOTATION_META[annotation.type];
	return (
		<div className="flex flex-col gap-3">
			<h4 className="text-sm font-semibold">Annotation · {label}</h4>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Content</Label>
				<Textarea
					value={annotation.text}
					rows={2}
					onChange={(e) => onPatch({ text: e.target.value })}
				/>
			</div>

			{annotation.type === "laurel" && (
				<div className="flex gap-2">
					<div className="flex flex-1 flex-col gap-1.5">
						<Label className="text-xs">Top line</Label>
						<Input
							value={annotation.textTop ?? ""}
							placeholder="2026"
							onChange={(e) =>
								onPatch({ textTop: e.target.value || undefined })
							}
						/>
					</div>
					<div className="flex flex-1 flex-col gap-1.5">
						<Label className="text-xs">Bottom line</Label>
						<Input
							value={annotation.textBottom ?? ""}
							placeholder="Design Award"
							onChange={(e) =>
								onPatch({ textBottom: e.target.value || undefined })
							}
						/>
					</div>
				</div>
			)}

			{annotation.type === "review" && (
				<>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs">Author</Label>
						<Input
							value={annotation.author ?? ""}
							placeholder="Mark — App Reviewer"
							onChange={(e) =>
								onPatch({ author: e.target.value || undefined })
							}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs">Stars: {annotation.stars ?? 5}</Label>
						<Slider
							min={0}
							max={5}
							step={1}
							value={[annotation.stars ?? 5]}
							onValueChange={([stars]) => onPatch({ stars })}
						/>
					</div>
					<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
						<Checkbox
							id={`quote-${annotation.id}`}
							checked={annotation.showQuoteMark !== false}
							onCheckedChange={(checked) =>
								onPatch({ showQuoteMark: checked === true })
							}
						/>
						<Label htmlFor={`quote-${annotation.id}`} className="text-xs">
							Big quote mark
						</Label>
					</div>
					<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
						<Checkbox
							id={`cardbg-${annotation.id}`}
							checked={annotation.showBackground === true}
							onCheckedChange={(checked) =>
								onPatch({ showBackground: checked === true })
							}
						/>
						<Label htmlFor={`cardbg-${annotation.id}`} className="flex-1 text-xs">
							Card background
						</Label>
					</div>
				</>
			)}

			<div className="flex gap-2">
				<div className="flex flex-1 flex-col gap-1.5">
					<Label className="text-xs">Size</Label>
					<Input
						type="number"
						value={annotation.fontSize}
						min={8}
						onChange={(e) =>
							onPatch({
								fontSize: Number(e.target.value) || annotation.fontSize,
							})
						}
					/>
				</div>
				<div className="flex flex-1 flex-col gap-1.5">
					<Label className="text-xs">Weight</Label>
					<Select
						value={String(annotation.weight ?? 600)}
						onValueChange={(w) => onPatch({ weight: Number(w) })}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{FONT_WEIGHTS.map((w) => (
								<SelectItem key={w.value} value={String(w.value)}>
									{w.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex gap-2">
				<ColorField
					label="Text"
					value={annotation.color}
					onChange={(color) => onPatch({ color })}
				/>
				{annotation.type !== "laurel" &&
					(annotation.type === "review"
						? annotation.showBackground === true
						: annotation.type !== "label" ||
							annotation.showBackground !== false) && (
						<ColorField
							label="Background"
							value={annotation.bg}
							onChange={(bg) => onPatch({ bg })}
						/>
					)}
			</div>

			{annotation.type === "label" && (
				<div className="flex items-center gap-2 rounded-md border border-border/60 p-2.5">
					<Checkbox
						id={`bg-${annotation.id}`}
						checked={annotation.showBackground !== false}
						onCheckedChange={(checked) =>
							onPatch({ showBackground: checked === true })
						}
					/>
					<Label
						htmlFor={`bg-${annotation.id}`}
						className="cursor-pointer text-xs font-medium"
					>
						Show label background
					</Label>
				</div>
			)}

			{annotation.type === "callout" && (
				<p className="rounded-md border border-border/60 p-2.5 text-[11px] text-muted-foreground">
					Drag the bubble to move it. When the callout is selected, drag the
					tip of its tail in the preview to point at a target.
				</p>
			)}

			{onApplyStyleToAll && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={onApplyStyleToAll}
				>
					<CopyPlus className="h-4 w-4" />
					Apply style to all {ANNOTATION_META[annotation.type].label.toLowerCase()}s
				</Button>
			)}

			<div className="flex items-start gap-2 rounded-md border border-border/60 p-2.5">
				<Checkbox
					id={`dnt-ann-${annotation.id}`}
					checked={annotation.doNotTranslate ?? false}
					onCheckedChange={(checked) =>
						onPatch({ doNotTranslate: checked === true })
					}
				/>
				<div className="flex flex-col gap-0.5">
					<Label
						htmlFor={`dnt-ann-${annotation.id}`}
						className="cursor-pointer text-xs font-medium"
					>
						Do not translate
					</Label>
					<p className="text-[11px] text-muted-foreground">
						The annotation text is copied verbatim when generating language
						variants (e.g. “NEW”, brand name).
					</p>
				</div>
			</div>
		</div>
	);
}

function ColorField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-xs">{label}</Label>
			<div className="flex items-center gap-2">
				<input
					type="color"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
					aria-label={label}
				/>
				<Input value={value} onChange={(e) => onChange(e.target.value)} />
			</div>
		</div>
	);
}
