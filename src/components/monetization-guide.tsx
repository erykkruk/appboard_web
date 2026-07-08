"use client";

import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonetizationGuide } from "@/hooks/use-monetization-prompts";

function parseMarkdownTable(
	md: string,
): { headers: string[]; rows: string[][] } | null {
	const lines = md.trim().split("\n");
	if (lines.length < 3) return null;

	const headerLine = lines[0];
	if (!headerLine.includes("|")) return null;

	const headers = headerLine
		.split("|")
		.map((h) => h.trim())
		.filter(Boolean);
	const rows: string[][] = [];

	for (let i = 2; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line || !line.includes("|")) continue;
		const cells = line
			.split("|")
			.map((c) => c.trim())
			.filter((_, idx, arr) => idx > 0 && idx < arr.length);
		if (cells.length > 0) rows.push(cells);
	}

	return { headers, rows };
}

function renderInlineMarkdown(text: string): React.ReactNode {
	const parts: React.ReactNode[] = [];
	let remaining = text;
	let key = 0;

	while (remaining.length > 0) {
		const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
		if (boldMatch && boldMatch.index !== undefined) {
			if (boldMatch.index > 0) {
				parts.push(remaining.slice(0, boldMatch.index));
			}
			parts.push(
				<strong key={key++} className="text-foreground">
					{boldMatch[1]}
				</strong>,
			);
			remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
		} else {
			parts.push(remaining);
			break;
		}
	}

	return parts;
}

function GuideContent({ content }: { content: string }) {
	const blocks = content.split("\n\n");

	return (
		<div className="space-y-4">
			{blocks.map((block, blockIdx) => {
				const trimmed = block.trim();

				// Table
				if (trimmed.includes("|") && trimmed.includes("---")) {
					const table = parseMarkdownTable(trimmed);
					if (table) {
						return (
							<div
								key={blockIdx}
								className="overflow-x-auto rounded-lg border border-border"
							>
								<table className="w-full text-xs">
									<thead>
										<tr className="border-b border-border bg-muted/50">
											{table.headers.map((h, i) => (
												<th
													key={i}
													className="px-3 py-2 text-left font-medium text-muted-foreground"
												>
													{renderInlineMarkdown(h)}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{table.rows.map((row, i) => (
											<tr
												key={i}
												className="border-b border-border last:border-0"
											>
												{row.map((cell, j) => (
													<td key={j} className="px-3 py-2 text-foreground">
														{renderInlineMarkdown(cell)}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						);
					}
				}

				// Bullet list
				if (trimmed.startsWith("- ")) {
					const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
					return (
						<ul key={blockIdx} className="space-y-1 pl-4">
							{items.map((item, i) => (
								<li
									key={i}
									className="list-disc text-sm text-muted-foreground"
								>
									{renderInlineMarkdown(item.slice(2))}
								</li>
							))}
						</ul>
					);
				}

				// Regular paragraph
				if (trimmed) {
					return (
						<p key={blockIdx} className="text-sm text-muted-foreground">
							{renderInlineMarkdown(trimmed)}
						</p>
					);
				}

				return null;
			})}
		</div>
	);
}

export function MonetizationGuide() {
	const { data: sections, isLoading } = useMonetizationGuide();

	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!sections?.length) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">
				No guide content available.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				Reference guide for monetization strategies, pricing psychology,
				and best practices. This knowledge is built into the AI prompts.
			</p>
			{sections.map((section) => (
				<Card key={section.id}>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">{section.title}</CardTitle>
					</CardHeader>
					<CardContent>
						<GuideContent content={section.content} />
					</CardContent>
				</Card>
			))}
		</div>
	);
}
