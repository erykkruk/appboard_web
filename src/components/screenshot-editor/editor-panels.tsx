"use client";

import {
	Image as ImageIcon,
	MessageSquare,
	Plus,
	Smartphone,
	Tag,
	Trash2,
	Type,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	BACKGROUND_PRESETS,
	cssPreviewForBackground,
} from "@/lib/background-presets";
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
};

/** List/panel meta for any annotation, including image layers. */
function annotationMeta(annotation: SceneAnnotation): {
	label: string;
	icon: typeof Tag;
} {
	if (annotation.type === "image") {
		return { label: "Image", icon: ImageIcon };
	}
	return ANNOTATION_META[annotation.type];
}

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
	onAddImage: () => void;
	onDeleteAnnotation: (id: string) => void;
}

/** Left-side layer list: background, device, screenshot and each text layer. */
export function LayersPanel({
	scene,
	selectedLayerId,
	onSelectLayer,
	onAddText,
	onDeleteText,
	onAddAnnotation,
	onAddImage,
	onDeleteAnnotation,
}: LayersPanelProps) {
	const annotations = scene.annotations ?? [];
	return (
		<div className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border p-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-semibold">Layers</span>
				<Button size="sm" variant="ghost" onClick={onAddText}>
					<Plus className="h-4 w-4" />
					Text
				</Button>
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
								{annotation.type === "image"
									? label
									: annotation.text || label}
							</span>
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
					customFonts={scene.customFonts}
					googleFonts={scene.googleFonts}
					onPatch={(patch) => onPatchTextLayer(selectedText.id, patch)}
					onUploadFont={onUploadFont}
					onAddGoogleFont={onAddGoogleFont}
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
			{selectedAnnotation && selectedAnnotation.type !== "image" && (
				<AnnotationProperties
					annotation={selectedAnnotation}
					onPatch={(patch) => onPatchAnnotation(selectedAnnotation.id, patch)}
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
									device: { ...device, style: style as SceneDeviceStyle },
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="realistic">Realistic</SelectItem>
								<SelectItem value="clay">Clay (custom color)</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{(device.style ?? "realistic") === "clay" ? (
						<ColorField
							label="Clay color"
							value={device.clayColor ?? "#8282b2"}
							onChange={(clayColor) =>
								onPatchScene({ device: { ...device, clayColor } })
							}
						/>
					) : (
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
	customFonts,
	googleFonts,
	onPatch,
	onUploadFont,
	onAddGoogleFont,
}: {
	layer: SceneTextLayer;
	customFonts?: SceneCustomFont[];
	googleFonts?: string[];
	onPatch: (patch: Partial<SceneTextLayer>) => void;
	onUploadFont: () => void;
	onAddGoogleFont: () => void;
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

function AnnotationProperties({
	annotation,
	onPatch,
}: {
	annotation: SceneTextAnnotation;
	onPatch: (patch: Partial<SceneTextAnnotation>) => void;
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
				{(annotation.type !== "label" ||
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
