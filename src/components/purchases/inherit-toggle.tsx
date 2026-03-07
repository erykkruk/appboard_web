"use client";

import Link from "next/link";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface InheritToggleProps {
	useDefault: boolean;
	onChange: (useDefault: boolean) => void;
	label?: string;
	description?: string;
	groupHref?: string;
}

export function InheritToggle({
	useDefault,
	onChange,
	label = "Use group default",
	description = "When enabled, this subscription inherits settings from its group.",
	groupHref,
}: InheritToggleProps) {
	return (
		<div className="flex items-center justify-between rounded-lg border p-4">
			<div className="space-y-0.5">
				<Label className="text-sm font-medium">{label}</Label>
				<p className="text-xs text-muted-foreground">{description}</p>
				{useDefault && groupHref && (
					<Link
						href={groupHref}
						className="text-xs text-primary hover:underline"
					>
						Edit group settings →
					</Link>
				)}
			</div>
			<Switch checked={useDefault} onCheckedChange={onChange} />
		</div>
	);
}
