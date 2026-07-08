"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	AlertTriangle,
	ChevronRight,
	CreditCard,
	Globe,
	Layers,
	Loader2,
	Package,
	Plus,
	RefreshCw,
	Repeat,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { MonetizationChatPopup } from "@/components/monetization-planner/monetization-chat-popup";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Card, CardContent } from "@/components/ui/card";
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
import {
	useCreateGroup,
	useCreatePurchase,
	useDeletePurchase,
	usePurchases,
	usePurchasesCapabilities,
	useSubscriptionGroups,
	useSyncPurchases,
} from "@/hooks/use-purchases";
import type { InAppPurchase, SubscriptionGroup } from "@/lib/types";
import { cn, sortPricesByCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
	approved: "bg-green-500/10 text-green-500",
	draft: "bg-yellow-500/10 text-yellow-500",
	in_review: "bg-blue-500/10 text-blue-500",
	rejected: "bg-red-500/10 text-red-500",
	removed: "bg-muted text-muted-foreground",
	waiting_for_review: "bg-blue-500/10 text-blue-500",
};

const TYPE_LABELS: Record<string, string> = {
	auto_renewable: "Auto-Renewable",
	consumable: "Consumable",
	non_consumable: "Non-Consumable",
	non_renewing: "Non-Renewing",
};

