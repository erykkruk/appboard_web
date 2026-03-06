"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
	CreditCard,
	Globe,
	Loader2,
	Package,
	Pencil,
	Plus,
	RefreshCw,
	Repeat,
	Sparkles,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { MonetizationChat } from "@/components/monetization-planner/monetization-chat";
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
import {
	useCreateGroup,
	useCreatePurchase,
	useCreateSubscription,
	useDeletePurchase,
	usePurchases,
	useSubscriptionGroups,
	useSyncPurchases,
	useUpdatePurchase,
} from "@/hooks/use-purchases";
import type { InAppPurchase, SubscriptionGroup } from "@/lib/types";
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
	auto_renewable: "Auto-Renewable",
	consumable: "Consumable",
	non_consumable: "Non-Consumable",
	non_renewing: "Non-Renewing",
};

const DURATION_OPTIONS = [
	{ label: "1 Week", value: "P1W" },
	{ label: "1 Month", value: "P1M" },
	{ label: "2 Months", value: "P2M" },
	{ label: "3 Months", value: "P3M" },
	{ label: "6 Months", value: "P6M" },
	{ label: "1 Year", value: "P1Y" },
];

function PurchaseCard({
	purchase,
	onEdit,
	onDelete,
}: {
	purchase: InAppPurchase;
	onEdit: (p: InAppPurchase) => void;
	onDelete: (p: InAppPurchase) => void;
}) {
	const statusClass =
		STATUS_COLORS[purchase.status] ?? "bg-muted text-muted-foreground";
	const typeLabel = TYPE_LABELS[purchase.productType] ?? purchase.productType;
	const isSubscription =
		purchase.productType === "auto_renewable" ||
		purchase.productType === "non_renewing";

	return (
		<Card className="transition-all hover:shadow-sm">
			<CardContent className="pt-6">
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
							onClick={() => onEdit(purchase)}
						>
							<Pencil className="h-3.5 w-3.5" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 w-7 p-0 text-destructive hover:text-destructive"
							onClick={() => onDelete(purchase)}
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
						{purchase.prices.slice(0, 5).map((p) => (
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

function SubscriptionGroupCard({
	group,
	onAddSubscription,
	onEdit,
	onDelete,
}: {
	group: SubscriptionGroup;
	onAddSubscription: (group: SubscriptionGroup) => void;
	onEdit: (p: InAppPurchase) => void;
	onDelete: (p: InAppPurchase) => void;
}) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">{group.name}</CardTitle>
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="text-xs">
							{group.subscriptions.length} subscription
							{group.subscriptions.length !== 1 ? "s" : ""}
						</Badge>
						<Button
							variant="outline"
							size="sm"
							className="h-7"
							onClick={() => onAddSubscription(group)}
						>
							<Plus className="mr-1 h-3.5 w-3.5" />
							Add
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{group.subscriptions.map((sub) => (
					<div
						key={sub.id}
						className="rounded-lg border border-border p-3 space-y-2"
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
							<div className="flex shrink-0 items-center gap-1">
								<Badge
									className={cn(
										"text-xs",
										STATUS_COLORS[sub.status] ??
											"bg-muted text-muted-foreground",
									)}
								>
									{sub.status}
								</Badge>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 w-7 p-0"
									onClick={() => onEdit(sub)}
								>
									<Pencil className="h-3.5 w-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 w-7 p-0 text-destructive hover:text-destructive"
									onClick={() => onDelete(sub)}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>

						{sub.duration && (
							<p className="text-xs text-muted-foreground">
								Duration: {sub.duration}
							</p>
						)}

						{sub.prices.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{sub.prices.slice(0, 5).map((p) => (
									<span
										key={p.id}
										className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums"
									>
										{p.price} {p.currency} ({p.territory})
									</span>
								))}
								{sub.prices.length > 5 && (
									<span className="text-xs text-muted-foreground">
										+{sub.prices.length - 5} more
									</span>
								)}
							</div>
						)}
					</div>
				))}

				{group.subscriptions.length === 0 && (
					<p className="py-4 text-center text-sm text-muted-foreground">
						No subscriptions in this group.
					</p>
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

// ── Edit Purchase Dialog ───────────────────────────────────────────

function EditPurchaseDialog({
	purchase,
	onOpenChange,
	appId,
}: {
	purchase: InAppPurchase | null;
	onOpenChange: (open: boolean) => void;
	appId: string;
}) {
	const updatePurchase = useUpdatePurchase(appId);
	const [name, setName] = useState("");
	const [prices, setPrices] = useState<PriceRow[]>([]);
	const [localizations, setLocalizations] = useState<LocalizationRow[]>([]);

	useEffect(() => {
		if (purchase) {
			setName(purchase.name);
			setPrices(
				purchase.prices.map((p) => ({
					territory: p.territory,
					currency: p.currency,
					price: p.price,
				})),
			);
			setLocalizations(
				purchase.localizations.map((l) => ({
					language: l.language,
					name: l.name ?? "",
					description: l.description ?? "",
				})),
			);
		}
	}, [purchase]);

	const handleSave = async () => {
		if (!purchase) return;
		try {
			const data: {
				name?: string;
				prices?: PriceRow[];
				localizations?: { language: string; name?: string; description?: string }[];
			} = {};

			if (name.trim() && name.trim() !== purchase.name) {
				data.name = name.trim();
			}

			const validPrices = prices.filter(
				(p) => p.territory.trim() && p.price.trim(),
			);
			if (validPrices.length > 0) {
				data.prices = validPrices;
			}

			const validLocs = localizations.filter((l) => l.language.trim());
			if (validLocs.length > 0) {
				data.localizations = validLocs.map((l) => ({
					language: l.language,
					name: l.name || undefined,
					description: l.description || undefined,
				}));
			}

			await updatePurchase.mutateAsync({
				purchaseId: purchase.id,
				data,
			});
			toast.success("Purchase updated");
			onOpenChange(false);
		} catch {
			toast.error("Failed to update purchase");
		}
	};

	return (
		<Dialog open={!!purchase} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Purchase</DialogTitle>
				</DialogHeader>
				<div className="space-y-5 py-2">
					<div className="space-y-2">
						<Label>Name</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Purchase name"
						/>
					</div>
					<div className="space-y-2">
						<Label className="text-muted-foreground">
							Product ID
						</Label>
						<Input
							value={purchase?.productId ?? ""}
							disabled
							className="opacity-60"
						/>
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
						onClick={handleSave}
						disabled={!name.trim() || updatePurchase.isPending}
					>
						{updatePurchase.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
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

// ── Create Subscription Dialog ─────────────────────────────────────

function CreateSubscriptionDialog({
	group,
	onOpenChange,
	appId,
}: {
	group: SubscriptionGroup | null;
	onOpenChange: (open: boolean) => void;
	appId: string;
}) {
	const createSub = useCreateSubscription(appId);
	const [name, setName] = useState("");
	const [productId, setProductId] = useState("");
	const [duration, setDuration] = useState("P1M");
	const [prices, setPrices] = useState<PriceRow[]>([]);
	const [localizations, setLocalizations] = useState<LocalizationRow[]>([]);

	const reset = () => {
		setName("");
		setProductId("");
		setDuration("P1M");
		setPrices([]);
		setLocalizations([]);
	};

	const handleCreate = async () => {
		if (!group) return;
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
			await createSub.mutateAsync({
				groupId: group.id,
				data: {
					name,
					productId,
					duration,
					prices: validPrices.length > 0 ? validPrices : undefined,
					localizations: validLocs.length > 0 ? validLocs : undefined,
				},
			});
			toast.success(`Created subscription "${name}"`);
			onOpenChange(false);
			reset();
		} catch {
			toast.error("Failed to create subscription");
		}
	};

	return (
		<Dialog open={!!group} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Add Subscription to &ldquo;{group?.name}&rdquo;
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-5 py-2">
					<div className="space-y-2">
						<Label>Name</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
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

// ── Main Page ──────────────────────────────────────────────────────

export default function PurchasesPage() {
	const routeParams = useParams<{ appId: string }>();
	const appId = routeParams.appId;
	const purchases = usePurchases(appId);
	const subscriptionGroups = useSubscriptionGroups(appId);
	const syncPurchases = useSyncPurchases(appId);

	const [showMonetizationChat, setShowMonetizationChat] = useState(false);
	const [showCreatePurchase, setShowCreatePurchase] = useState(false);
	const [showCreateGroup, setShowCreateGroup] = useState(false);
	const [editingPurchase, setEditingPurchase] =
		useState<InAppPurchase | null>(null);
	const [deletingPurchase, setDeletingPurchase] =
		useState<InAppPurchase | null>(null);
	const [addSubToGroup, setAddSubToGroup] =
		useState<SubscriptionGroup | null>(null);

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

	const isLoading = purchases.isLoading || subscriptionGroups.isLoading;

	return (
		<div className="mx-auto max-w-4xl p-6">
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
						onClick={() => setShowMonetizationChat(true)}
					>
						<Sparkles className="mr-2 h-4 w-4" />
						Plan Monetization
					</Button>
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

			{isLoading && (
				<div className="space-y-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-28 rounded-xl" />
					))}
				</div>
			)}

			{!isLoading && (
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

					<TabsContent value="all" className="mt-4 space-y-3">
						{purchases.data?.length === 0 && (
							<div className="flex flex-col items-center justify-center gap-2 py-12">
								<Package className="h-10 w-10 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									No purchases found. Click Sync to fetch from
									store.
								</p>
							</div>
						)}
						{purchases.data?.map((purchase) => (
							<PurchaseCard
								key={purchase.id}
								purchase={purchase}
								onEdit={setEditingPurchase}
								onDelete={setDeletingPurchase}
							/>
						))}
					</TabsContent>

					<TabsContent
						value="subscriptions"
						className="mt-4 space-y-3"
					>
						{subscriptions.length === 0 && (
							<div className="flex flex-col items-center justify-center gap-2 py-12">
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
								onEdit={setEditingPurchase}
								onDelete={setDeletingPurchase}
							/>
						))}
					</TabsContent>

					<TabsContent value="iaps" className="mt-4 space-y-3">
						{iaps.length === 0 && (
							<div className="flex flex-col items-center justify-center gap-2 py-12">
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
								onEdit={setEditingPurchase}
								onDelete={setDeletingPurchase}
							/>
						))}
					</TabsContent>

					<TabsContent value="groups" className="mt-4 space-y-4">
						<div className="flex justify-end">
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
							<div className="flex flex-col items-center justify-center gap-2 py-12">
								<Repeat className="h-10 w-10 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									No subscription groups found.
								</p>
							</div>
						)}
						{subscriptionGroups.data?.map((group) => (
							<SubscriptionGroupCard
								key={group.id}
								group={group}
								onAddSubscription={setAddSubToGroup}
								onEdit={setEditingPurchase}
								onDelete={setDeletingPurchase}
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
			<EditPurchaseDialog
				purchase={editingPurchase}
				onOpenChange={(open) => !open && setEditingPurchase(null)}
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
			<CreateSubscriptionDialog
				group={addSubToGroup}
				onOpenChange={(open) => !open && setAddSubToGroup(null)}
				appId={appId}
			/>
			<MonetizationChat
				appId={appId}
				open={showMonetizationChat}
				onOpenChange={setShowMonetizationChat}
			/>
		</div>
	);
}
