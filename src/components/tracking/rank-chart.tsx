"use client";

import { useMemo } from "react";

import type { RankAnnotation, RankSnapshot } from "@/lib/types";

// Design-space canvas; scales to container width via preserveAspectRatio.
const W = 820;
const H = 320;
const PAD = { bottom: 44, left: 40, right: 16, top: 20 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

// Colorblind-friendly categorical palette.
const SERIES_COLORS = [
	"#2563eb",
	"#16a34a",
	"#d97706",
	"#dc2626",
	"#7c3aed",
	"#0891b2",
	"#db2777",
	"#65a30d",
];

interface Point {
	x: number;
	y: number;
	position: number | null;
	date: number;
}

interface Series {
	color: string;
	keyword: string;
	points: Point[];
}

function fmtDate(ms: number): string {
	return new Date(ms).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
	});
}

export function RankChart({
	annotations,
	snapshots,
}: {
	annotations: RankAnnotation[];
	snapshots: RankSnapshot[];
}) {
	const { annos, series, xLabels, yTicks, offY } = useMemo(() => {
		const times = snapshots.map((s) => new Date(s.createdAt).getTime());
		const positions = snapshots
			.map((s) => s.position)
			.filter((p): p is number => p !== null);

		const minT = times.length ? Math.min(...times) : 0;
		const maxT = times.length ? Math.max(...times) : 1;
		const spanT = maxT - minT || 1;
		// Rank 1 at the top; worst tracked rank (min 10) at the bottom band.
		const worst = Math.max(10, positions.length ? Math.max(...positions) : 10);

		const xFor = (t: number) =>
			PAD.left + (times.length <= 1 ? PLOT_W / 2 : ((t - minT) / spanT) * PLOT_W);
		// y for a real position (1..worst)
		const yFor = (p: number) =>
			PAD.top + ((p - 1) / (worst - 1 || 1)) * PLOT_H;
		// "Out of top 50" band, just below the plot.
		const offBandY = PAD.top + PLOT_H + 14;

		const byKeyword = new Map<string, RankSnapshot[]>();
		for (const s of snapshots) {
			const list = byKeyword.get(s.keyword);
			if (list) list.push(s);
			else byKeyword.set(s.keyword, [s]);
		}

		const built: Series[] = [...byKeyword.entries()].map(
			([keyword, rows], i) => ({
				color: SERIES_COLORS[i % SERIES_COLORS.length],
				keyword,
				points: rows
					.slice()
					.sort(
						(a, b) =>
							new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
					)
					.map((r) => {
						const date = new Date(r.createdAt).getTime();
						return {
							date,
							position: r.position,
							x: xFor(date),
							y: r.position === null ? offBandY : yFor(r.position),
						};
					}),
			}),
		);

		const ticks: Array<{ label: string; y: number }> = [];
		const step = worst <= 10 ? 2 : Math.ceil(worst / 5);
		for (let p = 1; p <= worst; p += step) {
			ticks.push({ label: `#${p}`, y: yFor(p) });
		}

		const labels =
			times.length <= 1
				? [{ label: fmtDate(minT), x: PAD.left + PLOT_W / 2 }]
				: [
						{ label: fmtDate(minT), x: PAD.left },
						{ label: fmtDate(maxT), x: PAD.left + PLOT_W },
					];

		const annos = annotations
			.filter((a) => a.date)
			.map((a) => {
				const t = new Date(a.date as string).getTime();
				return { anno: a, x: xFor(t), visible: t >= minT && t <= maxT };
			})
			.filter((a) => a.visible);

		return {
			offY: offBandY,
			series: built,
			xLabels: labels,
			yTicks: ticks,
			annos,
		} as {
			series: Series[];
			xLabels: Array<{ label: string; x: number }>;
			yTicks: Array<{ label: string; y: number }>;
			offY: number;
			annos: Array<{ anno: RankAnnotation; x: number }>;
		};
	}, [snapshots, annotations]);

	if (!snapshots.length) {
		return (
			<div className="flex h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
				No rank history yet — run a check to start tracking positions.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="w-full overflow-x-auto">
				<svg
					className="h-auto w-full"
					preserveAspectRatio="xMidYMid meet"
					role="img"
					aria-label="Keyword ranking over time"
					viewBox={`0 0 ${W} ${H}`}
				>
					{/* Grid + y labels */}
					{yTicks.map((t) => (
						<g key={t.label}>
							<line
								className="stroke-border"
								strokeDasharray="2 3"
								x1={PAD.left}
								x2={W - PAD.right}
								y1={t.y}
								y2={t.y}
							/>
							<text
								className="fill-muted-foreground"
								fontSize="10"
								textAnchor="end"
								x={PAD.left - 6}
								y={t.y + 3}
							>
								{t.label}
							</text>
						</g>
					))}

					{/* "Out of top 50" baseline */}
					<text
						className="fill-muted-foreground"
						fontSize="9"
						textAnchor="end"
						x={PAD.left - 6}
						y={offY + 3}
					>
						out
					</text>

					{/* Listing-change annotations */}
					{annos.map((a, i) => (
						<g key={`${a.anno.field}-${a.anno.language}-${i}`}>
							<line
								className="stroke-amber-500"
								strokeDasharray="3 3"
								strokeWidth={1}
								x1={a.x}
								x2={a.x}
								y1={PAD.top}
								y2={PAD.top + PLOT_H}
							/>
							<circle className="fill-amber-500" cx={a.x} cy={PAD.top} r={3}>
								<title>
									{a.anno.field} · {a.anno.language} ·{" "}
									{a.anno.date ? fmtDate(new Date(a.anno.date).getTime()) : ""}
								</title>
							</circle>
						</g>
					))}

					{/* X labels */}
					{xLabels.map((l) => (
						<text
							key={l.label + l.x}
							className="fill-muted-foreground"
							fontSize="10"
							textAnchor="middle"
							x={l.x}
							y={H - PAD.bottom + 28}
						>
							{l.label}
						</text>
					))}

					{/* Series lines + points */}
					{series.map((s) => {
						const segments: string[] = [];
						let started = false;
						for (const p of s.points) {
							if (p.position === null) {
								started = false;
								continue;
							}
							segments.push(`${started ? "L" : "M"}${p.x},${p.y}`);
							started = true;
						}
						return (
							<g key={s.keyword}>
								{segments.length > 0 && (
									<path
										d={segments.join(" ")}
										fill="none"
										stroke={s.color}
										strokeWidth={2}
									/>
								)}
								{s.points.map((p) => (
									<circle
										key={`${s.keyword}-${p.date}`}
										cx={p.x}
										cy={p.y}
										fill={p.position === null ? "transparent" : s.color}
										r={3.5}
										stroke={s.color}
										strokeWidth={p.position === null ? 1.5 : 0}
									>
										<title>
											{s.keyword}:{" "}
											{p.position === null ? "not in top 50" : `#${p.position}`} ·{" "}
											{fmtDate(p.date)}
										</title>
									</circle>
								))}
							</g>
						);
					})}
				</svg>
			</div>

			{/* Legend */}
			<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
				{series.map((s) => (
					<span key={s.keyword} className="inline-flex items-center gap-1.5">
						<span
							className="inline-block h-2.5 w-2.5 rounded-full"
							style={{ backgroundColor: s.color }}
						/>
						{s.keyword}
					</span>
				))}
				<span className="inline-flex items-center gap-1.5 text-muted-foreground">
					<span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
					listing change
				</span>
			</div>
		</div>
	);
}
