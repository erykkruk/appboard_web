"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { HistoryTimeline } from "@/components/history/history-timeline";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useHistory, useRollback } from "@/hooks/use-history";
import { getListingFieldLabel } from "@/lib/field-labels";

const ALL_VALUE = "__all__";

export default function HistoryPage() {
	const params = useParams<{ appId: string }>();
	const appId = params.appId;

	const [languageFilter, setLanguageFilter] = useState<string | undefined>(
		undefined,
	);
	const [fieldFilter, setFieldFilter] = useState<string | undefined>(undefined);

	const history = useHistory(appId, {
		language: languageFilter,
		field: fieldFilter,
	});
	const rollback = useRollback(appId);

	const allEntries = useMemo(() => history.data ?? [], [history.data]);

	const { languages, fields } = useMemo(() => {
		const langSet = new Set<string>();
		const fieldSet = new Set<string>();
		for (const entry of allEntries) {
			if (entry.language) langSet.add(entry.language);
			if (entry.field) fieldSet.add(entry.field);
		}
		return {
			languages: Array.from(langSet).sort(),
			fields: Array.from(fieldSet).sort(),
		};
	}, [allEntries]);

	const handleRollback = async (entryId: string) => {
		try {
			await rollback.mutateAsync(entryId);
			toast.success("Rollback applied");
		} catch {
			toast.error("Failed to rollback change");
		}
	};

	const rollbackPendingId = rollback.isPending
		? (rollback.variables ?? null)
		: null;

	return (
		<div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 p-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Change History</h1>
				<p className="text-sm text-muted-foreground">
					Browse and rollback listing field changes for this app.
				</p>
			</div>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-sm">Filters</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-3">
					<div className="min-w-[160px] flex-1">
						<Select
							value={languageFilter ?? ALL_VALUE}
							onValueChange={(value) =>
								setLanguageFilter(value === ALL_VALUE ? undefined : value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="All languages" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_VALUE}>All languages</SelectItem>
								{languages.map((lang) => (
									<SelectItem key={lang} value={lang}>
										{lang}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="min-w-[160px] flex-1">
						<Select
							value={fieldFilter ?? ALL_VALUE}
							onValueChange={(value) =>
								setFieldFilter(value === ALL_VALUE ? undefined : value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="All fields" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_VALUE}>All fields</SelectItem>
								{fields.map((field) => (
									<SelectItem key={field} value={field}>
										{getListingFieldLabel(field)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card className="flex min-h-0 flex-1 flex-col">
				<CardContent className="min-h-0 flex-1 p-0">
					<HistoryTimeline
						entries={allEntries}
						isLoading={history.isLoading}
						onRollback={handleRollback}
						rollbackPendingId={rollbackPendingId}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
