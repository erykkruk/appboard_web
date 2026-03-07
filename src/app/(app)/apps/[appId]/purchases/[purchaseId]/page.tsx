"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Globe, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { InheritToggle } from "@/components/purchases/inherit-toggle";
import { MetadataGrid } from "@/components/purchases/metadata-grid";
import { PricesTable } from "@/components/purchases/prices-table";
import { TerritorySelector } from "@/components/purchases/territory-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
	usePurchase,
	usePurchaseAvailability,
	usePurchaseReviewInfo,
	useUpdateFamilySharing,
	useUpdatePurchase,
	useUpdatePurchaseAvailability,
	useUpdatePurchaseReviewInfo,
} from "@/hooks/use-purchases";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
	approved: "bg-green-500/10 text-green-500",
	draft: "bg-yellow-500/10 text-yellow-500",
	in_review: "bg-blue-500/10 text-blue-500",
	rejected: "bg-red-500/10 text-red-500",
	removed: "bg-muted text-muted-foreground",
	waiting_for_review: "bg-blue-500/10 text-blue-500",
};

const TYPE_LABELS: Record<string, string> = {
	auto_renewable: "Auto-Renewable Subscription",
	consumable: "Consumable",
	non_consumable: "Non-Consumable",
	non_renewing: "Non-Renewing Subscription",
};

const DURATION_LABELS: Record<string, string> = {
	P1W: "1 Week",
	P1M: "1 Month",
	P2M: "2 Months",
	P3M: "3 Months",
	P6M: "6 Months",
	P1Y: "1 Year",
};

