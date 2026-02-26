"use client";

import {
	AlertCircle,
	Download,
	Globe,
	Info,
	Languages,
	Loader2,
	MoreVertical,
	RefreshCw,
	Sparkles,
	Upload,
	X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ActionsMenu } from "@/components/actions-menu";
import type { ActionsMenuAction } from "@/components/actions-menu";
import { useApp } from "@/hooks/use-apps";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useCapabilities } from "@/hooks/use-capabilities";
import {
	useSyncVersions,
	useUpdateCopyright,
	useUpdateLocalization,
	useVersionDetail,
} from "@/hooks/use-publishing";
import { api } from "@/lib/api";
import {
	downloadFile,
	exportListingsCsv,
	exportListingsJson,
	generateTemplate,
	parseListingsFile,
} from "@/lib/listings-csv";
import {
	APP_STORE_LANGUAGES,
	type ListingFieldName,
	type VersionLocalization,
} from "@/lib/types";
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
	"ACTIVE",
	"PREPARE_FOR_SUBMISSION",
	"DEVELOPER_REJECTED",
	"REJECTED",
]);

const WHATS_NEW_EDITABLE_STATES = new Set(["DEVELOPER_REJECTED", "REJECTED"]);

const AI_FIELDS: ListingFieldName[] = [
	"title",
	"subtitle",
	"shortDescription",
	"description",
	"fullDescription",
	"keywords",
	"promotionalText",
	"whatsNew",
];

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
		key: "shortDescription",
		label: "Short Description",
		maxLength: 80,
		placeholder: "A brief summary of your app",
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
		key: "fullDescription",
		label: "Full Description",
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

type FieldData = Record<string, string>;

function buildFieldData(loc: VersionLocalization): FieldData {
	const data: FieldData = {};
	for (const field of FIELDS) {
		data[field.key] = (loc[field.key] as string) ?? "";
	}
	return data;
}

