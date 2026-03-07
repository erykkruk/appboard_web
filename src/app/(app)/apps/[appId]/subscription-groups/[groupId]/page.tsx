"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
	ChevronRight,
	CreditCard,
	Globe,
	Loader2,
	MessageSquare,
	Plus,
	Repeat,
	Save,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { MonetizationChat } from "@/components/monetization-planner/monetization-chat";
import { AiFieldAction } from "@/components/purchases/ai-field-action";
import { PurchaseQuickAction } from "@/components/purchases/purchase-quick-action";
import { TerritorySelector } from "@/components/purchases/territory-selector";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/hooks/use-apps";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
	useCreateSubscription,
	useDeleteGroup,
	useDeleteGroupLocalization,
	useGroupAvailability,
	useGroupLocalizations,
	useGroupReviewInfo,
	useSubscriptionGroup,
	useUpdateGroup,
	useUpdateGroupAvailability,
	useUpdateGroupReviewInfo,
	useUpsertGroupLocalizations,
} from "@/hooks/use-purchases";
import { cn, sortPricesByCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
	approved: "bg-green-500/10 text-green-500",
	draft: "bg-yellow-500/10 text-yellow-500",
	in_review: "bg-blue-500/10 text-blue-500",
	rejected: "bg-red-500/10 text-red-500",
	removed: "bg-muted text-muted-foreground",
	waiting_for_review: "bg-blue-500/10 text-blue-500",
};

const DURATION_LABELS: Record<string, string> = {
	P1W: "1 Week",
	P1M: "1 Month",
	P2M: "2 Months",
	P3M: "3 Months",
	P6M: "6 Months",
	P1Y: "1 Year",
};

const DURATION_OPTIONS = [
	{ label: "1 Week", value: "P1W" },
	{ label: "1 Month", value: "P1M" },
	{ label: "2 Months", value: "P2M" },
	{ label: "3 Months", value: "P3M" },
	{ label: "6 Months", value: "P6M" },
	{ label: "1 Year", value: "P1Y" },
];

export default function SubscriptionGroupDetailPage() {
	const { appId, groupId } = useParams<{
		appId: string;
		groupId: string;
	}>();
	const router = useRouter();
	const searchParams = useSearchParams();
	const defaultTab = searchParams.get("tab") || "subscriptions";
	const { data: group, isLoading } = useSubscriptionGroup(appId, groupId);
	const { data: app } = useApp(appId);
	const updateGroup = useUpdateGroup(appId);
	const deleteGroup = useDeleteGroup(appId);
	const appName = app?.name ?? "";

	const [name, setName] = useState("");
	const [nameInitialized, setNameInitialized] = useState(false);
	const [showCreateSub, setShowCreateSub] = useState(false);
	const [showChat, setShowChat] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	// Initialize name from fetched data
	if (group && !nameInitialized) {
		setName(group.name);
		setNameInitialized(true);
	}

	// Auto-save name
	const handleSaveName = useCallback(
		async (data: string) => {
			await updateGroup.mutateAsync({
				groupId,
				data: { name: data },
			});
		},
		[groupId, updateGroup],
	);

	useAutoSave({
		data: name,
		onSave: handleSaveName,
		enabled: nameInitialized && name.trim().length > 0,
	});

	if (isLoading) {
		return (
			<div className="mx-auto max-w-4xl space-y-4 p-6">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-40 rounded-xl" />
			</div>
		);
	}

	if (!group) {
		return (
			<div className="mx-auto max-w-4xl p-6">
				<p className="text-sm text-muted-foreground">
					Subscription group not found.
				</p>
			</div>
		);
	}

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
				<span className="text-foreground">{group.name}</span>
			</nav>

			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="h-9 max-w-sm text-lg font-semibold"
						placeholder="Group Name"
					/>
					<AiFieldAction
						appId={appId}
						field="groupName"
						context={{ appName, groupName: name }}
						currentValue={name}
						onResult={setName}
					/>
					<Badge variant="outline" className="shrink-0 text-xs">
						{group.subscriptions.length} subscription
						{group.subscriptions.length !== 1 ? "s" : ""}
					</Badge>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowChat(true)}
					>
						<MessageSquare className="mr-1.5 h-3.5 w-3.5" />
						AI Chat
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-destructive hover:text-destructive"
						onClick={() => setShowDeleteDialog(true)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete subscription group?</AlertDialogTitle>
						<AlertDialogDescription>
							This will delete the subscription group &ldquo;{group.name}&rdquo;
							and all its subscriptions from the store and local database.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								try {
									await deleteGroup.mutateAsync(groupId);
									toast.success(`Deleted group "${group.name}"`);
									router.push(`/apps/${appId}/purchases`);
								} catch {
									toast.error("Failed to delete subscription group");
								}
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteGroup.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* AI Quick Action */}
			<PurchaseQuickAction
				appId={appId}
				focusContext={{
					id: group.id,
					name: group.name,
					type: "group",
				}}
			/>

			<MonetizationChat
				appId={appId}
				open={showChat}
				onOpenChange={setShowChat}
			/>

			{/* Tabs */}
			<Tabs defaultValue={defaultTab}>
				<TabsList>
					<TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
					<TabsTrigger value="localizations">Localizations</TabsTrigger>
					<TabsTrigger value="availability">Availability</TabsTrigger>
					<TabsTrigger value="review-info">Review Info</TabsTrigger>
				</TabsList>

				<TabsContent value="subscriptions" className="mt-4">
					<SubscriptionsTab
						appId={appId}
						groupId={groupId}
						group={group}
						router={router}
						showCreateSub={showCreateSub}
						setShowCreateSub={setShowCreateSub}
					/>
				</TabsContent>

				<TabsContent value="localizations" className="mt-4">
					<GroupLocalizationsTab appId={appId} groupId={groupId} appName={appName} groupName={name} />
				</TabsContent>

				<TabsContent value="availability" className="mt-4">
					<GroupAvailabilityTab appId={appId} groupId={groupId} />
				</TabsContent>

				<TabsContent value="review-info" className="mt-4">
					<GroupReviewInfoTab appId={appId} groupId={groupId} appName={appName} groupName={name} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

