import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { sortPricesByCurrency } from "@/lib/utils";

interface PriceEntry {
	id: string;
	territory: string;
	currency: string;
	price: string;
}

interface PricesTableProps {
	prices: PriceEntry[];
}

export function PricesTable({ prices }: PricesTableProps) {
	if (prices.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				No prices configured. Sync from store to fetch prices.
			</p>
		);
	}

	const sorted = sortPricesByCurrency(prices);

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Territory</TableHead>
					<TableHead>Currency</TableHead>
					<TableHead className="text-right">Price</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sorted.map((p) => (
					<TableRow key={p.id}>
						<TableCell>{p.territory}</TableCell>
						<TableCell>{p.currency}</TableCell>
						<TableCell className="text-right tabular-nums">
							{p.price}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
