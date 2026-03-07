import Link from "next/link";

import { ExternalLink } from "lucide-react";

interface MetadataItem {
	label: string;
	value: string | null | undefined;
	href?: string;
}

interface MetadataGridProps {
	items: MetadataItem[];
}

export function MetadataGrid({ items }: MetadataGridProps) {
	return (
		<div className="grid grid-cols-2 gap-x-6 gap-y-3">
			{items.map((item) => (
				<div key={item.label}>
					<p className="text-xs font-medium text-muted-foreground">
						{item.label}
					</p>
					{item.href ? (
						<Link
							href={item.href}
							className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
						>
							{item.value ?? "—"}
							<ExternalLink className="h-3 w-3" />
						</Link>
					) : (
						<p className="text-sm">
							{item.value ?? "—"}
						</p>
					)}
				</div>
			))}
		</div>
	);
}
