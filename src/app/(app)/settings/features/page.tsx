"use client";

import { toast } from "sonner";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useFeatures, useUpdateFeatures } from "@/hooks/use-features";
import type { FeatureKey } from "@/lib/types";

export default function SettingsFeaturesPage() {
	const features = useFeatures();
	const updateFeatures = useUpdateFeatures();

	const handleToggle = async (
		key: FeatureKey,
		name: string,
		value: boolean,
	) => {
		try {
			await updateFeatures.mutateAsync({ [key]: value });
			toast.success(`Feature ${name} ${value ? "enabled" : "disabled"}`);
		} catch {
			toast.error(`Failed to update feature ${name}`);
		}
	};

	return (
		<div className="mx-auto w-full max-w-2xl space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
				<p className="text-sm text-muted-foreground">
					Enable or disable parts of the application. Disabled features will
					be hidden from navigation and blocked on the server.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Available Features</CardTitle>
					<CardDescription>
						Toggle features on or off for this workspace.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{features.isLoading && (
						<div className="space-y-3">
							<Skeleton className="h-16" />
							<Skeleton className="h-16" />
							<Skeleton className="h-16" />
						</div>
					)}

					{features.isError && (
						<p className="text-sm text-muted-foreground">
							Failed to load features.
						</p>
					)}

					{features.data && (
						<div className="space-y-1">
							{features.data.definitions.map((definition) => {
								const checked =
									features.data.features[definition.key] ?? true;
								return (
									<div
										key={definition.key}
										className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-3"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium text-foreground">
												{definition.name}
											</p>
											<p className="mt-0.5 text-xs text-muted-foreground">
												{definition.description}
											</p>
										</div>
										<Switch
											checked={checked}
											disabled={updateFeatures.isPending}
											onCheckedChange={(value) =>
												handleToggle(definition.key, definition.name, value)
											}
											aria-label={`Toggle ${definition.name}`}
										/>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
