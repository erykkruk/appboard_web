"use client";

import type { BoardChange, BoardRankPoint } from "@/lib/types";

const W = 320;
const H = 116;
const PAD = { bottom: 22, left: 30, right: 10, top: 12 };
/** How deep the rank scan goes; below it we know nothing, not "position 50". */
const DEPTH = 50;

/**
 * One keyword's position across every measurement.
 *
 * The Y axis is inverted (#1 on top) because a smaller number is better. A
 * measurement where the store did not show us is a BREAK in the line, never a
 * point at the bottom edge: "outside the top 50" is missing knowledge about
 * the position, not the fiftieth place, and drawing it would lie about how
 * far we fell. A dashed vertical line marks a day we changed the listing, so
 * a movement can be read as ours or as the market's.
 */
export function KeywordRankChart({
  points,
  changes = [],
}: {
  points: BoardRankPoint[];
  changes?: BoardChange[];
}) {
  if (points.length < 2) {
    return (
      <p className="text-xs text-muted-foreground">
        Needs a second measurement before a trend exists.
      </p>
    );
  }

  const x = (i: number) =>
    PAD.left + (i * (W - PAD.left - PAD.right)) / (points.length - 1);
  const y = (rank: number) =>
    PAD.top + ((Math.min(rank, DEPTH) - 1) / (DEPTH - 1)) * (H - PAD.top - PAD.bottom);

  const segments: string[] = [];
  let run: string[] = [];
  points.forEach((p, i) => {
    if (p.position === null) {
      if (run.length > 1) segments.push(run.join(" "));
      run = [];
      return;
    }
    run.push(`${x(i)},${y(p.position)}`);
  });
  if (run.length > 1) segments.push(run.join(" "));

  const ranked = points.filter((p) => p.position !== null);
  const first = ranked[0]?.position ?? null;
  const last = ranked[ranked.length - 1]?.position ?? null;
  const stroke =
    first === null || last === null || first === last
      ? "stroke-muted-foreground"
      : last < first
        ? "stroke-green-600 dark:stroke-green-500"
        : "stroke-red-600 dark:stroke-red-500";
  const fill =
    first === null || last === null || first === last
      ? "fill-muted-foreground"
      : last < first
        ? "fill-green-600 dark:fill-green-500"
        : "fill-red-600 dark:fill-red-500";

  // Only changes that fall inside the measured window can explain anything.
  const marks = changes
    .map((change) => {
      const day = change.date.slice(0, 10);
      const index = points.findIndex((p) => p.day >= day);
      return index <= 0 ? null : { change, x: (x(index - 1) + x(index)) / 2 };
    })
    .filter((m): m is { change: BoardChange; x: number } => m !== null);

  return (
    <svg
      className="h-auto w-full"
      role="img"
      aria-label="Position over time"
      viewBox={`0 0 ${W} ${H}`}
    >
      {[1, 10, 25, 50].map((rank) => (
        <g key={rank}>
          <line
            className="stroke-border"
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(rank)}
            y2={y(rank)}
          />
          <text
            className="fill-muted-foreground"
            fontSize="8"
            textAnchor="end"
            x={PAD.left - 5}
            y={y(rank) + 3}
          >
            #{rank}
          </text>
        </g>
      ))}

      {marks.map((mark) => (
        <line
          key={`${mark.change.date}-${mark.change.field}`}
          className="stroke-amber-500"
          opacity={0.55}
          strokeDasharray="3 3"
          x1={mark.x}
          x2={mark.x}
          y1={PAD.top}
          y2={H - PAD.bottom}
        >
          <title>
            {mark.change.date.slice(0, 10)}: {mark.change.label}
          </title>
        </line>
      ))}

      {segments.map((pts) => (
        <polyline
          key={pts}
          className={stroke}
          fill="none"
          points={pts}
          strokeWidth={2}
        />
      ))}

      {points.map((p, i) =>
        p.position === null ? (
          <circle
            key={p.day}
            className="fill-muted-foreground"
            cx={x(i)}
            cy={H - PAD.bottom + 6}
            opacity={0.5}
            r={2}
          >
            <title>{p.day}: measured, outside the top {DEPTH}</title>
          </circle>
        ) : (
          <circle key={p.day} className={fill} cx={x(i)} cy={y(p.position)} r={3}>
            <title>
              {p.day}: #{p.position}
            </title>
          </circle>
        ),
      )}

      <text
        className="fill-muted-foreground"
        fontSize="8"
        x={PAD.left}
        y={H - 4}
      >
        {points[0].day.slice(5)}
      </text>
      <text
        className="fill-muted-foreground"
        fontSize="8"
        textAnchor="end"
        x={W - PAD.right}
        y={H - 4}
      >
        {points[points.length - 1].day.slice(5)}
      </text>
    </svg>
  );
}
