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
	SceneData,
	SceneDeviceFrame,
	SceneTextAlign,
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

/** Icon + Polish label for each annotation variant, shared by list and menu. */
const ANNOTATION_META: Record<
	SceneAnnotationType,
	{ label: string; icon: typeof Tag }
> = {
	badge: { label: "Badge", icon: Tag },
	callout: { label: "Callout", icon: MessageSquare },
	label: { label: "Etykieta", icon: Type },
};

interface LayersPanelProps {
	scene: SceneData;
	selectedLayerId: string | null;
	onSelectLayer: (id: string | null) => void;
	onAddText: () => void;
	onDeleteText: (id: string) => void;
	onAddAnnotation: (type: SceneAnnotationType) => void;
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
	onDeleteAnnotation,
}: LayersPanelProps) {
	const annotations = scene.annotations ?? [];
	return (
		<div className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border p-3">
			<div className="flex items-center justify-between">
				<span className="text-sm font-semibold">Warstwy</span>
				<Button size="sm" variant="ghost" onClick={onAddText}>
					<Plus className="h-4 w-4" />
					Tekst
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
				Tło
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
				Urządzenie + screenshot
			</button>

			<div className="mt-1 text-xs font-medium text-muted-foreground">
				Napisy
			</div>
			{scene.textLayers.length === 0 && (
				<p className="px-2 text-xs text-muted-foreground">Brak napisów.</p>
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
						<span className="truncate">{layer.text || "Pusty tekst"}</span>
					</button>
					<button
						type="button"
						onClick={() => onDeleteText(layer.id)}
						className="opacity-0 transition-opacity group-hover:opacity-100"
						aria-label="Usuń napis"
					>
						<Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
					</button>
				</div>
			))}

			<div className="mt-2 flex items-center justify-between">
				<span className="text-xs font-medium text-muted-foreground">
					Adnotacje
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm" variant="ghost">
							<Plus className="h-4 w-4" />
							Dodaj
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{(
							Object.keys(ANNOTATION_META) as SceneAnnotationType[]
						).map((type) => {
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
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{annotations.length === 0 && (
				<p className="px-2 text-xs text-muted-foreground">Brak adnotacji.</p>
			)}
			{annotations.map((annotation) => {
				const { icon: Icon } = ANNOTATION_META[annotation.type];
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
								{annotation.text || ANNOTATION_META[annotation.type].label}
							</span>
						</button>
						<button
							type="button"
							onClick={() => onDeleteAnnotation(annotation.id)}
							className="opacity-0 transition-opacity group-hover:opacity-100"
							aria-label="Usuń adnotację"
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
				/>
			)}
			{selectedText && (
				<TextProperties
					layer={selectedText}
					onPatch={(patch) => onPatchTextLayer(selectedText.id, patch)}
				/>
			)}
			{selectedAnnotation && (
				<AnnotationProperties
					annotation={selectedAnnotation}
					onPatch={(patch) => onPatchAnnotation(selectedAnnotation.id, patch)}
				/>
			)}
			{!selectedLayerId && (
				<p className="text-sm text-muted-foreground">
					Wybierz warstwę z lewej listy lub kliknij napis na podglądzie, aby
					edytować jego właściwości.
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
			<h4 className="text-sm font-semibold">Tło</h4>
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Typ</Label>
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
						<SelectItem value="color">Jednolity kolor</SelectItem>
						<SelectItem value="gradient">Gradient</SelectItem>
						<SelectItem value="image">Obraz</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{bg.type === "color" && (
				<ColorField
					label="Kolor"
					value={bg.value}
					onChange={(value) =>
						onPatchScene({ background: { type: "color", value } })
					}
				/>
			)}

			{bg.type === "gradient" && bg.gradient && (
				<>
					<ColorField
						label="Od"
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
					<ColorField
						label="Do"
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
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs">Kąt: {bg.gradient.angle}°</Label>
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
				</>
			)}

			{bg.type === "image" && (
				<Button variant="outline" size="sm" onClick={onPickBackgroundImage}>
					<ImageIcon className="h-4 w-4" />
					{bg.value ? "Zmień obraz tła" : "Wgraj obraz tła"}
				</Button>
			)}
		</div>
	);
}

function DeviceProperties({
	scene,
	onPatchScene,
	onPickScreenshot,
}: {
	scene: SceneData;
	onPatchScene: (patch: Partial<SceneData>) => void;
	onPickScreenshot: () => void;
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
			<h4 className="text-sm font-semibold">Urządzenie</h4>
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Ramka</Label>
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
						<SelectItem value="android">Android</SelectItem>
						<SelectItem value="none">Brak (pełny ekran)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">
					Rozmiar: {Math.round(device.scale * 100)}%
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
				<Label className="text-xs">Pozycja pionowa</Label>
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

			<Button variant="outline" size="sm" onClick={onPickScreenshot}>
				<ImageIcon className="h-4 w-4" />
				{scene.screenshot?.url ? "Zmień screenshot" : "Wgraj screenshot"}
			</Button>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Dopasowanie screenshotu</Label>
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
						<SelectItem value="cover">Wypełnij (cover)</SelectItem>
						<SelectItem value="contain">Zmieść (contain)</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

function TextProperties({
	layer,
	onPatch,
}: {
	layer: SceneTextLayer;
	onPatch: (patch: Partial<SceneTextLayer>) => void;
}) {
	return (
		<div className="flex flex-col gap-3">
			<h4 className="text-sm font-semibold">Napis</h4>
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Treść</Label>
				<Textarea
					value={layer.text}
					rows={2}
					onChange={(e) => onPatch({ text: e.target.value })}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Czcionka</Label>
				<Select
					value={layer.fontFamily}
					onValueChange={(fontFamily) => onPatch({ fontFamily })}
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
					</SelectContent>
				</Select>
			</div>

			<div className="flex gap-2">
				<div className="flex flex-1 flex-col gap-1.5">
					<Label className="text-xs">Rozmiar</Label>
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
					label="Kolor"
					value={layer.color}
					onChange={(color) => onPatch({ color })}
				/>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Grubość</Label>
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
				<Label className="text-xs">Wyrównanie</Label>
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
							{align === "left" ? "Lewo" : align === "center" ? "Środek" : "Prawo"}
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
						Nie tłumacz
					</Label>
					<p className="text-[11px] text-muted-foreground">
						Ten napis zostanie dosłownie skopiowany przy generowaniu wariantów
						językowych (np. nazwa marki, cena).
					</p>
				</div>
			</div>
		</div>
	);
}

function AnnotationProperties({
	annotation,
	onPatch,
}: {
	annotation: SceneAnnotation;
	onPatch: (patch: Partial<SceneAnnotation>) => void;
}) {
	const { label } = ANNOTATION_META[annotation.type];
	return (
		<div className="flex flex-col gap-3">
			<h4 className="text-sm font-semibold">Adnotacja · {label}</h4>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Treść</Label>
				<Textarea
					value={annotation.text}
					rows={2}
					onChange={(e) => onPatch({ text: e.target.value })}
				/>
			</div>

			<div className="flex gap-2">
				<div className="flex flex-1 flex-col gap-1.5">
					<Label className="text-xs">Rozmiar</Label>
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
					<Label className="text-xs">Grubość</Label>
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
					label="Tekst"
					value={annotation.color}
					onChange={(color) => onPatch({ color })}
				/>
				{(annotation.type !== "label" ||
					annotation.showBackground !== false) && (
					<ColorField
						label="Tło"
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
						Pokaż tło etykiety
					</Label>
				</div>
			)}

			{annotation.type === "callout" && (
				<p className="rounded-md border border-border/60 p-2.5 text-[11px] text-muted-foreground">
					Przeciągnij dymek, aby go przesunąć. Gdy callout jest zaznaczony,
					przeciągnij końcówkę ogonka na podglądzie, aby wskazać cel.
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
						Nie tłumacz
					</Label>
					<p className="text-[11px] text-muted-foreground">
						Treść adnotacji zostanie dosłownie skopiowana przy generowaniu
						wariantów językowych (np. „NOWOŚĆ”, nazwa marki).
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