function getChangedFields(
	original: FieldData,
	current: FieldData,
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
	checkMinLength: boolean,
): string | null {
	if (field.key === "whatsNew" && !isWhatsNewEditable) {
		return null;
	}

	const len = value.length;

	if (len > field.maxLength) {
		return `Exceeds maximum of ${field.maxLength} characters`;
	}

	if (checkMinLength && field.minLength && len > 0 && len < field.minLength) {
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
	const appData = useApp(params.appId);
	const capabilities = useCapabilities(params.appId);
	const updateLoc = useUpdateLocalization(params.appId, params.versionId);
	const updateCopyright = useUpdateCopyright(params.appId, params.versionId);
	const syncVersions = useSyncVersions(params.appId);
	const [selectedLanguage, setSelectedLanguage] = useState<string>("");
	// Multi-language form data keyed by locale
	const [allFormData, setAllFormData] = useState<Record<string, FieldData>>(
		{},
	);
	const [allOriginalData, setAllOriginalData] = useState<
		Record<string, FieldData>
	>({});
	// Per-field language override (field key → locale)
	const [fieldLangOverrides, setFieldLangOverrides] = useState<
		Record<string, string>
	>({});
	const [copyrightValue, setCopyrightValue] = useState("");
	const [originalCopyright, setOriginalCopyright] = useState("");
	const [isImporting, setIsImporting] = useState(false);
	const [generatingField, setGeneratingField] = useState<string | null>(null);
	const [isGeneratingAll, setIsGeneratingAll] = useState(false);
	const [primaryCategory, setPrimaryCategory] = useState<string>("");
	const [secondaryCategory, setSecondaryCategory] = useState<string>("");
	const [originalPrimary, setOriginalPrimary] = useState<string>("");
	const [originalSecondary, setOriginalSecondary] = useState<string>("");
	const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
	const [saveAttempted, setSaveAttempted] = useState(false);
	const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
	const [generateScope, setGenerateScope] = useState<
		"current" | "all"
	>("current");
	const [isTranslatingAll, setIsTranslatingAll] = useState(false);
	const [translatingField, setTranslatingField] = useState<string | null>(null);
	const [aiConfirm, setAiConfirm] = useState<{
		field: ListingFieldName;
		label: string;
		mode: "generate" | "rephrase";
		language: string;
	} | null>(null);
	const [categoriesData, setCategoriesData] = useState<{
		availableCategories: { id: string; name: string }[];
	} | null>(null);


	const localizations = detail.data?.localizations ?? [];

	// Filter fields based on platform capabilities
	const capData = capabilities.data;
	const isFieldEnabled = useCallback(
		(fieldKey: string) =>
			!capData || capData.listings.fields.includes(fieldKey),
		[capData],
	);

	const visibleFields = useMemo(
		() => FIELDS.filter((f) => isFieldEnabled(f.key)),
		[isFieldEnabled],
	);

	const visibleAiFields = useMemo(
		() => AI_FIELDS.filter((f) => isFieldEnabled(f)),
		[isFieldEnabled],
	);

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

	// Build form data for ALL localizations when data changes
	useEffect(() => {
		if (localizations.length === 0) return;
		const formMap: Record<string, FieldData> = {};
		const origMap: Record<string, FieldData> = {};
		for (const loc of localizations) {
			const data = buildFieldData(loc);
			formMap[loc.language] = data;
			origMap[loc.language] = data;
		}
		setAllFormData(formMap);
		setAllOriginalData(origMap);
	}, [localizations]);

	const currentLoc = useMemo(
		() => localizations.find((l) => l.language === selectedLanguage),
		[localizations, selectedLanguage],
	);

	const handleLanguageChange = useCallback((lang: string) => {
		setSelectedLanguage(lang);
		setSaveAttempted(false);
		setFieldLangOverrides({});
	}, []);

	const handleFieldLangChange = useCallback(
		(fieldKey: string, lang: string) => {
			setFieldLangOverrides((prev) => {
				if (lang === selectedLanguage) {
					const next = { ...prev };
					delete next[fieldKey];
					return next;
				}
				return { ...prev, [fieldKey]: lang };
			});
		},
		[selectedLanguage],
	);

	// Fetch categories
	useEffect(() => {
		if (!params.appId) return;
		api.listings
			.categories(params.appId)
			.then((data) => {
				setCategoriesData({
					availableCategories: data.availableCategories as {
						id: string;
						name: string;
					}[],
				});
				setPrimaryCategory(data.primaryCategory ?? "");
				setSecondaryCategory(data.secondaryCategory ?? "");
				setOriginalPrimary(data.primaryCategory ?? "");
				setOriginalSecondary(data.secondaryCategory ?? "");
			})
			.catch(() => {
				// Categories not available (e.g. Android)
			});
	}, [params.appId]);

	const handleSuggestCategory = async () => {
		if (!appData.data) return;
		setIsSuggestingCategory(true);
		try {
			const result = await api.ai.suggestCategory({
				appId: params.appId,
				appName: appData.data.name,
				platform: appData.data.platform,
			});
			setPrimaryCategory(result.primary);
			setSecondaryCategory(result.secondary ?? "");
			toast.success(`AI suggestion: ${result.reasoning}`);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "AI suggestion failed";
			toast.error(message);
		} finally {
			setIsSuggestingCategory(false);
		}
	};

	// Update a field value for a specific language
	const handleFieldChange = useCallback(
		(lang: string, key: string, value: string) => {
			setAllFormData((prev) => ({
				...prev,
				[lang]: { ...prev[lang], [key]: value },
			}));
		},
		[],
	);

	const state = detail.data?.state ?? "";
	const isEditable = EDITABLE_STATES.has(state);

	const categoriesAutoSaveData = useMemo(
		() => ({ primaryCategory, secondaryCategory }),
		[primaryCategory, secondaryCategory],
	);

	useAutoSave({
		data: categoriesAutoSaveData,
		onSave: async (data) => {
			if (!data.primaryCategory) return;
			const result = await api.listings.updateCategories(params.appId, {
				primaryCategory: data.primaryCategory,
				secondaryCategory: data.secondaryCategory || undefined,
			});
			setOriginalPrimary(result.primaryCategory);
			setOriginalSecondary(result.secondaryCategory ?? "");
		},
		enabled: isEditable && !!categoriesData,
	});

	// Convenience: get form data for selected language
	const formData = allFormData[selectedLanguage] ?? {};
	const originalData = allOriginalData[selectedLanguage] ?? {};

	const isWhatsNewEditable =
		WHATS_NEW_EDITABLE_STATES.has(state) ||
		(state === "PREPARE_FOR_SUBMISSION" &&
			!!(formData.whatsNew || originalData.whatsNew));

	// Compute changes across ALL languages
	const allChangedByLang = useMemo(() => {
		const result: Record<string, Record<string, string>> = {};
		for (const lang of Object.keys(allFormData)) {
			const changes = getChangedFields(
				allOriginalData[lang] ?? {},
				allFormData[lang],
			);
			if (changes) {
				result[lang] = changes;
			}
		}
		return result;
	}, [allFormData, allOriginalData]);

	const hasAnyChanges = Object.keys(allChangedByLang).length > 0;

	// Validation for all visible fields (selected language + overrides)
	const fieldErrors = useMemo(() => {
		const errors: Record<string, string | null> = {};
		for (const field of visibleFields) {
			const lang =
				fieldLangOverrides[field.key] || selectedLanguage;
			const value = allFormData[lang]?.[field.key] ?? "";
			errors[field.key] = getFieldError(
				field,
				value,
				isWhatsNewEditable,
				saveAttempted,
			);
		}
		return errors;
	}, [
		allFormData,
		fieldLangOverrides,
		selectedLanguage,
		isWhatsNewEditable,
		saveAttempted,
		visibleFields,
	]);

	const hasValidationErrors = useMemo(
		() => Object.values(fieldErrors).some((e) => e !== null),
		[fieldErrors],
	);

	const handleGenerateField = useCallback(
		async (
			field: ListingFieldName,
			language: string,
			currentValue?: string,
		) => {
			if (!appData.data) return;

			setGeneratingField(field);
			try {
				const result = await api.ai.generateListingField({
					appId: params.appId,
					appName: appData.data.name,
					currentValue: currentValue || undefined,
					field,
					language,
					platform: appData.data.platform,
				});
				setAllFormData((prev) => ({
					...prev,
					[language]: {
						...prev[language],
						[field]: result.result,
					},
				}));
				toast.success(
					`${currentValue ? "Rephrased" : "Generated"} ${field} (${language})`,
				);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "AI generation failed";
				toast.error(message);
			} finally {
				setGeneratingField(null);
			}
		},
		[appData.data, params.appId],
	);

	const handleGenerateAll = useCallback(async () => {
		if (!appData.data) return;

		setIsGeneratingAll(true);

		const fieldsToGenerate = visibleAiFields.filter(
			(field) => !(field === "whatsNew" && !isWhatsNewEditable),
		);

		// Step 1: Generate for current language
		const results = await Promise.allSettled(
			fieldsToGenerate.map(async (field) => {
				const currentValue = formData[field] || undefined;
				const result = await api.ai.generateListingField({
					appId: params.appId,
					appName: appData.data!.name,
					currentValue,
					field,
					language: selectedLanguage,
					platform: appData.data!.platform,
				});
				return { field, value: result.result };
			}),
		);

		let generated = 0;
		const updates: Record<string, string> = {};

		for (let i = 0; i < results.length; i++) {
			const result = results[i];
			if (result.status === "fulfilled") {
				updates[result.value.field] = result.value.value;
				generated++;
			} else {
				const message =
					result.reason instanceof Error
						? result.reason.message
						: "AI generation failed";
				toast.error(`${fieldsToGenerate[i]}: ${message}`);
			}
		}

		if (Object.keys(updates).length > 0) {
			setAllFormData((prev) => ({
				...prev,
				[selectedLanguage]: {
					...prev[selectedLanguage],
					...updates,
				},
			}));
		}

		if (generated > 0) {
			toast.success(`Generated ${generated} field(s) for ${selectedLanguage}`);
		}

		// Step 2: Translate to other languages if scope is "all"
		if (generateScope === "all" && Object.keys(updates).length > 0) {
			const otherLanguages = localizations
				.map((l) => l.language)
				.filter((lang) => lang !== selectedLanguage);

			if (otherLanguages.length > 0) {
				toast.info(
					`Translating to ${otherLanguages.length} other language(s)...`,
				);

				const translateResults = await Promise.allSettled(
					otherLanguages.map(async (targetLang) => {
						const { translations } =
							await api.ai.translateLocalization({
								appId: params.appId,
								appName: appData.data!.name,
								fields: updates,
								platform: appData.data!.platform,
								sourceLanguage: selectedLanguage,
								targetLanguage: targetLang,
							});
						return { language: targetLang, translations };
					}),
				);

				let translated = 0;
				for (const result of translateResults) {
					if (result.status === "fulfilled") {
						const { language, translations } = result.value;
						setAllFormData((prev) => ({
							...prev,
							[language]: {
								...prev[language],
								...translations,
							},
						}));
						translated++;
					} else {
						const message =
							result.reason instanceof Error
								? result.reason.message
								: "Translation failed";
						toast.error(message);
					}
				}

				if (translated > 0) {
					toast.success(
						`Translated to ${translated} language(s)`,
					);
				}
			}
		}

		setGeneratingField(null);
		setIsGeneratingAll(false);
	}, [
		appData.data,
		formData,
		generateScope,
		isWhatsNewEditable,
		localizations,
		params.appId,
		selectedLanguage,
		visibleAiFields,
	]);

	const handleTranslateAllFromLanguage = useCallback(async () => {
		if (!appData.data) return;

		const sourceData = allFormData[selectedLanguage] ?? {};
		const fields: Record<string, string> = {};
		for (const f of visibleAiFields) {
			const val = sourceData[f];
			if (val?.trim()) {
				fields[f] = val;
			}
		}

		if (Object.keys(fields).length === 0) {
			toast.error("No content to translate in the current language");
			return;
		}

		const otherLanguages = localizations
			.map((l) => l.language)
			.filter((lang) => lang !== selectedLanguage);

		if (otherLanguages.length === 0) {
			toast.error("No other languages to translate to");
			return;
		}

		setIsTranslatingAll(true);
		toast.info(
			`Translating from ${selectedLanguage} to ${otherLanguages.length} language(s)...`,
		);

		const results = await Promise.allSettled(
			otherLanguages.map(async (targetLang) => {
				const { translations } =
					await api.ai.translateLocalization({
						appId: params.appId,
						appName: appData.data!.name,
						fields,
						platform: appData.data!.platform,
						sourceLanguage: selectedLanguage,
						targetLanguage: targetLang,
					});
				return { language: targetLang, translations };
			}),
		);

		let translated = 0;
		for (const result of results) {
			if (result.status === "fulfilled") {
				const { language, translations } = result.value;
				setAllFormData((prev) => ({
					...prev,
					[language]: {
						...prev[language],
						...translations,
					},
				}));
				translated++;
			} else {
				const message =
					result.reason instanceof Error
						? result.reason.message
						: "Translation failed";
				toast.error(message);
			}
		}

		if (translated > 0) {
			toast.success(
				`Translated to ${translated} language(s) from ${selectedLanguage}`,
			);
		}

		setIsTranslatingAll(false);
	}, [
		allFormData,
		appData.data,
		localizations,
		params.appId,
		selectedLanguage,
		visibleAiFields,
	]);

	const handleTranslateFieldToAll = useCallback(
		async (field: ListingFieldName, sourceLang: string) => {
			if (!appData.data) return;

			const sourceData = allFormData[sourceLang] ?? {};
			const value = sourceData[field];
			if (!value?.trim()) {
				toast.error(
					`No content in "${field}" for ${sourceLang} to translate`,
				);
				return;
			}

			const otherLanguages = localizations
				.map((l) => l.language)
				.filter((lang) => lang !== sourceLang);

			if (otherLanguages.length === 0) {
				toast.error("No other languages to translate to");
				return;
			}

			setTranslatingField(field);

			const results = await Promise.allSettled(
				otherLanguages.map(async (targetLang) => {
					const { translations } =
						await api.ai.translateLocalization({
							appId: params.appId,
							appName: appData.data!.name,
							fields: { [field]: value },
							platform: appData.data!.platform,
							sourceLanguage: sourceLang,
							targetLanguage: targetLang,
						});
					return {
						language: targetLang,
						value: translations[field] ?? "",
					};
				}),
			);

			let translated = 0;
			for (const result of results) {
				if (result.status === "fulfilled" && result.value.value) {
					const { language, value: translatedValue } = result.value;
					setAllFormData((prev) => ({
						...prev,
						[language]: {
							...prev[language],
							[field]: translatedValue,
						},
					}));
					translated++;
				} else if (result.status === "rejected") {
					const message =
						result.reason instanceof Error
							? result.reason.message
							: "Translation failed";
					toast.error(message);
				}
			}

			if (translated > 0) {
				toast.success(
					`Translated ${field} to ${translated} language(s)`,
				);
			}

			setTranslatingField(null);
		},
		[allFormData, appData.data, localizations, params.appId],
	);

	// Auto-save all changed localizations
	const autoSaveListings = useCallback(async () => {
		if (!hasAnyChanges) return;

		// Validate all languages that have changes
		for (const lang of Object.keys(allChangedByLang)) {
			const langData = allFormData[lang] ?? {};
			const hasErrors = visibleFields.some((f) => {
				const val = langData[f.key] ?? "";
				return getFieldError(f, val, isWhatsNewEditable, true) !== null;
			});
			if (hasErrors) return; // Skip auto-save if validation errors
		}

		let saved = 0;
		for (const lang of Object.keys(allChangedByLang)) {
			const loc = localizations.find((l) => l.language === lang);
			if (!loc) continue;

			const fieldsToSave = { ...allChangedByLang[lang] };
			if (!isWhatsNewEditable) {
				delete fieldsToSave.whatsNew;
			}
			if (Object.keys(fieldsToSave).length === 0) continue;

			await updateLoc.mutateAsync({
				data: fieldsToSave,
				localizationId: loc.localizationId,
			});
			saved++;
		}

		if (saved > 0) {
			setAllOriginalData({ ...allFormData });
			setSaveAttempted(false);
		}
	}, [
		allChangedByLang,
		allFormData,
		hasAnyChanges,
		isWhatsNewEditable,
		localizations,
		updateLoc,
		visibleFields,
	]);

	useAutoSave({
		data: allFormData,
		onSave: () => autoSaveListings(),
		enabled: isEditable && localizations.length > 0,
	});

	const copyrightOverLimit = copyrightValue.length > 255;

	useAutoSave({
		data: copyrightValue,
		onSave: async (value) => {
			if (value.length > 255) return;
			await updateCopyright.mutateAsync(value);
			setOriginalCopyright(value);
		},
		enabled: isEditable,
	});

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
					const loc = localizations.find(
						(l) => l.language === row.language,
					);
					if (!loc) {
						toast.error(
							`Language "${row.language}" not found — skipped`,
						);
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
						if (
							row[key] !== undefined &&
							row[key] !== String(loc[key] ?? "")
						) {
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
				const message =
					err instanceof Error ? err.message : "Import failed";
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
	const hasAnyContent = visibleAiFields.some((f) => !!formData[f]);

	const sortedLocalizations = localizations
		.slice()
		.sort((a, b) => a.language.localeCompare(b.language));

	const listingsMenuActions: ActionsMenuAction[] = [
		...(isEditable && currentLoc
			? [
					{
						key: "generate-all",
						label: hasAnyContent ? "Regenerate All" : "Generate All",
						icon: "sparkles" as const,
						disabled: isGeneratingAll || !!generatingField || isTranslatingAll,
						onSelect: () => setGenerateDialogOpen(true),
					},
				]
			: []),
		...(isEditable && currentLoc && localizations.length > 1 && hasAnyContent
			? [
					{
						key: "translate-all",
						label: `Translate All From ${selectedLanguage}`,
						icon: "languages" as const,
						disabled: isTranslatingAll || isGeneratingAll || !!generatingField,
						onSelect: handleTranslateAllFromLanguage,
					},
				]
			: []),
		{
			key: "sync",
			label: "Sync",
			icon: "sync" as const,
			disabled: syncVersions.isPending,
			onSelect: handleSync,
			separatorBefore: !!(isEditable && currentLoc),
		},
		...(localizations.length > 0
			? [
					{
						key: "export-csv",
						label: "Export CSV",
						icon: "download" as const,
						onSelect: handleExportCsv,
						separatorBefore: true,
					},
					{
						key: "export-json",
						label: "Export JSON",
						icon: "download" as const,
						onSelect: handleExportJson,
					},
					{
						key: "download-template",
						label: "Download Template",
						icon: "download" as const,
						onSelect: handleDownloadTemplate,
					},
				]
			: []),
		...(isEditable
			? [
					{
						key: "import",
						label: "Import",
						icon: "upload" as const,
						disabled: isImporting,
						onSelect: () => {},
						separatorBefore: true,
					},
				]
			: []),
	];

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
					{/* Language selector (master) */}
					{localizations.length > 0 && (
						<Select
							onValueChange={handleLanguageChange}
							value={selectedLanguage}
						>
							<SelectTrigger className="w-[180px]">
								<Globe className="mr-2 h-4 w-4 text-muted-foreground" />
								<SelectValue placeholder="Select language" />
							</SelectTrigger>
							<SelectContent>
								{sortedLocalizations.map((loc) => (
									<SelectItem
										key={loc.language}
										value={loc.language}
									>
										{getLanguageLabel(loc.language)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

						{/* Three-dot menu */}
					<ActionsMenu
						actions={listingsMenuActions}
						importConfig={
							isEditable
								? { accept: ".csv,.json", onChange: handleImport }
								: undefined
						}
					/>
				</div>
			</div>

			{/* Generate All dialog (triggered from menu) */}
			<AlertDialog
				open={generateDialogOpen}
				onOpenChange={(open) => {
					setGenerateDialogOpen(open);
					if (!open) setGenerateScope("current");
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{hasAnyContent
								? "Regenerate all fields?"
								: "Generate all fields?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{hasAnyContent
								? "AI will regenerate all listing fields based on your ASO profile. Existing content will be used as context for rephrasing."
								: "AI will generate all listing fields from scratch based on your ASO profile. Make sure you have configured it first."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{localizations.length > 1 && (
						<RadioGroup
							value={generateScope}
							onValueChange={(v) =>
								setGenerateScope(v as "current" | "all")
							}
							className="gap-3"
						>
							<div className="flex items-center gap-2">
								<RadioGroupItem
									value="current"
									id="scope-current"
								/>
								<Label
									htmlFor="scope-current"
									className="font-normal cursor-pointer"
								>
									Current language only ({selectedLanguage})
								</Label>
							</div>
							<div className="flex items-center gap-2">
								<RadioGroupItem
									value="all"
									id="scope-all"
								/>
								<Label
									htmlFor="scope-all"
									className="font-normal cursor-pointer"
								>
									All languages (generate + translate to{" "}
									{localizations.length - 1} other)
								</Label>
							</div>
						</RadioGroup>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								handleGenerateAll();
								setGenerateDialogOpen(false);
							}}
						>
							{hasAnyContent ? "Regenerate" : "Generate"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Copyright (version-level, not language-dependent, iOS only) */}
			{(!capData || capData.publishing.hasVersions) && <div className="max-w-2xl space-y-1.5">
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
			</div>}

			{/* Categories (app-level, not language-dependent, iOS only) */}
			{(!capData || capData.categories.supported) &&
				categoriesData &&
				categoriesData.availableCategories.length > 0 && (
					<div className="max-w-2xl space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-medium">
								Categories
							</Label>
							<div className="flex items-center gap-2">
								{isEditable && (
									<Button
										className="h-7 px-2 text-xs gap-1"
										disabled={isSuggestingCategory}
										onClick={handleSuggestCategory}
										size="sm"
										variant="outline"
									>
										{isSuggestingCategory ? (
											<Loader2 className="h-3 w-3 animate-spin" />
										) : (
											<Sparkles className="h-3 w-3" />
										)}
										Choose with AI
									</Button>
								)}
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label className="text-xs text-muted-foreground">
									Primary Category
								</Label>
								<Select
									disabled={!isEditable}
									onValueChange={setPrimaryCategory}
									value={primaryCategory}
								>
									<SelectTrigger className="bg-[#1a1a1a] border-border">
										<SelectValue placeholder="Select category" />
									</SelectTrigger>
									<SelectContent>
										{categoriesData.availableCategories.map(
											(cat) => (
												<SelectItem
													key={cat.id}
													value={cat.id}
												>
													{cat.name}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs text-muted-foreground">
									Secondary Category
								</Label>
								<div className="flex items-center gap-2">
									<Select
										disabled={!isEditable}
										onValueChange={setSecondaryCategory}
										value={secondaryCategory}
									>
										<SelectTrigger className="bg-[#1a1a1a] border-border">
											<SelectValue placeholder="None (optional)" />
										</SelectTrigger>
										<SelectContent>
											{categoriesData.availableCategories
												.filter(
													(cat) =>
														cat.id !==
														primaryCategory,
												)
												.map((cat) => (
													<SelectItem
														key={cat.id}
														value={cat.id}
													>
														{cat.name}
													</SelectItem>
												))}
										</SelectContent>
									</Select>
									{secondaryCategory && isEditable && (
										<Button
											className="h-9 w-9 shrink-0"
											onClick={() =>
												setSecondaryCategory("")
											}
											size="icon"
											variant="ghost"
										>
											<X className="h-4 w-4" />
										</Button>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

			{/* No localizations */}
			{localizations.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No localizations found. Add languages in the Languages tab
					first.
				</p>
			) : !currentLoc ? (
				<p className="text-sm text-muted-foreground">
					Select a language to view its listing.
				</p>
			) : (
				<div className="max-w-2xl space-y-6">
					{visibleFields.map((field) => {
						const activeLang =
							fieldLangOverrides[field.key] ||
							selectedLanguage;
						const langData =
							allFormData[activeLang] ?? {};
						const value = langData[field.key] ?? "";
						const charCount = value.length;
						const isOverLimit =
							charCount > field.maxLength;
						const error = fieldErrors[field.key];
						const isFieldDisabled =
							!isEditable ||
							(field.key === "whatsNew" &&
								!isWhatsNewEditable);
						const hasError = !!error;
						const isAiField = visibleAiFields.includes(
							field.key as ListingFieldName,
						);
						const isFieldGenerating =
							generatingField === field.key;

						return (
							<div
								className="space-y-1.5"
								key={field.key}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5">
										{/* Vertical 3-dot AI menu */}
										{isAiField &&
											isEditable &&
											!isFieldDisabled && (
												<DropdownMenu>
													<DropdownMenuTrigger
														asChild
													>
														<Button
															className="h-6 w-6 p-0"
															disabled={
																isFieldGenerating ||
																isGeneratingAll ||
																isTranslatingAll ||
																translatingField === field.key
															}
															size="sm"
															variant="ghost"
														>
															{isFieldGenerating ||
															translatingField ===
																field.key ? (
																<Loader2 className="h-3.5 w-3.5 animate-spin" />
															) : (
																<MoreVertical className="h-3.5 w-3.5" />
															)}
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="start">
														<DropdownMenuItem
															onSelect={() =>
																setAiConfirm(
																	{
																		field: field.key as ListingFieldName,
																		label: field.label,
																		mode: "generate",
																		language:
																			activeLang,
																	},
																)
															}
														>
															<Sparkles className="mr-2 h-3.5 w-3.5" />
															Generate
														</DropdownMenuItem>
														{value && (
															<DropdownMenuItem
																onSelect={() =>
																	setAiConfirm(
																		{
																			field: field.key as ListingFieldName,
																			label: field.label,
																			mode: "rephrase",
																			language:
																				activeLang,
																		},
																	)
																}
															>
																<RefreshCw className="mr-2 h-3.5 w-3.5" />
																Rephrase
															</DropdownMenuItem>
														)}
														{value &&
															localizations.length >
																1 && (
																<DropdownMenuItem
																	disabled={
																		translatingField ===
																		field.key
																	}
																	onSelect={() =>
																		handleTranslateFieldToAll(
																			field.key as ListingFieldName,
																			activeLang,
																		)
																	}
																>
																	<Languages className="mr-2 h-3.5 w-3.5" />
																	Translate From {activeLang} to All
																</DropdownMenuItem>
															)}
													</DropdownMenuContent>
												</DropdownMenu>
											)}
										<Label
											className="text-sm font-medium"
											htmlFor={field.key}
										>
											{field.label}
										</Label>
										{/* Per-field language chips */}
										{localizations.length > 1 && (
											<div className="flex gap-1 overflow-x-auto scrollbar-thin">
												{sortedLocalizations.map(
													(loc) => (
														<button
															className={cn(
																"shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
																loc.language ===
																	activeLang
																	? "bg-primary text-primary-foreground"
																	: "bg-muted text-muted-foreground hover:bg-muted/80",
															)}
															key={
																loc.language
															}
															onClick={() =>
																handleFieldLangChange(
																	field.key,
																	loc.language,
																)
															}
															type="button"
														>
															{loc.language}
														</button>
													),
												)}
											</div>
										)}
									</div>
									<span
										className={cn(
											"text-xs tabular-nums",
											isOverLimit
												? "text-destructive font-medium"
												: "text-muted-foreground",
										)}
									>
										{charCount}/
										{field.maxLength}
									</span>
								</div>

								<div className="relative">
									{(isGeneratingAll || isTranslatingAll || translatingField === field.key) &&
										isAiField && (
											<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60 backdrop-blur-[1px]">
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<Loader2 className="h-3.5 w-3.5 animate-spin" />
													{isTranslatingAll || translatingField === field.key
														? "Translating..."
														: "Generating..."}
												</div>
											</div>
										)}
									{field.multiline ? (
										<Textarea
											className={cn(
												"resize-none bg-[#1a1a1a] border-border",
												hasError &&
													"border-destructive",
											)}
											disabled={
												isFieldDisabled
											}
											id={field.key}
											onChange={(e) =>
												handleFieldChange(
													activeLang,
													field.key,
													e.target.value,
												)
											}
											placeholder={
												field.placeholder
											}
											rows={
												field.rows ?? 4
											}
											value={value}
										/>
									) : (
										<Input
											className={cn(
												"bg-[#1a1a1a] border-border",
												hasError &&
													"border-destructive",
											)}
											disabled={
												isFieldDisabled
											}
											id={field.key}
											onChange={(e) =>
												handleFieldChange(
													activeLang,
													field.key,
													e.target.value,
												)
											}
											placeholder={
												field.placeholder
											}
											value={value}
										/>
									)}
								</div>

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

					{/* AI confirmation dialog */}
					<AlertDialog
						onOpenChange={(open) => {
							if (!open) setAiConfirm(null);
						}}
						open={!!aiConfirm}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{aiConfirm?.mode === "rephrase"
										? `Rephrase ${aiConfirm?.label}?`
										: `Generate ${aiConfirm?.label}?`}
								</AlertDialogTitle>
								<AlertDialogDescription>
									{aiConfirm?.mode === "rephrase"
										? `AI will rephrase the current content (${aiConfirm?.language}) to improve ASO effectiveness while keeping the same meaning and language.`
										: `AI will generate new content for ${aiConfirm?.label.toLowerCase()} (${aiConfirm?.language}) based on your ASO profile.${allFormData[aiConfirm?.language ?? ""]?.[aiConfirm?.field ?? ""] ? " This will replace the current content." : ""}`}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										if (!aiConfirm) return;
										const currentVal =
											allFormData[
												aiConfirm.language
											]?.[aiConfirm.field] ||
											undefined;
										handleGenerateField(
											aiConfirm.field,
											aiConfirm.language,
											aiConfirm.mode ===
												"rephrase"
												? currentVal
												: undefined,
										);
									}}
								>
									{aiConfirm?.mode === "rephrase"
										? "Rephrase"
										: "Generate"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			)}
		</div>
	);
}