export default function PurchaseDetailPage() {
	const { appId, purchaseId } = useParams<{
		appId: string;
		purchaseId: string;
	}>();
	const { data: purchase, isLoading } = usePurchase(appId, purchaseId);
	const updatePurchase = useUpdatePurchase(appId);
	const updateFamilySharing = useUpdateFamilySharing(appId);

	const [name, setName] = useState("");
	const [nameInitialized, setNameInitialized] = useState(false);
	const [localizations, setLocalizations] = useState<
		Record<string, { name: string; description: string }>
	>({});
	const [locsInitialized, setLocsInitialized] = useState(false);
	const [activeLocale, setActiveLocale] = useState<string>("");

	// Initialize name from fetched data
	if (purchase && !nameInitialized) {
		setName(purchase.name);
		setNameInitialized(true);
	}

	// Initialize localizations from fetched data
	if (purchase && !locsInitialized) {
		const locs: Record<string, { name: string; description: string }> = {};
		for (const l of purchase.localizations) {
			locs[l.language] = {
				name: l.name ?? "",
				description: l.description ?? "",
			};
		}
		setLocalizations(locs);
		if (purchase.localizations.length > 0) {
			setActiveLocale(purchase.localizations[0].language);
		}
		setLocsInitialized(true);
	}

	// Auto-save name
	const handleSaveName = useCallback(
		async (data: string) => {
			await updatePurchase.mutateAsync({
				purchaseId,
				data: { name: data },
			});
		},
		[purchaseId, updatePurchase],
	);

	useAutoSave({
		data: name,
		onSave: handleSaveName,
		enabled: nameInitialized && name.trim().length > 0,
	});

	// Auto-save localizations
	const handleSaveLocs = useCallback(
		async (data: Record<string, { name: string; description: string }>) => {
			const locsArray = Object.entries(data).map(([language, loc]) => ({
				language,
				name: loc.name || undefined,
				description: loc.description || undefined,
			}));
			await updatePurchase.mutateAsync({
				purchaseId,
				data: { localizations: locsArray },
			});
		},
		[purchaseId, updatePurchase],
	);

	useAutoSave({
		data: localizations,
		onSave: handleSaveLocs,
		enabled: locsInitialized,
	});

	const updateLocField = (
		lang: string,
		field: "name" | "description",
		value: string,
	) => {
		setLocalizations((prev) => ({
			...prev,
			[lang]: { ...prev[lang], [field]: value },
		}));
	};

	const addLanguage = () => {
		const lang = prompt("Enter language code (e.g. en-US, pl, de):");
		if (!lang || localizations[lang]) return;
		setLocalizations((prev) => ({
			...prev,
			[lang]: { name: "", description: "" },
		}));
		setActiveLocale(lang);
	};

	const removeLanguage = (lang: string) => {
		setLocalizations((prev) => {
			const next = { ...prev };
			delete next[lang];
			return next;
		});
		const remaining = Object.keys(localizations).filter((l) => l !== lang);
		setActiveLocale(remaining[0] ?? "");
	};

	const isSubscription =
		purchase?.productType === "auto_renewable" ||
		purchase?.productType === "non_renewing";

	const isAutoRenewable = purchase?.productType === "auto_renewable";

	const localeKeys = useMemo(
		() => Object.keys(localizations),
		[localizations],
	);

	const handleFamilySharingToggle = async (checked: boolean) => {
		try {
			await updateFamilySharing.mutateAsync({
				purchaseId,
				familySharable: checked,
			});
			toast.success(
				checked ? "Family Sharing enabled" : "Family Sharing disabled",
			);
		} catch {
			toast.error("Failed to update Family Sharing");
		}
	};

	const metadataItems = purchase
		? [
				{
					label: "Product ID",
					value: purchase.productId,
				},
				{
					label: "Type",
					value: TYPE_LABELS[purchase.productType] ?? purchase.productType,
				},
				{
					label: "Apple ID",
					value: purchase.externalId,
				},
				...(isSubscription && purchase.duration
					? [
							{
								label: "Duration",
								value:
									DURATION_LABELS[purchase.duration] ??
									purchase.duration,
							},
						]
					: []),
				...(isSubscription && purchase.groupId
					? [
							{
								label: "Subscription Group",
								value: "View Group",
								href: `/apps/${appId}/subscription-groups/${purchase.groupId}`,
							},
						]
					: []),
			]
		: [];

	if (isLoading) {
		return (
			<div className="mx-auto max-w-4xl space-y-4 p-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-40 rounded-xl" />
				<Skeleton className="h-60 rounded-xl" />
			</div>
		);
	}

	if (!purchase) {
		return (
			<div className="mx-auto max-w-4xl p-6">
				<p className="text-sm text-muted-foreground">Purchase not found.</p>
			</div>
		);
	}

	const statusClass =
		STATUS_COLORS[purchase.status] ?? "bg-muted text-muted-foreground";

	return (
		<div className="mx-auto max-w-4xl space-y-6 p-6">
			{/* Breadcrumb */}
			<nav className="flex items-center gap-1 text-sm text-muted-foreground">
				<Link
					href={`/apps/${appId}/purchases`}
					className="hover:text-foreground"
				>
					Purchases
				</Link>
				<ChevronRight className="h-3.5 w-3.5" />
				<span className="text-foreground">{purchase.name}</span>
			</nav>

			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 space-y-2">
					<div className="flex items-center gap-3">
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="h-9 max-w-sm text-lg font-semibold"
							placeholder="Reference Name"
						/>
						<Badge className={cn("shrink-0 text-xs", statusClass)}>
							{purchase.status}
						</Badge>
					</div>
				</div>
			</div>

			{/* Metadata */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Details</CardTitle>
				</CardHeader>
				<CardContent>
					<MetadataGrid items={metadataItems} />
					{/* Family Sharing toggle - only for auto-renewable subscriptions */}
					{isAutoRenewable && (
						<div className="mt-4 flex items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<Label className="text-sm font-medium">
									Family Sharing
								</Label>
								<p className="text-xs text-muted-foreground">
									Allow family members to share this
									subscription.
								</p>
							</div>
							<Switch
								checked={purchase.familySharable}
								onCheckedChange={handleFamilySharingToggle}
								disabled={updateFamilySharing.isPending}
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Localizations */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Localizations</CardTitle>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs"
							onClick={addLanguage}
						>
							<Plus className="mr-1 h-3 w-3" />
							Add Language
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{localeKeys.length === 0 ? (
						<p className="py-4 text-center text-sm text-muted-foreground">
							No localizations. Click &ldquo;Add Language&rdquo; to get started.
						</p>
					) : (
						<Tabs
							value={activeLocale}
							onValueChange={setActiveLocale}
						>
							<div className="flex items-center gap-2">
								<TabsList className="flex-wrap">
									{localeKeys.map((lang) => (
										<TabsTrigger
											key={lang}
											value={lang}
											className="gap-1 uppercase"
										>
											<Globe className="h-3 w-3" />
											{lang}
										</TabsTrigger>
									))}
								</TabsList>
							</div>
							{localeKeys.map((lang) => (
								<TabsContent
									key={lang}
									value={lang}
									className="mt-4 space-y-4"
								>
									<div className="space-y-2">
										<label className="text-xs font-medium text-muted-foreground">
											Display Name
										</label>
										<Input
											value={
												localizations[lang]?.name ?? ""
											}
											onChange={(e) =>
												updateLocField(
													lang,
													"name",
													e.target.value,
												)
											}
											placeholder="Display name for this language"
										/>
									</div>
									<div className="space-y-2">
										<label className="text-xs font-medium text-muted-foreground">
											Description
										</label>
										<Textarea
											value={
												localizations[lang]
													?.description ?? ""
											}
											onChange={(e) =>
												updateLocField(
													lang,
													"description",
													e.target.value,
												)
											}
											placeholder="Description for this language"
											rows={3}
										/>
									</div>
									<div className="flex justify-end">
										<Button
											variant="ghost"
											size="sm"
											className="h-7 text-xs text-destructive hover:text-destructive"
											onClick={() =>
												removeLanguage(lang)
											}
										>
											<Trash2 className="mr-1 h-3 w-3" />
											Remove {lang}
										</Button>
									</div>
								</TabsContent>
							))}
						</Tabs>
					)}
				</CardContent>
			</Card>

			{/* Prices */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Prices</CardTitle>
				</CardHeader>
				<CardContent>
					<PricesTable prices={purchase.prices} />
				</CardContent>
			</Card>

			{/* Availability - only for subscriptions */}
			{isSubscription && (
				<PurchaseAvailabilitySection
					appId={appId}
					purchaseId={purchaseId}
					groupId={purchase.groupId}
				/>
			)}

			{/* Review Info - only for subscriptions */}
			{isSubscription && (
				<PurchaseReviewInfoSection
					appId={appId}
					purchaseId={purchaseId}
					groupId={purchase.groupId}
				/>
			)}
		</div>
	);
}

// --- Purchase Availability Section ---
function PurchaseAvailabilitySection({
	appId,
	purchaseId,
	groupId,
}: {
	appId: string;
	purchaseId: string;
	groupId?: string | null;
}) {
	const { data: territories, isLoading } = usePurchaseAvailability(appId, purchaseId);
	const updateAvailability = useUpdatePurchaseAvailability(appId, purchaseId);
	const [selected, setSelected] = useState<string[]>([]);
	const [useGroupDefault, setUseGroupDefault] = useState(true);
	const [initialized, setInitialized] = useState(false);

	if (territories !== undefined && !initialized) {
		if (territories === null) {
			setUseGroupDefault(true);
			setSelected([]);
		} else {
			setUseGroupDefault(false);
			setSelected(territories);
		}
		setInitialized(true);
	}

	const handleToggleInherit = async (inherit: boolean) => {
		setUseGroupDefault(inherit);
		if (inherit) {
			try {
				await updateAvailability.mutateAsync(null);
				toast.success("Using group availability");
			} catch {
				toast.error("Failed to update availability");
			}
		}
	};

	const handleSave = async () => {
		try {
			await updateAvailability.mutateAsync(selected);
			toast.success("Availability updated");
		} catch {
			toast.error("Failed to update availability");
		}
	};

	if (isLoading) {
		return <Skeleton className="h-40 rounded-xl" />;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">Availability</CardTitle>
					{!useGroupDefault && (
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={handleSave}
							disabled={updateAvailability.isPending}
						>
							{updateAvailability.isPending ? (
								<Loader2 className="mr-1 h-3 w-3 animate-spin" />
							) : (
								<Save className="mr-1 h-3 w-3" />
							)}
							Save
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{groupId && (
					<InheritToggle
						useDefault={useGroupDefault}
						onChange={handleToggleInherit}
						label="Use group availability"
						description="When enabled, this subscription uses the availability settings from its subscription group."
						groupHref={`/apps/${appId}/subscription-groups/${groupId}?tab=availability`}
					/>
				)}
				{!useGroupDefault && (
					<TerritorySelector
						selected={selected}
						onChange={setSelected}
						disabled={updateAvailability.isPending}
					/>
				)}
			</CardContent>
		</Card>
	);
}

// --- Purchase Review Info Section ---
function PurchaseReviewInfoSection({
	appId,
	purchaseId,
	groupId,
}: {
	appId: string;
	purchaseId: string;
	groupId?: string | null;
}) {
	const { data: reviewInfo, isLoading } = usePurchaseReviewInfo(appId, purchaseId);
	const updateReviewInfo = useUpdatePurchaseReviewInfo(appId, purchaseId);
	const [notes, setNotes] = useState("");
	const [screenshotUrl, setScreenshotUrl] = useState("");
	const [useGroupDefault, setUseGroupDefault] = useState(true);
	const [initialized, setInitialized] = useState(false);

	if (reviewInfo !== undefined && !initialized) {
		if (reviewInfo === null || reviewInfo.useGroupDefault) {
			setUseGroupDefault(true);
		} else {
			setUseGroupDefault(false);
			setNotes(reviewInfo.reviewNotes ?? "");
			setScreenshotUrl(reviewInfo.screenshotUrl ?? "");
		}
		setInitialized(true);
	}

	const handleToggleInherit = async (inherit: boolean) => {
		setUseGroupDefault(inherit);
		if (inherit) {
			try {
				await updateReviewInfo.mutateAsync({ useGroupDefault: true });
				toast.success("Using group review info");
			} catch {
				toast.error("Failed to update review info");
			}
		}
	};

	const handleSave = async () => {
		try {
			await updateReviewInfo.mutateAsync({
				reviewNotes: notes || null,
				screenshotUrl: screenshotUrl || null,
				useGroupDefault: false,
			});
			toast.success("Review info updated");
		} catch {
			toast.error("Failed to update review info");
		}
	};

	if (isLoading) {
		return <Skeleton className="h-40 rounded-xl" />;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">Review Information</CardTitle>
					{!useGroupDefault && (
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={handleSave}
							disabled={updateReviewInfo.isPending}
						>
							{updateReviewInfo.isPending ? (
								<Loader2 className="mr-1 h-3 w-3 animate-spin" />
							) : (
								<Save className="mr-1 h-3 w-3" />
							)}
							Save
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{groupId && (
					<InheritToggle
						useDefault={useGroupDefault}
						onChange={handleToggleInherit}
						label="Use group review info"
						description="When enabled, this subscription uses the review information from its subscription group."
						groupHref={`/apps/${appId}/subscription-groups/${groupId}?tab=review-info`}
					/>
				)}
				{!useGroupDefault && (
					<>
						<div className="space-y-2">
							<Label>Review Notes</Label>
							<Textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Notes for the App Store review team..."
								rows={4}
							/>
							<p className="text-xs text-muted-foreground">
								Provide any information that may help the review
								team understand this subscription.
							</p>
						</div>
						<div className="space-y-2">
							<Label>Screenshot URL</Label>
							<Input
								value={screenshotUrl}
								onChange={(e) =>
									setScreenshotUrl(e.target.value)
								}
								placeholder="https://example.com/screenshot.png"
							/>
							<p className="text-xs text-muted-foreground">
								URL to a screenshot demonstrating the
								subscription experience.
							</p>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
