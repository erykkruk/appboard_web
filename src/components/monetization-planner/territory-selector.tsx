"use client";

import { useMemo, useState } from "react";
import { Globe, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Territory {
	code: string;
	currency: string;
	name: string;
}

interface TerritorySelectorProps {
	territories: Territory[];
	selectedCodes: string[];
	mode: "all" | "custom";
	onModeChange: (mode: "all" | "custom") => void;
	onSelectionChange: (codes: string[]) => void;
}

export function TerritorySelector({
	territories,
	selectedCodes,
	mode,
	onModeChange,
	onSelectionChange,
}: TerritorySelectorProps) {
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		if (!search.trim()) return territories;
		const q = search.toLowerCase();
		return territories.filter(
			(t) =>
				t.name.toLowerCase().includes(q) ||
				t.code.toLowerCase().includes(q) ||
				t.currency.toLowerCase().includes(q),
		);
	}, [territories, search]);

	const allCodes = useMemo(
		() => territories.map((t) => t.code),
		[territories],
	);

	const handleToggle = (code: string) => {
		if (selectedCodes.includes(code)) {
			onSelectionChange(selectedCodes.filter((c) => c !== code));
		} else {
			onSelectionChange([...selectedCodes, code]);
		}
	};

	const handleSelectAll = () => onSelectionChange(allCodes);
	const handleDeselectAll = () => onSelectionChange([]);

	return (
		<div className="border-b px-4 pb-3">
			<div className="flex items-center gap-2">
				<Globe className="h-3.5 w-3.5 text-muted-foreground" />
				<span className="text-xs font-medium text-muted-foreground">
					Territories
				</span>
				<div className="ml-auto flex gap-1">
					<Button
						variant={mode === "all" ? "default" : "outline"}
						size="xs"
						onClick={() => onModeChange("all")}
					>
						All
					</Button>
					<Button
						variant={mode === "custom" ? "default" : "outline"}
						size="xs"
						onClick={() => onModeChange("custom")}
					>
						Custom
						{mode === "custom" && (
							<span className="ml-1 text-xs opacity-70">
								({selectedCodes.length})
							</span>
						)}
					</Button>
				</div>
			</div>

			{mode === "custom" && (
				<div className="mt-2 space-y-2">
					<div className="flex items-center gap-2">
						<div className="relative flex-1">
							<Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search territories..."
								className="h-7 pl-7 text-xs"
							/>
						</div>
						<Button
							variant="ghost"
							size="xs"
							onClick={handleSelectAll}
						>
							All
						</Button>
						<Button
							variant="ghost"
							size="xs"
							onClick={handleDeselectAll}
						>
							None
						</Button>
					</div>

					<ScrollArea className="h-40">
						<div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pr-3">
							{filtered.map((t) => (
								<label
									key={t.code}
									className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-accent"
								>
									<Checkbox
										checked={selectedCodes.includes(
											t.code,
										)}
										onCheckedChange={() =>
											handleToggle(t.code)
										}
										className="size-3.5"
									/>
									<span className="font-mono text-muted-foreground">
										{t.code}
									</span>
									<span className="truncate">{t.name}</span>
									<span className="ml-auto text-muted-foreground">
										{t.currency}
									</span>
								</label>
							))}
						</div>
					</ScrollArea>
				</div>
			)}
		</div>
	);
}