// --- Subscriptions Tab ---
function SubscriptionsTab({
	appId,
	groupId,
	group,
	router,
	showCreateSub,
	setShowCreateSub,
}: {
	appId: string;
	groupId: string;
	group: { subscriptions: Array<{ id: string; name: string; productId: string; status: string; duration: string | null; prices: Array<{ id: string; price: string; currency: string }> }> };
	router: ReturnType<typeof useRouter>;
	showCreateSub: boolean;
	setShowCreateSub: (v: boolean) => void;
}) {
	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm">Subscriptions</CardTitle>
						<Button
							variant="outline"
							size="sm"
							className="h-7"
							onClick={() => setShowCreateSub(true)}
						>
							<Plus className="mr-1 h-3.5 w-3.5" />
							Add Subscription
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{group.subscriptions.length === 0 && (
						<div className="flex flex-col items-center justify-center gap-2 py-8">
							<Repeat className="h-8 w-8 text-muted-foreground" />
							<p className="text-sm text-muted-foreground">
								No subscriptions in this group.
							</p>
						</div>
					)}
					{group.subscriptions.map((sub) => {
						const statusClass =
							STATUS_COLORS[sub.status] ??
							"bg-muted text-muted-foreground";
						return (
							<div
								key={sub.id}
								className="cursor-pointer rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
								onClick={() =>
									router.push(
										`/apps/${appId}/purchases/${sub.id}`,
									)
								}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">
											{sub.name}
										</p>
										<p className="text-xs text-muted-foreground">
											{sub.productId}
										</p>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										{sub.duration && (
											<Badge
												variant="outline"
												className="text-xs"
											>
												{DURATION_LABELS[
													sub.duration
												] ?? sub.duration}
											</Badge>
										)}
										<Badge
											className={cn(
												"text-xs",
												statusClass,
											)}
										>
											{sub.status}
										</Badge>
									</div>
								</div>
								{sub.prices.length > 0 && (
									<div className="mt-2 flex flex-wrap gap-2">
										<CreditCard className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
										{sortPricesByCurrency(sub.prices).slice(0, 3).map((p) => (
											<span
												key={p.id}
												className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums"
											>
												{p.price} {p.currency}
											</span>
										))}
										{sub.prices.length > 3 && (
											<span className="text-xs text-muted-foreground">
												+{sub.prices.length - 3} more
											</span>
										)}
									</div>
								)}
							</div>
						);
					})}
				</CardContent>
			</Card>

			<CreateSubscriptionInGroupDialog
				open={showCreateSub}
				onOpenChange={setShowCreateSub}
				appId={appId}
				groupId={groupId}
			/>
		</>
	);
}

