"use client";

import {
	AlertCircle,
	CheckCircle2,
	Languages,
	Loader2,
	Sparkles,
	Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type LanguageVariant,
	useSceneLocalization,
	type VariantStage,
} from "@/hooks/use-scene-localization";
import { useCreateScreenshotScene } from "@/hooks/use-screenshot-scenes";
import { useUploadScreenshot } from "@/hooks/use-publishing";
import { getScreenshotDimensionError } from "@/lib/api";
import {
	translatableAnnotations,
	translatableLayers,
} from "@/lib/screenshot-localization";
import { getDisplayTypeLabel } from "@/lib/screenshot-editor";
import { buildDimensionMessage } from "@/lib/screenshot-validation";
import { APP_STORE_LANGUAGES, type SceneData } from "@/lib/types";
import { cn } from "@/lib/utils";

import { exportSceneToPng } from "./export-scene";
import { ScenePreview } from "./scene-preview";

interface SceneLocalizationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appId: string;
	versionId: string;
	/** The scene currently open in the editor (source for the variants). */
	sourceScene: SceneData;
	/** Source scene name + language + display type, used to label the variants. */
	sourceName: string;
	sourceLanguage: string;
	displayType: string;
}

const STAGE_LABELS: Record<VariantStage, string> = {
	done: "Done",
	error: "Error",
	pending: "Pending",
	translating: "Translating…",
};

function languageLabel(locale: string): string {
	return (
		APP_STORE_LANGUAGES.find((l) => l.locale === locale)?.label ?? locale
	);
}

function StageIndicator({ stage }: { stage: VariantStage }) {
	if (stage === "done") {
		return <CheckCircle2 className="h-4 w-4 text-green-500" />;
	}
	if (stage === "error") {
		return <AlertCircle className="h-4 w-4 text-destructive" />;
	}
	if (stage === "pending") {
		return <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />;
	}
	return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
}

/**
 * "Generate language variants" of an on-image-text scene: the user picks target
 * languages, every translatable text layer is translated per language (Do Not
 * Translate layers kept verbatim), each variant is previewed, then persisted as
 * its own scene — optionally exported and uploaded as a screenshot in one go.
 */
