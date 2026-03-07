"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
	ChevronRight,
	CreditCard,
	Loader2,
	Plus,
	Repeat,
} from "lucide-react";

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
import { useAutoSave } from "@/hooks/use-auto-save";
import {
	useCreateSubscription,
	useSubscriptionGroup,
	useUpdateGroup,
} from "@/hooks/use-purchases";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
	const { data: group, isLoading } = useSubscriptionGroup(appId, groupId);
	const updateGroup = useUpdateGroup(appId);

	const [name, setName] = useState("");
	const [nameInitialized, setNameInitialized] = useState(false);
	const [showCreateSub, setShowCreateSub] = useState(false);

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
					<Badge variant="outline" className="shrink-0 text-xs">
						{group.subscriptions.length} subscription
						{group.subscriptions.length !== 1 ? "s" : ""}
					</Badge>
				</div>
			</div>

			{/* Subscriptions List */}
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
										{sub.prices.slice(0, 3).map((p) => (
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

			{/* Create Subscription Dialog */}
			<CreateSubscriptionInGroupDialog
				open={showCreateSub}
				onOpenChange={setShowCreateSub}
				appId={appId}
				groupId={groupId}
			/>
		</div>
	);
}

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