// --- Group Localizations Tab ---
function GroupLocalizationsTab({
	appId,
	groupId,
	appName,
	groupName,
}: {
	appId: string;
	groupId: string;
	appName: string;
	groupName: string;
}) {
	const { data: localizations, isLoading } = useGroupLocalizations(appId, groupId);
	const upsertLocs = useUpsertGroupLocalizations(appId, groupId);
	const deleteLoc = useDeleteGroupLocalization(appId, groupId);

	const [localEdits, setLocalEdits] = useState<
		Record<string, { name: string; description: string }>
	>({});
	const [initialized, setInitialized] = useState(false);
	const [activeLocale, setActiveLocale] = useState("");

	if (localizations && !initialized) {
		const edits: Record<string, { name: string; description: string }> = {};
		for (const l of localizations) {
			edits[l.language] = {
				name: l.name ?? "",
				description: l.description ?? "",
			};
		}
		setLocalEdits(edits);
		if (localizations.length > 0) {
			setActiveLocale(localizations[0].language);
		}
		setInitialized(true);
	}

	const localeKeys = Object.keys(localEdits);

	const addLanguage = () => {
		const lang = prompt("Enter language code (e.g. en-US, pl, de):");
		if (!lang || localEdits[lang]) return;
		setLocalEdits((prev) => ({
			...prev,
			[lang]: { name: "", description: "" },
		}));
		setActiveLocale(lang);
	};

	const removeLanguage = async (lang: string) => {
		try {
			await deleteLoc.mutateAsync(lang);
			setLocalEdits((prev) => {
				const next = { ...prev };
				delete next[lang];
				return next;
			});
			const remaining = localeKeys.filter((l) => l !== lang);
			setActiveLocale(remaining[0] ?? "");
			toast.success(`Removed localization for ${lang}`);
		} catch {
			toast.error("Failed to remove localization");
		}
	};

	const handleSave = async () => {
		const locsArray = Object.entries(localEdits).map(([language, loc]) => ({
			language,
			name: loc.name || null,
			description: loc.description || null,
		}));
		try {
			await upsertLocs.mutateAsync(locsArray);
			toast.success("Localizations saved");
		} catch {
			toast.error("Failed to save localizations");
		}
	};

	if (isLoading) {
		return <Skeleton className="h-40 rounded-xl" />;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">Group Localizations</CardTitle>
					<div className="flex gap-2">
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-xs"
							onClick={addLanguage}
						>
							<Plus className="mr-1 h-3 w-3" />
							Add Language
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={handleSave}
							disabled={upsertLocs.isPending}
						>
							{upsertLocs.isPending ? (
								<Loader2 className="mr-1 h-3 w-3 animate-spin" />
							) : (
								<Save className="mr-1 h-3 w-3" />
							)}
							Save
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{localeKeys.length === 0 ? (
					<p className="py-4 text-center text-sm text-muted-foreground">
						No localizations. Click &ldquo;Add Language&rdquo; to get started.
					</p>
				) : (
					<Tabs value={activeLocale} onValueChange={setActiveLocale}>
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
						{localeKeys.map((lang) => (
							<TabsContent
								key={lang}
								value={lang}
								className="mt-4 space-y-4"
							>
								<div className="space-y-2">
									<div className="flex items-center gap-1">
										<label className="text-xs font-medium text-muted-foreground">
											Display Name
										</label>
										<AiFieldAction
											appId={appId}
											field="groupName"
											context={{ appName, groupName }}
											currentValue={localEdits[lang]?.name ?? ""}
											language={lang}
											onResult={(v) =>
												setLocalEdits((prev) => ({
													...prev,
													[lang]: { ...prev[lang], name: v },
												}))
											}
											showTranslate
											otherLocales={localeKeys.filter((l) => l !== lang)}
											onTranslateResults={(translations) => {
												setLocalEdits((prev) => {
													const next = { ...prev };
													for (const [locale, value] of Object.entries(translations)) {
														if (next[locale]) {
															next[locale] = { ...next[locale], name: value };
														}
													}
													return next;
												});
											}}
										/>
									</div>
									<Input
										value={localEdits[lang]?.name ?? ""}
										onChange={(e) =>
											setLocalEdits((prev) => ({
												...prev,
												[lang]: {
													...prev[lang],
													name: e.target.value,
												},
											}))
										}
										placeholder="Display name for this language"
									/>
								</div>
								<div className="space-y-2">
									<div className="flex items-center gap-1">
										<label className="text-xs font-medium text-muted-foreground">
											Description
										</label>
										<AiFieldAction
											appId={appId}
											field="groupDescription"
											context={{ appName, groupName }}
											currentValue={localEdits[lang]?.description ?? ""}
											language={lang}
											onResult={(v) =>
												setLocalEdits((prev) => ({
													...prev,
													[lang]: { ...prev[lang], description: v },
												}))
											}
											showTranslate
											otherLocales={localeKeys.filter((l) => l !== lang)}
											onTranslateResults={(translations) => {
												setLocalEdits((prev) => {
													const next = { ...prev };
													for (const [locale, value] of Object.entries(translations)) {
														if (next[locale]) {
															next[locale] = { ...next[locale], description: value };
														}
													}
													return next;
												});
											}}
										/>
									</div>
									<Textarea
										value={
											localEdits[lang]?.description ?? ""
										}
										onChange={(e) =>
											setLocalEdits((prev) => ({
												...prev,
												[lang]: {
													...prev[lang],
													description: e.target.value,
												},
											}))
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
										onClick={() => removeLanguage(lang)}
										disabled={deleteLoc.isPending}
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
	);
}

// --- Group Availability Tab ---
function GroupAvailabilityTab({
	appId,
	groupId,
}: {
	appId: string;
	groupId: string;
}) {
	const { data: territories, isLoading } = useGroupAvailability(appId, groupId);
	const updateAvailability = useUpdateGroupAvailability(appId, groupId);
	const [selected, setSelected] = useState<string[]>([]);
	const [initialized, setInitialized] = useState(false);

	if (territories && !initialized) {
		setSelected(territories);
		setInitialized(true);
	}

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
					<CardTitle className="text-sm">Group Availability</CardTitle>
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
				</div>
			</CardHeader>
			<CardContent>
				<TerritorySelector
					selected={selected}
					onChange={setSelected}
					disabled={updateAvailability.isPending}
				/>
			</CardContent>
		</Card>
	);
}

// --- Group Review Info Tab ---
function GroupReviewInfoTab({
	appId,
	groupId,
	appName,
	groupName,
}: {
	appId: string;
	groupId: string;
	appName: string;
	groupName: string;
}) {
	const { data: reviewInfo, isLoading } = useGroupReviewInfo(appId, groupId);
	const updateReviewInfo = useUpdateGroupReviewInfo(appId, groupId);
	const [notes, setNotes] = useState("");
	const [screenshotUrl, setScreenshotUrl] = useState("");
	const [initialized, setInitialized] = useState(false);

	if (reviewInfo !== undefined && !initialized) {
		setNotes(reviewInfo?.reviewNotes ?? "");
		setScreenshotUrl(reviewInfo?.screenshotUrl ?? "");
		setInitialized(true);
	}

	const handleSave = async () => {
		try {
			await updateReviewInfo.mutateAsync({
				reviewNotes: notes || null,
				screenshotUrl: screenshotUrl || null,
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
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-center gap-1">
						<Label>Review Notes</Label>
						<AiFieldAction
							appId={appId}
							field="reviewNotes"
							context={{ appName, groupName }}
							currentValue={notes}
							onResult={setNotes}
						/>
					</div>
					<Textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Notes for the App Store review team..."
						rows={4}
					/>
					<p className="text-xs text-muted-foreground">
						Provide any information that may help the review team understand
						your subscription group.
					</p>
				</div>
				<div className="space-y-2">
					<Label>Screenshot URL</Label>
					<Input
						value={screenshotUrl}
						onChange={(e) => setScreenshotUrl(e.target.value)}
						placeholder="https://example.com/screenshot.png"
					/>
					<p className="text-xs text-muted-foreground">
						URL to a screenshot demonstrating the subscription experience.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// --- Create Subscription Dialog ---
function CreateSubscriptionInGroupDialog({
	open,
	onOpenChange,
	appId,
	groupId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appId: string;
	groupId: string;
}) {
	const createSub = useCreateSubscription(appId);
	const [subName, setSubName] = useState("");
	const [productId, setProductId] = useState("");
	const [duration, setDuration] = useState("P1M");

	const reset = () => {
		setSubName("");
		setProductId("");
		setDuration("P1M");
	};

	const handleCreate = async () => {
		try {
			await createSub.mutateAsync({
				groupId,
				data: { name: subName, productId, duration },
			});
			toast.success(`Created subscription "${subName}"`);
			onOpenChange(false);
			reset();
		} catch {
			toast.error("Failed to create subscription");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Subscription</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>Name</Label>
						<Input
							value={subName}
							onChange={(e) => setSubName(e.target.value)}
							placeholder="e.g. Monthly Premium"
						/>
					</div>
					<div className="space-y-2">
						<Label>Product ID</Label>
						<Input
							value={productId}
							onChange={(e) => setProductId(e.target.value)}
							placeholder="e.g. com.app.premium.monthly"
						/>
					</div>
					<div className="space-y-2">
						<Label>Duration</Label>
						<Select value={duration} onValueChange={setDuration}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{DURATION_OPTIONS.map((d) => (
									<SelectItem key={d.value} value={d.value}>
										{d.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						onClick={handleCreate}
						disabled={
							!subName.trim() ||
							!productId.trim() ||
							createSub.isPending
						}
					>
						{createSub.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