export function SceneLocalizationDialog({
	open,
	onOpenChange,
	appId,
	versionId,
	sourceScene,
	sourceName,
	sourceLanguage,
	displayType,
}: SceneLocalizationDialogProps) {
	const localization = useSceneLocalization();
	const createScene = useCreateScreenshotScene(appId);
	const uploadScreenshot = useUploadScreenshot(appId, versionId);

	const [targets, setTargets] = useState<Set<string>>(new Set());
	const [isPersisting, setIsPersisting] = useState(false);

	const dntCount = useMemo(() => {
		const dntLayers = sourceScene.textLayers.filter(
			(l) => l.doNotTranslate && l.text.trim(),
		).length;
		const dntAnnotations = (sourceScene.annotations ?? []).filter(
			(a) =>
				a.type !== "image" &&
				a.type !== "shape" &&
				a.doNotTranslate &&
				a.text.trim(),
		).length;
		return dntLayers + dntAnnotations;
	}, [sourceScene.textLayers, sourceScene.annotations]);
	const translatableCount = useMemo(
		() =>
			translatableLayers(sourceScene).length +
			translatableAnnotations(sourceScene).length,
		[sourceScene],
	);

	const availableTargets = useMemo(
		() => APP_STORE_LANGUAGES.filter((l) => l.locale !== sourceLanguage),
		[sourceLanguage],
	);

	const variantList = useMemo(
		() =>
			[...targets]
				.map((language) => localization.variants[language])
				.filter((v): v is LanguageVariant => v !== undefined),
		[targets, localization.variants],
	);

	const doneVariants = variantList.filter((v) => v.stage === "done");
	const errorCount = variantList.filter((v) => v.stage === "error").length;

	const toggleTarget = (locale: string, checked: boolean) => {
		setTargets((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(locale);
			} else {
				next.delete(locale);
			}
			return next;
		});
	};

	const handleRun = async () => {
		const targetList = [...targets].filter((l) => l !== sourceLanguage);
		if (targetList.length === 0) {
			toast.error("Select at least one target language");
			return;
		}
		if (translatableCount === 0) {
			toast.error("No text to translate in this scene");
			return;
		}
		await localization.run(sourceScene, targetList);
	};

	const handleCreateAll = async () => {
		if (doneVariants.length === 0) return;
		setIsPersisting(true);
		let created = 0;
		for (const variant of doneVariants) {
			if (!variant.scene) continue;
			try {
				await createScene.mutateAsync({
					displayType,
					language: variant.language,
					name: `${sourceName} (${languageLabel(variant.language)})`,
					scene: variant.scene,
				});
				created++;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Save failed";
				toast.error(`${languageLabel(variant.language)}: ${message}`);
			}
		}
		setIsPersisting(false);
		if (created > 0) {
			toast.success(`Created ${created} variant(s) as separate scenes`);
		}
	};

	const handleExportAll = async () => {
		if (doneVariants.length === 0) return;
		setIsPersisting(true);
		let uploaded = 0;
		for (const variant of doneVariants) {
			if (!variant.scene) continue;
			const blob = await exportSceneToPng(variant.scene);
			if (!blob) {
				toast.error(
					`${languageLabel(variant.language)}: cannot export (remote image without CORS)`,
				);
				continue;
			}
			const file = new File(
				[blob],
				`scene-${variant.language}-${displayType}.png`,
				{ type: "image/png" },
			);
			try {
				await uploadScreenshot.mutateAsync({
					displayType,
					file,
					language: variant.language,
				});
				uploaded++;
			} catch (err) {
				const dimErr = getScreenshotDimensionError(err);
				toast.error(
					`${languageLabel(variant.language)}: ${
						dimErr
							? buildDimensionMessage(dimErr)
							: "failed to upload the screenshot"
					}`,
				);
			}
		}
		setIsPersisting(false);
		if (uploaded > 0) {
			toast.success(`Uploaded ${uploaded} screenshot(s)`);
		}
	};

	const handleDialogChange = (next: boolean) => {
		if (!next && (localization.isRunning || isPersisting)) return;
		if (!next) {
			localization.reset();
			setTargets(new Set());
		}
		onOpenChange(next);
	};

	const busy = localization.isRunning || isPersisting;

	return (
		<Dialog open={open} onOpenChange={handleDialogChange}>
			<DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
				<DialogHeader className="border-b border-border p-6 pb-4">
					<DialogTitle className="flex items-center gap-2">
						<Languages className="h-5 w-5" />
						Text localization
					</DialogTitle>
					<DialogDescription>
						Generate variants of this scene for other languages —{" "}
						{getDisplayTypeLabel(displayType)}, source:{" "}
						{languageLabel(sourceLanguage)}. Text marked “Do not translate”
						is copied verbatim.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="min-h-0 flex-1">
					<div className="space-y-6 p-6">
						<p className="text-xs text-muted-foreground">
							{translatableCount} text item(s) to translate
							{dntCount > 0 && ` · ${dntCount} skipped (Do not translate)`}
						</p>

						{/* Target languages */}
						<div className="space-y-2">
							<Label className="text-sm font-medium">Target languages</Label>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
								{availableTargets.map((lang) => {
									const id = `variant-${lang.locale}`;
									return (
										<div
											className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2"
											key={lang.locale}
										>
											<Checkbox
												checked={targets.has(lang.locale)}
												disabled={busy}
												id={id}
												onCheckedChange={(checked) =>
													toggleTarget(lang.locale, checked === true)
												}
											/>
											<Label
												className="cursor-pointer text-sm font-normal"
												htmlFor={id}
											>
												{lang.label}
											</Label>
										</div>
									);
								})}
							</div>
						</div>

						{/* Per-language progress + preview */}
						{variantList.length > 0 && (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Variants
									</Label>
									<span className="text-xs text-muted-foreground">
										{doneVariants.length}/{variantList.length} done
										{errorCount > 0 && ` · ${errorCount} error(s)`}
									</span>
								</div>
								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									{variantList.map((variant) => (
										<div
											className="space-y-2 rounded-lg border border-border bg-card p-3"
											key={variant.language}
										>
											<div className="flex items-center gap-2">
												<StageIndicator stage={variant.stage} />
												<span className="text-sm font-medium">
													{languageLabel(variant.language)}
												</span>
												<span
													className={cn(
														"text-xs",
														variant.stage === "error"
															? "text-destructive"
															: "text-muted-foreground",
													)}
												>
													{STAGE_LABELS[variant.stage]}
												</span>
											</div>
											{variant.stage === "error" && variant.error && (
												<p className="text-xs text-destructive">
													{variant.error}
												</p>
											)}
											{variant.scene && <ScenePreview scene={variant.scene} />}
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</ScrollArea>

				<DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border p-6 pt-4">
					<div className="flex items-center gap-2">
						{doneVariants.length > 0 && (
							<>
								<Button
									disabled={busy}
									onClick={handleCreateAll}
									variant="outline"
								>
									{isPersisting ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Sparkles className="mr-2 h-4 w-4" />
									)}
									Save as scenes ({doneVariants.length})
								</Button>
								<Button disabled={busy} onClick={handleExportAll} variant="outline">
									<Upload className="mr-2 h-4 w-4" />
									Export and upload
								</Button>
							</>
						)}
					</div>
					<Button disabled={busy || targets.size === 0} onClick={handleRun}>
						{localization.isRunning ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Languages className="mr-2 h-4 w-4" />
						)}
						{localization.isRunning ? "Generating…" : "Generate variants"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