function PurchaseCard({
	purchase,
	appId,
	groupName,
	onDelete,
}: {
	purchase: InAppPurchase;
	appId: string;
	groupName?: string;
	onDelete: (p: InAppPurchase) => void;
}) {
	const router = useRouter();
	const statusClass =
		STATUS_COLORS[purchase.status] ?? "bg-muted text-muted-foreground";
	const typeLabel = TYPE_LABELS[purchase.productType] ?? purchase.productType;
	const isSubscription =
		purchase.productType === "auto_renewable" ||
		purchase.productType === "non_renewing";

	return (
		<Card
			className="cursor-pointer transition-all hover:shadow-sm"
			onClick={() =>
				router.push(`/apps/${appId}/purchases/${purchase.id}`)
			}
		>
			<CardContent className="pt-6">
				{/* Group label for subscriptions */}
				{isSubscription && purchase.groupId && groupName && (
					<button
						type="button"
						className="mb-2 flex items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:text-primary"
						onClick={(e) => {
							e.stopPropagation();
							router.push(
								`/apps/${appId}/subscription-groups/${purchase.groupId}`,
							);
						}}
					>
						<Layers className="h-3 w-3" />
						<span>{groupName}</span>
						<ChevronRight className="h-3 w-3" />
					</button>
				)}

				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-1">
						<div className="flex items-center gap-2">
							{isSubscription ? (
								<Repeat className="h-4 w-4 shrink-0 text-muted-foreground" />
							) : (
								<Package className="h-4 w-4 shrink-0 text-muted-foreground" />
							)}
							<p className="truncate text-sm font-medium">
								{purchase.name}
							</p>
						</div>
						<p className="text-xs text-muted-foreground">
							{purchase.productId}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Badge variant="outline" className="text-xs">
							{typeLabel}
						</Badge>
						<Badge className={cn("text-xs", statusClass)}>
							{purchase.status}
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 w-7 p-0"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(purchase);
							}}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</div>

				{purchase.duration && (
					<p className="mt-2 text-xs text-muted-foreground">
						Duration: {purchase.duration}
					</p>
				)}

				{purchase.prices.length > 0 && (
					<div className="mt-3 flex flex-wrap gap-2">
						<CreditCard className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
						{sortPricesByCurrency(purchase.prices).slice(0, 5).map((p) => (
							<span
								key={p.id}
								className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums"
							>
								{p.price} {p.currency} ({p.territory})
							</span>
						))}
						{purchase.prices.length > 5 && (
							<span className="text-xs text-muted-foreground">
								+{purchase.prices.length - 5} more
							</span>
						)}
					</div>
				)}

				{purchase.localizations.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1.5">
						<Globe className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
						{purchase.localizations.map((l) => (
							<span
								key={l.id}
								className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground"
							>
								{l.language}
							</span>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function GroupOverviewCard({
	group,
	appId,
}: {
	group: SubscriptionGroup;
	appId: string;
}) {
	const router = useRouter();

	return (
		<Card
			className="cursor-pointer transition-all hover:shadow-sm"
			onClick={() =>
				router.push(
					`/apps/${appId}/subscription-groups/${group.id}`,
				)
			}
		>
			<CardContent className="pt-6">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 flex-1 space-y-1">
						<div className="flex items-center gap-2">
							<Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
							<p className="text-sm font-medium">
								{group.name}
							</p>
						</div>
						<p className="text-xs text-muted-foreground">
							{group.subscriptions.length} subscription
							{group.subscriptions.length !== 1 ? "s" : ""}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Badge variant="outline" className="text-xs">
							Group
						</Badge>
						<ChevronRight className="h-4 w-4 text-muted-foreground" />
					</div>
				</div>

				{group.subscriptions.length > 0 && (
					<div className="mt-3 space-y-1">
						{group.subscriptions.map((sub) => {
							const usd = sub.prices.find(
								(p) => p.currency === "USD",
							);
							return (
								<div
									key={sub.id}
									className="flex items-center justify-between text-xs text-muted-foreground"
								>
									<span className="truncate">
										{sub.name}
									</span>
									{usd && (
										<span className="shrink-0 tabular-nums">
											{usd.price} USD
										</span>
									)}
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ── Create IAP Dialog ──────────────────────────────────────────────

function CreatePurchaseDialog({
	open,
	onOpenChange,
	appId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appId: string;
}) {
	const createPurchase = useCreatePurchase(appId);
	const [name, setName] = useState("");
	const [productId, setProductId] = useState("");
	const [productType, setProductType] = useState("consumable");
	const [prices, setPrices] = useState<PriceRow[]>([]);
	const [localizations, setLocalizations] = useState<LocalizationRow[]>([]);

	const reset = () => {
		setName("");
		setProductId("");
		setProductType("consumable");
		setPrices([]);
		setLocalizations([]);
	};

	const handleCreate = async () => {
		const validPrices = prices.filter(
			(p) => p.territory.trim() && p.price.trim(),
		);
		const validLocs = localizations
			.filter((l) => l.language.trim())
			.map((l) => ({
				language: l.language,
				name: l.name || undefined,
				description: l.description || undefined,
			}));

		try {
			await createPurchase.mutateAsync({
				name,
				productId,
				productType,
				prices: validPrices.length > 0 ? validPrices : undefined,
				localizations: validLocs.length > 0 ? validLocs : undefined,
			});
			toast.success(`Created "${name}"`);
			onOpenChange(false);
			reset();
		} catch {
			toast.error("Failed to create purchase");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create In-App Purchase</DialogTitle>
				</DialogHeader>
				<div className="space-y-5 py-2">
					<div className="space-y-2">
						<Label>Name</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. 100 Coins"
						/>
					</div>
					<div className="space-y-2">
						<Label>Product ID</Label>
						<Input
							value={productId}
							onChange={(e) => setProductId(e.target.value)}
							placeholder="e.g. com.app.coins100"
						/>
					</div>
					<div className="space-y-2">
						<Label>Type</Label>
						<Select value={productType} onValueChange={setProductType}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="consumable">Consumable</SelectItem>
								<SelectItem value="non_consumable">
									Non-Consumable
								</SelectItem>
								<SelectItem value="non_renewing">
									Non-Renewing Subscription
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="border-t pt-4">
						<PriceRowEditor prices={prices} onChange={setPrices} />
					</div>

					<div className="border-t pt-4">
						<LocalizationRowEditor
							localizations={localizations}
							onChange={setLocalizations}
						/>
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
							!name.trim() ||
							!productId.trim() ||
							createPurchase.isPending
						}
					>
						{createPurchase.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Editable Price Row ──────────────────────────────────────────────

interface PriceRow {
	territory: string;
	currency: string;
	price: string;
}

function PriceRowEditor({
	prices,
	onChange,
}: {
	prices: PriceRow[];
	onChange: (prices: PriceRow[]) => void;
}) {
	const updateRow = (index: number, field: keyof PriceRow, value: string) => {
		const updated = [...prices];
		updated[index] = { ...updated[index], [field]: value };
		onChange(updated);
	};

	const addRow = () => {
		onChange([...prices, { territory: "", currency: "USD", price: "" }]);
	};

	const removeRow = (index: number) => {
		onChange(prices.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label>Prices</Label>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 text-xs"
					onClick={addRow}
				>
					<Plus className="mr-1 h-3 w-3" />
					Add Price
				</Button>
			</div>
			{prices.length === 0 && (
				<p className="text-xs text-muted-foreground">No prices configured.</p>
			)}
			{prices.map((row, i) => (
				<div key={i} className="flex items-center gap-2">
					<Input
						value={row.territory}
						onChange={(e) => updateRow(i, "territory", e.target.value)}
						placeholder="US"
						className="w-16 text-xs"
					/>
					<Input
						value={row.currency}
						onChange={(e) => updateRow(i, "currency", e.target.value)}
						placeholder="USD"
						className="w-16 text-xs"
					/>
					<Input
						value={row.price}
						onChange={(e) => updateRow(i, "price", e.target.value)}
						placeholder="0.99"
						className="flex-1 text-xs"
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive"
						onClick={() => removeRow(i)}
					>
						<Trash2 className="h-3 w-3" />
					</Button>
				</div>
			))}
		</div>
	);
}

// ── Editable Localization Row ──────────────────────────────────────

interface LocalizationRow {
	language: string;
	name: string;
	description: string;
}

function LocalizationRowEditor({
	localizations,
	onChange,
}: {
	localizations: LocalizationRow[];
	onChange: (localizations: LocalizationRow[]) => void;
}) {
	const updateRow = (
		index: number,
		field: keyof LocalizationRow,
		value: string,
	) => {
		const updated = [...localizations];
		updated[index] = { ...updated[index], [field]: value };
		onChange(updated);
	};

	const addRow = () => {
		onChange([
			...localizations,
			{ language: "", name: "", description: "" },
		]);
	};

	const removeRow = (index: number) => {
		onChange(localizations.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label>Localizations</Label>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 text-xs"
					onClick={addRow}
				>
					<Plus className="mr-1 h-3 w-3" />
					Add Language
				</Button>
			</div>
			{localizations.length === 0 && (
				<p className="text-xs text-muted-foreground">
					No localizations configured.
				</p>
			)}
			{localizations.map((row, i) => (
				<div key={i} className="flex items-center gap-2">
					<Input
						value={row.language}
						onChange={(e) => updateRow(i, "language", e.target.value)}
						placeholder="en-US"
						className="w-20 text-xs"
					/>
					<Input
						value={row.name}
						onChange={(e) => updateRow(i, "name", e.target.value)}
						placeholder="Display name"
						className="flex-1 text-xs"
					/>
					<Input
						value={row.description}
						onChange={(e) =>
							updateRow(i, "description", e.target.value)
						}
						placeholder="Description"
						className="flex-1 text-xs"
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive"
						onClick={() => removeRow(i)}
					>
						<Trash2 className="h-3 w-3" />
					</Button>
				</div>
			))}
		</div>
	);
}

// ── Delete Confirmation ────────────────────────────────────────────

function DeletePurchaseDialog({
	purchase,
	onOpenChange,
	appId,
}: {
	purchase: InAppPurchase | null;
	onOpenChange: (open: boolean) => void;
	appId: string;
}) {
	const deletePurchase = useDeletePurchase(appId);

	const handleDelete = async () => {
		if (!purchase) return;
		try {
			await deletePurchase.mutateAsync(purchase.id);
			toast.success(`Deleted "${purchase.name}"`);
			onOpenChange(false);
		} catch {
			toast.error("Failed to delete purchase");
		}
	};

	return (
		<AlertDialog open={!!purchase} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete purchase?</AlertDialogTitle>
					<AlertDialogDescription>
						This will delete &ldquo;{purchase?.name}&rdquo; (
						{purchase?.productId}) from the store and local database.
						This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{deletePurchase.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// ── Create Group Dialog ────────────────────────────────────────────

function CreateGroupDialog({
	open,
	onOpenChange,
	appId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appId: string;
}) {
	const createGroup = useCreateGroup(appId);
	const [name, setName] = useState("");

	const handleCreate = async () => {
		try {
			await createGroup.mutateAsync({ name });
			toast.success(`Created group "${name}"`);
			onOpenChange(false);
			setName("");
		} catch {
			toast.error("Failed to create group");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Subscription Group</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>Group Name</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Premium Plans"
						/>
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
						disabled={!name.trim() || createGroup.isPending}
					>
						{createGroup.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Main Page ──────────────────────────────────────────────────────

export default function PurchasesPage() {
	const routeParams = useParams<{ appId: string }>();
	const appId = routeParams.appId;
	const purchases = usePurchases(appId);
	const subscriptionGroups = useSubscriptionGroups(appId);
	const syncPurchases = useSyncPurchases(appId);
	const capabilities = usePurchasesCapabilities(appId);

	const [showCreatePurchase, setShowCreatePurchase] = useState(false);
	const [showCreateGroup, setShowCreateGroup] = useState(false);
	const [deletingPurchase, setDeletingPurchase] =
		useState<InAppPurchase | null>(null);

	const handleSync = async () => {
		try {
			const result = await syncPurchases.mutateAsync();
			const parts = [];
			if (result.syncedGroups > 0)
				parts.push(`${result.syncedGroups} groups`);
			if (result.syncedSubscriptions > 0)
				parts.push(`${result.syncedSubscriptions} subscriptions`);
			if (result.syncedIaps > 0)
				parts.push(`${result.syncedIaps} IAPs`);
			toast.success(
				parts.length > 0
					? `Synced: ${parts.join(", ")}`
					: "Purchases up to date",
			);
		} catch {
			toast.error("Failed to sync purchases");
		}
	};

	const iaps =
		purchases.data?.filter(
			(p) =>
				p.productType === "consumable" ||
				p.productType === "non_consumable",
		) ?? [];

	const subscriptions =
		purchases.data?.filter(
			(p) =>
				p.productType === "auto_renewable" ||
				p.productType === "non_renewing",
		) ?? [];

	const ungroupedSubscriptions = subscriptions.filter((s) => !s.groupId);

	const groupMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const g of subscriptionGroups.data ?? []) {
			map[g.id] = g.name;
		}
		return map;
	}, [subscriptionGroups.data]);

	const isLoading = purchases.isLoading || subscriptionGroups.isLoading;
	const isError = purchases.isError || subscriptionGroups.isError;
	const hasNoContent =
		iaps.length === 0 &&
		(subscriptionGroups.data?.length ?? 0) === 0 &&
		ungroupedSubscriptions.length === 0;

	return (
		<div className="mx-auto w-full max-w-6xl p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold">
						Purchases & Subscriptions
					</h1>
					<p className="text-sm text-muted-foreground">
						Manage in-app purchases and subscription groups
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleSync}
						disabled={syncPurchases.isPending}
					>
						{syncPurchases.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						Sync
					</Button>
					<Button
						size="sm"
						onClick={() => setShowCreatePurchase(true)}
					>
						<Plus className="mr-2 h-4 w-4" />
						New Purchase
					</Button>
				</div>
			</div>

			{capabilities.data && !capabilities.data.supported && (
				<Alert variant="destructive" className="mb-4">
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Monetization unavailable</AlertTitle>
					<AlertDescription>
						{capabilities.data.reason ??
							"This store does not support in-app purchase management."}
					</AlertDescription>
				</Alert>
			)}

			{isLoading && (
				<div className="grid gap-4 sm:grid-cols-2">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-28 rounded-xl" />
					))}
				</div>
			)}

			{!isLoading && isError && (
				<div className="flex flex-1 items-center justify-center p-6">
					<p className="text-sm text-destructive">Failed to load data. Please try again.</p>
				</div>
			)}

			{!isLoading && !isError && (
				<Tabs defaultValue="all">
					<TabsList>
						<TabsTrigger value="all">
							All ({purchases.data?.length ?? 0})
						</TabsTrigger>
						<TabsTrigger value="subscriptions">
							Subscriptions ({subscriptions.length})
						</TabsTrigger>
						<TabsTrigger value="iaps">
							In-App Purchases ({iaps.length})
						</TabsTrigger>
						<TabsTrigger value="groups">
							Groups ({subscriptionGroups.data?.length ?? 0})
						</TabsTrigger>
					</TabsList>

					<TabsContent
						value="all"
						className="mt-4 grid items-start gap-4 sm:grid-cols-2"
					>
						{hasNoContent && (
							<div className="flex flex-col items-center justify-center gap-2 py-12 sm:col-span-2">
								<Package className="h-10 w-10 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									No purchases found. Click Sync to fetch from
									store.
								</p>
							</div>
						)}

						{/* Subscription Groups */}
						{(subscriptionGroups.data ?? []).map((group) => (
							<GroupOverviewCard
								key={group.id}
								group={group}
								appId={appId}
							/>
						))}

						{/* Ungrouped subscriptions */}
						{ungroupedSubscriptions.map((sub) => (
							<PurchaseCard
								key={sub.id}
								purchase={sub}
								appId={appId}
								onDelete={setDeletingPurchase}
							/>
						))}

						{/* In-App Purchases */}
						{iaps.map((iap) => (
							<PurchaseCard
								key={iap.id}
								purchase={iap}
								appId={appId}
								onDelete={setDeletingPurchase}
							/>
						))}
					</TabsContent>

					<TabsContent
						value="subscriptions"
						className="mt-4 grid items-start gap-4 sm:grid-cols-2"
					>
						{subscriptions.length === 0 && (
							<div className="flex flex-col items-center justify-center gap-2 py-12 sm:col-span-2">
								<Repeat className="h-10 w-10 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									No subscriptions found.
								</p>
							</div>
						)}
						{subscriptions.map((sub) => (
							<PurchaseCard
								key={sub.id}
								purchase={sub}
								appId={appId}
								groupName={sub.groupId ? groupMap[sub.groupId] : undefined}
								onDelete={setDeletingPurchase}
							/>
						))}
					</TabsContent>

					<TabsContent
						value="iaps"
						className="mt-4 grid items-start gap-4 sm:grid-cols-2"
					>
						{iaps.length === 0 && (
							<div className="flex flex-col items-center justify-center gap-2 py-12 sm:col-span-2">
								<Package className="h-10 w-10 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									No in-app purchases found.
								</p>
							</div>
						)}
						{iaps.map((iap) => (
							<PurchaseCard
								key={iap.id}
								purchase={iap}
								appId={appId}
								groupName={iap.groupId ? groupMap[iap.groupId] : undefined}
								onDelete={setDeletingPurchase}
							/>
						))}
					</TabsContent>

					<TabsContent
						value="groups"
						className="mt-4 grid items-start gap-4 sm:grid-cols-2"
					>
						<div className="flex justify-end sm:col-span-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowCreateGroup(true)}
							>
								<Plus className="mr-2 h-4 w-4" />
								New Group
							</Button>
						</div>
						{subscriptionGroups.data?.length === 0 && (
							<div className="flex flex-col items-center justify-center gap-2 py-12 sm:col-span-2">
								<Repeat className="h-10 w-10 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									No subscription groups found.
								</p>
							</div>
						)}
						{subscriptionGroups.data?.map((group) => (
							<GroupOverviewCard
								key={group.id}
								group={group}
								appId={appId}
							/>
						))}
					</TabsContent>
				</Tabs>
			)}

			{/* Dialogs */}
			<CreatePurchaseDialog
				open={showCreatePurchase}
				onOpenChange={setShowCreatePurchase}
				appId={appId}
			/>
			<DeletePurchaseDialog
				purchase={deletingPurchase}
				onOpenChange={(open) => !open && setDeletingPurchase(null)}
				appId={appId}
			/>
			<CreateGroupDialog
				open={showCreateGroup}
				onOpenChange={setShowCreateGroup}
				appId={appId}
			/>
			<MonetizationChatPopup appId={appId} />
		</div>
	);
}
