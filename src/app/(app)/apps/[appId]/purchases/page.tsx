"use client";

import { useParams } from "next/navigation";
import {
	CreditCard,
	Globe,
	Loader2,
	Package,
	RefreshCw,
	Repeat,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import {
	usePurchases,
	useSubscriptionGroups,
	useSyncPurchases,
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

function PurchaseCard({ purchase }: { purchase: InAppPurchase }) {
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

function SubscriptionGroupCard({ group }: { group: SubscriptionGroup }) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base">{group.name}</CardTitle>
					<Badge variant="outline" className="text-xs">
						{group.subscriptions.length} subscription
						{group.subscriptions.length !== 1 ? "s" : ""}
					</Badge>
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
							<Badge
								className={cn(
									"shrink-0 text-xs",
									STATUS_COLORS[sub.status] ??
										"bg-muted text-muted-foreground",
								)}
							>
								{sub.status}
							</Badge>
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

export default function PurchasesPage() {
	const routeParams = useParams<{ appId: string }>();
	const appId = routeParams.appId;
	const purchases = usePurchases(appId);
	const subscriptionGroups = useSubscriptionGroups(appId);
	const syncPurchases = useSyncPurchases(appId);

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
							<PurchaseCard key={sub.id} purchase={sub} />
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
							<PurchaseCard key={iap.id} purchase={iap} />
						))}
					</TabsContent>

					<TabsContent value="groups" className="mt-4 space-y-4">
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
							/>
						))}
					</TabsContent>
				</Tabs>
			)}
		</div>
	);
}
