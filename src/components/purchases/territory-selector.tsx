"use client";

import { useState } from "react";
import { Check, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const TERRITORY_REGIONS: Record<string, string[]> = {
	"North America": ["US", "CA", "MX"],
	Europe: [
		"GB", "DE", "FR", "ES", "IT", "NL", "PL", "SE", "NO", "DK", "FI",
		"AT", "CH", "BE", "IE", "PT", "CZ", "RO", "HU", "GR", "SK", "BG",
		"HR", "LT", "LV", "EE", "SI", "LU", "MT", "CY",
	],
	"Asia Pacific": [
		"JP", "KR", "AU", "NZ", "CN", "HK", "TW", "SG", "TH", "MY", "ID",
		"PH", "VN", "IN",
	],
	"Latin America": ["BR", "AR", "CL", "CO", "PE"],
	"Middle East & Africa": ["AE", "SA", "IL", "ZA", "EG", "NG", "KE"],
};

interface TerritorySelectorProps {
	selected: string[];
	onChange: (territories: string[]) => void;
	disabled?: boolean;
}

export function TerritorySelector({
	selected,
	onChange,
	disabled,
}: TerritorySelectorProps) {
	const [search, setSearch] = useState("");

	const allTerritories = Object.values(TERRITORY_REGIONS).flat();
	const filteredRegions = Object.entries(TERRITORY_REGIONS)
		.map(([region, codes]) => ({
			codes: codes.filter((c) =>
				c.toLowerCase().includes(search.toLowerCase()),
			),
			region,
		}))
		.filter((r) => r.codes.length > 0);

	const toggleTerritory = (code: string) => {
		if (disabled) return;
		const next = selected.includes(code)
			? selected.filter((c) => c !== code)
			: [...selected, code];
		onChange(next);
	};

	const toggleRegion = (codes: string[]) => {
		if (disabled) return;
		const allSelected = codes.every((c) => selected.includes(c));
		if (allSelected) {
			onChange(selected.filter((c) => !codes.includes(c)));
		} else {
			onChange([...new Set([...selected, ...codes])]);
		}
	};

	const selectAll = () => onChange(allTerritories);
	const clearAll = () => onChange([]);

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search territories..."
						className="pl-8"
						disabled={disabled}
					/>
				</div>
				<Badge variant="outline">
					{selected.length} / {allTerritories.length}
				</Badge>
			</div>
			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={selectAll}
					disabled={disabled}
				>
					Select All
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={clearAll}
					disabled={disabled}
				>
					Clear All
				</Button>
			</div>
			<ScrollArea className="h-64 rounded-md border p-3">
				{filteredRegions.map(({ region, codes }) => {
					const regionSelected = codes.filter((c) =>
						selected.includes(c),
					).length;
					return (
						<div key={region} className="mb-4 last:mb-0">
							<button
								type="button"
								className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
								onClick={() => toggleRegion(codes)}
								disabled={disabled}
							>
								{region}
								<span className="text-[10px] font-normal">
									({regionSelected}/{codes.length})
								</span>
							</button>
							<div className="flex flex-wrap gap-1.5">
								{codes.map((code) => {
									const isSelected =
										selected.includes(code);
									return (
										<button
											key={code}
											type="button"
											onClick={() =>
												toggleTerritory(code)
											}
											disabled={disabled}
											className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
												isSelected
													? "border-primary bg-primary/10 text-primary"
													: "border-border text-muted-foreground hover:border-primary/50"
											}`}
										>
											{isSelected && (
												<Check className="h-3 w-3" />
											)}
											{code}
										</button>
									);
								})}
							</div>
						</div>
					);
				})}
			</ScrollArea>
		</div>
	);
}
