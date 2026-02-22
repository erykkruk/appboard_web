"use client";

import {
	AlertCircle,
	ChevronDown,
	CloudUpload,
	Download,
	Globe,
	Info,
	Loader2,
	RefreshCw,
	Save,
	Upload,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
import { Textarea } from "@/components/ui/textarea";
import {
	usePublishLocalizations,
	useSyncVersions,
	useUpdateCopyright,
	useUpdateLocalization,
	useVersionDetail,
} from "@/hooks/use-publishing";
import {
	downloadFile,
	exportListingsCsv,
	exportListingsJson,
	generateTemplate,
	parseListingsFile,
} from "@/lib/listings-csv";
import { APP_STORE_LANGUAGES, type VersionLocalization } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_COLORS: Record<string, string> = {
	DEVELOPER_REJECTED: "bg-orange-400",
	IN_REVIEW: "bg-blue-400",
	PENDING_DEVELOPER_RELEASE: "bg-purple-400",
	PREPARE_FOR_SUBMISSION: "bg-yellow-400",
	READY_FOR_SALE: "bg-green-400",
	REJECTED: "bg-red-400",
	WAITING_FOR_REVIEW: "bg-blue-400",
};

const STATE_LABELS: Record<string, string> = {
	DEVELOPER_REJECTED: "Developer Rejected",
	IN_REVIEW: "In Review",
	PENDING_DEVELOPER_RELEASE: "Pending Developer Release",
	PREPARE_FOR_SUBMISSION: "Prepare for Submission",
	READY_FOR_SALE: "Ready for Sale",
	REJECTED: "Rejected",
	WAITING_FOR_REVIEW: "Waiting for Review",
};

const EDITABLE_STATES = new Set([
	"PREPARE_FOR_SUBMISSION",
	"DEVELOPER_REJECTED",
	"REJECTED",
]);

// States where whatsNew can be edited (only after first version is live)
const WHATS_NEW_EDITABLE_STATES = new Set(["DEVELOPER_REJECTED", "REJECTED"]);

interface FieldConfig {
	key: keyof VersionLocalization;
	label: string;
	maxLength: number;
	minLength?: number;
	multiline?: boolean;
	rows?: number;
	placeholder?: string;
	hint?: string;
	urlField?: boolean;
}

const FIELDS: FieldConfig[] = [
	{
		key: "title",
		label: "Name",
		maxLength: 30,
		minLength: 2,
		placeholder: "App name",
	},
	{
		key: "subtitle",
		label: "Subtitle",
		maxLength: 30,
		placeholder: "A brief summary",
	},
	{
		key: "description",
		label: "Description",
		maxLength: 4000,
		minLength: 10,
		multiline: true,
		placeholder: "A detailed description of your app",
		rows: 8,
	},
	{
		key: "keywords",
		label: "Keywords",
		maxLength: 100,
		placeholder: "Separate keywords with commas",
	},
	{
		hint: "Only editable after the first version has been released",
		key: "whatsNew",
		label: "What's New",
		maxLength: 4000,
		multiline: true,
		placeholder: "Describe what's new in this version",
		rows: 4,
	},
	{
		key: "promotionalText",
		label: "Promotional Text",
		maxLength: 170,
		multiline: true,
		placeholder:
			"Promotional text appears at the top of the description. Can be updated at any time without resubmission.",
		rows: 2,
	},
	{
		key: "marketingUrl",
		label: "Marketing URL",
		maxLength: 255,
		placeholder: "https://",
		urlField: true,
	},
	{
		key: "supportUrl",
		label: "Support URL",
		maxLength: 255,
		placeholder: "https://",
		urlField: true,
	},
];

function getLanguageLabel(locale: string): string {
	const found = APP_STORE_LANGUAGES.find((l) => l.locale === locale);
	return found ? found.label : locale;
}

type FormData = Record<string, string>;

function buildFormData(loc: VersionLocalization): FormData {
	const data: FormData = {};
	for (const field of FIELDS) {
		data[field.key] = (loc[field.key] as string) ?? "";
	}
	return data;
}

function getChangedFields(
	original: FormData,
	current: FormData,
): Record<string, string> | null {
	const changes: Record<string, string> = {};
	for (const key of Object.keys(current)) {
		if (current[key] !== original[key]) {
			changes[key] = current[key];
		}
	}
	return Object.keys(changes).length > 0 ? changes : null;
}

function isValidUrl(value: string): boolean {
	if (!value) return true;
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function getFieldError(
	field: FieldConfig,
	value: string,
	isWhatsNewEditable: boolean,
): string | null {
	if (field.key === "whatsNew" && !isWhatsNewEditable) {
		return null; // Don't validate disabled field
	}

	const len = value.length;

	if (len > field.maxLength) {
		return `Exceeds maximum of ${field.maxLength} characters`;
	}

	if (field.minLength && len > 0 && len < field.minLength) {
		return `Must be at least ${field.minLength} characters`;
	}

	if (field.urlField && value && !isValidUrl(value)) {
		return "Must be a valid URL (e.g. https://example.com)";
	}

	return null;
}

export default function VersionDetailPage() {
	const params = useParams<{ appId: string; versionId: string }>();
	const detail = useVersionDetail(params.appId, params.versionId);
	const updateLoc = useUpdateLocalization(params.appId, params.versionId);
	const updateCopyright = useUpdateCopyright(params.appId, params.versionId);
	const syncVersions = useSyncVersions(params.appId);
	const publishLocs = usePublishLocalizations(params.appId, params.versionId);

	const [selectedLanguage, setSelectedLanguage] = useState<string>("");
	const [formData, setFormData] = useState<FormData>({});
	const [originalData, setOriginalData] = useState<FormData>({});
	const [copyrightValue, setCopyrightValue] = useState("");
	const [originalCopyright, setOriginalCopyright] = useState("");
	const [isImporting, setIsImporting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const localizations = detail.data?.localizations ?? [];

	// Sync copyright from server data
	useEffect(() => {
		if (detail.data?.copyright !== undefined) {
			setCopyrightValue(detail.data.copyright);
			setOriginalCopyright(detail.data.copyright);
		}
	}, [detail.data?.copyright]);

	// Auto-select first language
	useEffect(() => {
		if (localizations.length > 0 && !selectedLanguage) {
			setSelectedLanguage(localizations[0].language);
		}
	}, [localizations, selectedLanguage]);

	// Current localization
	const currentLoc = useMemo(
		() => localizations.find((l) => l.language === selectedLanguage),
		[localizations, selectedLanguage],
	);

	// Sync form data when localization changes
	useEffect(() => {
		if (currentLoc) {
			const data = buildFormData(currentLoc);
			setFormData(data);
			setOriginalData(data);
		}
	}, [currentLoc]);

	const handleLanguageChange = useCallback((lang: string) => {
		setSelectedLanguage(lang);
	}, []);

	const handleFieldChange = useCallback((key: string, value: string) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	}, []);

	const state = detail.data?.state ?? "";
	const isEditable = EDITABLE_STATES.has(state);

	// whatsNew is only editable after the first version has been released
	// PREPARE_FOR_SUBMISSION on the very first version means whatsNew is locked
	const isWhatsNewEditable =
		WHATS_NEW_EDITABLE_STATES.has(state) ||
		(state === "PREPARE_FOR_SUBMISSION" &&
			!!(formData.whatsNew || originalData.whatsNew));

	const changedFields = useMemo(
		() => getChangedFields(originalData, formData),
		[originalData, formData],
	);

	// Compute all validation errors
	const fieldErrors = useMemo(() => {
		const errors: Record<string, string | null> = {};
		for (const field of FIELDS) {
			const value = formData[field.key] ?? "";
			errors[field.key] = getFieldError(field, value, isWhatsNewEditable);
		}
		return errors;
	}, [formData, isWhatsNewEditable]);

	const hasValidationErrors = useMemo(
		() => Object.values(fieldErrors).some((e) => e !== null),
		[fieldErrors],
	);

	const handleSave = async () => {
		if (!currentLoc || !changedFields) return;

		// Filter out whatsNew if it's not editable
		const fieldsToSave = { ...changedFields };
		if (!isWhatsNewEditable) {
			delete fieldsToSave.whatsNew;
		}

		if (Object.keys(fieldsToSave).length === 0) return;

		try {
			const result = await updateLoc.mutateAsync({
				data: fieldsToSave,
				localizationId: currentLoc.localizationId,
			});
			setOriginalData({ ...formData });
			if (result.savedLocally) {
				toast.info(
					"Zmiany zapisane lokalnie. Zostaną zsynchronizowane z App Store później.",
				);
			} else {
				toast.success("Listing saved");
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to save listing";
			toast.error(message);
		}
	};

	const copyrightChanged = copyrightValue !== originalCopyright;
	const copyrightOverLimit = copyrightValue.length > 255;

	const handleSaveCopyright = async () => {
		if (!copyrightChanged || copyrightOverLimit) return;
		try {
			const result = await updateCopyright.mutateAsync(copyrightValue);
			setOriginalCopyright(copyrightValue);
			if (result.savedLocally) {
				toast.info(
					"Copyright zapisany lokalnie. Zostanie zsynchronizowany z App Store później.",
				);
			} else {
				toast.success("Copyright saved");
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to save copyright";
			toast.error(message);
		}
	};

	const handleSync = async () => {
		try {
			const result = await syncVersions.mutateAsync();
			if (result.source === "live") {
				toast.success(`Synced ${result.synced} version(s) from App Store`);
			} else {
				toast.warning(
					"App Store niedostępny — używam danych z pamięci podręcznej",
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to sync";
			toast.error(message);
		}
	};

	const handlePublishLocalizations = async () => {
		try {
			const result = await publishLocs.mutateAsync();
			if (result.error === "store_unavailable") {
				toast.warning(
					"App Store chwilowo niedostępny. Zmiany zapisane lokalnie.",
				);
			} else if (result.errors?.length) {
				toast.warning(
					`Published ${result.published}, but ${result.errors.length} error(s)`,
				);
			} else {
				toast.success(
					`Published ${result.published} localization(s) to App Store`,
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to publish";
			toast.error(message);
		}
	};

	const handleExportCsv = useCallback(() => {
		const csv = exportListingsCsv(localizations);
		downloadFile(
			csv,
			`listings-v${detail.data?.versionString ?? "0"}.csv`,
			"text/csv",
		);
	}, [localizations, detail.data?.versionString]);

	const handleExportJson = useCallback(() => {
		const json = exportListingsJson(localizations);
		downloadFile(
			json,
			`listings-v${detail.data?.versionString ?? "0"}.json`,
			"application/json",
		);
	}, [localizations, detail.data?.versionString]);

	const handleDownloadTemplate = useCallback(() => {
		const csv = generateTemplate();
		downloadFile(csv, "listings-template.csv", "text/csv");
	}, []);

	const handleImport = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			// Reset input so same file can be re-imported
			e.target.value = "";

			setIsImporting(true);

			try {
				const text = await file.text();
				const { rows, errors } = parseListingsFile(text, file.name);

				if (errors.length > 0) {
					for (const err of errors) {
						toast.error(err);
					}
				}

				if (rows.length === 0) {
					setIsImporting(false);
					return;
				}

				let updated = 0;
				let skipped = 0;

				for (const row of rows) {
					const loc = localizations.find((l) => l.language === row.language);
					if (!loc) {
						toast.error(`Language "${row.language}" not found — skipped`);
						skipped++;
						continue;
					}

					const data: Record<string, string> = {};
					for (const key of [
						"title",
						"subtitle",
						"description",
						"keywords",
						"whatsNew",
						"promotionalText",
						"marketingUrl",
						"supportUrl",
					] as const) {
						if (row[key] !== undefined && row[key] !== String(loc[key] ?? "")) {
							data[key] = row[key];
						}
					}

					if (Object.keys(data).length === 0) continue;

					await updateLoc.mutateAsync({
						data,
						localizationId: loc.localizationId,
					});
					updated++;
				}

				if (updated > 0) {
					toast.success(`Imported ${updated} language(s)`);
				}
				if (skipped > 0) {
					toast.warning(`Skipped ${skipped} language(s)`);
				}
				if (updated === 0 && skipped === 0) {
					toast.info("No changes detected");
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : "Import failed";
				toast.error(message);
			} finally {
				setIsImporting(false);
			}
		},
		[localizations, updateLoc],
	);

	if (detail.isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!detail.data) {
		return (
			<div className="flex items-center justify-center py-20 text-muted-foreground">
				Version not found
			</div>
		);
	}

	const { versionString } = detail.data;
	const isFromCache = detail.data.source === "cache";
	const hasDirtyLocalizations = localizations.some((l) => l.isDirty);

	return (
		<div className="p-6 space-y-6">
			{/* Cache banner */}
			{isFromCache && (
				<div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-200">
					<Info className="h-4 w-4 shrink-0" />
					<span>
						Dane z pamięci podręcznej — App Store chwilowo niedostępny
					</span>
					<Button
						className="ml-auto h-7 text-xs"
						disabled={syncVersions.isPending}
						onClick={handleSync}
						size="sm"
						variant="ghost"
					>
						{syncVersions.isPending ? (
							<Loader2 className="mr-1 h-3 w-3 animate-spin" />
						) : (
							<RefreshCw className="mr-1 h-3 w-3" />
						)}
						Retry
					</Button>
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							"h-8 w-1.5 rounded-full",
							STATE_COLORS[state] ?? "bg-muted-foreground",
						)}
					/>
					<div>
						<h1 className="text-xl font-bold">
							Version {versionString} — Listings
						</h1>
						<p className="text-sm text-muted-foreground">
							{STATE_LABELS[state] ?? state}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{/* Export dropdown */}
					{localizations.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="sm" variant="outline">
									<Download className="mr-1.5 h-4 w-4" />
									Export
									<ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onSelect={handleExportCsv}>
									Export CSV
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={handleExportJson}>
									Export JSON
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={handleDownloadTemplate}>
									Download Template
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}

					{/* Import button */}
					{isEditable && (
						<>
							<input
								accept=".csv,.json"
								className="hidden"
								onChange={handleImport}
								ref={fileInputRef}
								type="file"
							/>
							<Button
								disabled={isImporting}
								onClick={() => fileInputRef.current?.click()}
								size="sm"
								variant="outline"
							>
								{isImporting ? (
									<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
								) : (
									<Upload className="mr-1.5 h-4 w-4" />
								)}
								Import
							</Button>
						</>
					)}

					{/* Language selector */}
					{localizations.length > 0 && (
						<Select
							onValueChange={handleLanguageChange}
							value={selectedLanguage}
						>
							<SelectTrigger className="w-[220px]">
								<Globe className="mr-2 h-4 w-4 text-muted-foreground" />
								<SelectValue placeholder="Select language" />
							</SelectTrigger>
							<SelectContent>
								{localizations
									.slice()
									.sort((a, b) => a.language.localeCompare(b.language))
									.map((loc) => (
										<SelectItem key={loc.language} value={loc.language}>
											{getLanguageLabel(loc.language)}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					)}

					{/* Sync button */}
					<Button
						disabled={syncVersions.isPending}
						onClick={handleSync}
						size="sm"
						variant="outline"
					>
						{syncVersions.isPending ? (
							<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-1.5 h-4 w-4" />
						)}
						Sync
					</Button>

					{/* Publish drafts button */}
					{isEditable && hasDirtyLocalizations && (
						<Button
							disabled={publishLocs.isPending}
							onClick={handlePublishLocalizations}
							size="sm"
							variant="outline"
						>
							{publishLocs.isPending ? (
								<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
							) : (
								<CloudUpload className="mr-1.5 h-4 w-4" />
							)}
							Publish to ASC
						</Button>
					)}

					{/* Save button */}
					{isEditable && (
						<Button
							disabled={
								!changedFields || hasValidationErrors || updateLoc.isPending
							}
							onClick={handleSave}
							size="sm"
						>
							{updateLoc.isPending ? (
								<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
							) : (
								<Save className="mr-1.5 h-4 w-4" />
							)}
							Save
						</Button>
					)}
				</div>
			</div>

			{/* Copyright (version-level, not language-dependent) */}
			<div className="max-w-2xl space-y-1.5">
				<div className="flex items-center justify-between">
					<Label className="text-sm font-medium" htmlFor="copyright">
						Copyright
					</Label>
					<div className="flex items-center gap-2">
						<span
							className={cn(
								"text-xs tabular-nums",
								copyrightOverLimit
									? "text-destructive font-medium"
									: "text-muted-foreground",
							)}
						>
							{copyrightValue.length}/255
						</span>
						{isEditable && (
							<Button
								className="h-7 px-2 text-xs"
								disabled={
									!copyrightChanged ||
									copyrightOverLimit ||
									updateCopyright.isPending
								}
								onClick={handleSaveCopyright}
								size="sm"
								variant="outline"
							>
								{updateCopyright.isPending ? (
									<Loader2 className="mr-1 h-3 w-3 animate-spin" />
								) : (
									<Save className="mr-1 h-3 w-3" />
								)}
								Save
							</Button>
						)}
					</div>
				</div>
				<Input
					className={cn(
						"bg-[#1a1a1a] border-border",
						copyrightOverLimit && "border-destructive",
					)}
					disabled={!isEditable}
					id="copyright"
					onChange={(e) => setCopyrightValue(e.target.value)}
					placeholder="© 2024 Your Company"
					value={copyrightValue}
				/>
				{copyrightOverLimit && (
					<p className="flex items-center gap-1 text-xs text-destructive">
						<AlertCircle className="h-3 w-3 shrink-0" />
						Exceeds maximum of 255 characters
					</p>
				)}
			</div>

			{/* No localizations */}
			{localizations.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No localizations found. Add languages in the Languages tab first.
				</p>
			) : !currentLoc ? (
				<p className="text-sm text-muted-foreground">
					Select a language to view its listing.
				</p>
			) : (
				<div className="max-w-2xl space-y-6">
					{FIELDS.map((field) => {
						const value = formData[field.key] ?? "";
						const charCount = value.length;
						const isOverLimit = charCount > field.maxLength;
						const error = fieldErrors[field.key];
						const isFieldDisabled =
							!isEditable || (field.key === "whatsNew" && !isWhatsNewEditable);
						const hasError = !!error;

						return (
							<div className="space-y-1.5" key={field.key}>
								<div className="flex items-center justify-between">
									<Label className="text-sm font-medium" htmlFor={field.key}>
										{field.label}
										{field.minLength && (
											<span className="ml-1 text-xs text-muted-foreground font-normal">
												(min {field.minLength})
											</span>
										)}
									</Label>
									<span
										className={cn(
											"text-xs tabular-nums",
											isOverLimit
												? "text-destructive font-medium"
												: "text-muted-foreground",
										)}
									>
										{charCount}/{field.maxLength}
									</span>
								</div>

								{field.multiline ? (
									<Textarea
										className={cn(
											"resize-none bg-[#1a1a1a] border-border",
											hasError && "border-destructive",
										)}
										disabled={isFieldDisabled}
										id={field.key}
										onChange={(e) =>
											handleFieldChange(field.key, e.target.value)
										}
										placeholder={field.placeholder}
										rows={field.rows ?? 4}
										value={value}
									/>
								) : (
									<Input
										className={cn(
											"bg-[#1a1a1a] border-border",
											hasError && "border-destructive",
										)}
										disabled={isFieldDisabled}
										id={field.key}
										onChange={(e) =>
											handleFieldChange(field.key, e.target.value)
										}
										placeholder={field.placeholder}
										value={value}
									/>
								)}

								{/* Validation error */}
								{hasError && (
									<p className="flex items-center gap-1 text-xs text-destructive">
										<AlertCircle className="h-3 w-3 shrink-0" />
										{error}
									</p>
								)}

								{/* Hint for disabled whatsNew */}
								{field.key === "whatsNew" &&
									!isWhatsNewEditable &&
									isEditable && (
										<p className="text-xs text-muted-foreground">
											{field.hint}
										</p>
									)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
