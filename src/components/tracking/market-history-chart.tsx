"use client";

import { type KeyboardEvent, type PointerEvent, useMemo, useState } from "react";

import {
  axisTickIndexes,
  formatHistoryDay,
  formatMetric,
  MARKET_METRIC_INFO,
  MARKET_METRICS,
  type MarketDay,
  type MarketMetric,
  metricValues,
} from "@/lib/market-history";
import { cn } from "@/lib/utils";

// Design-space canvas; scales to the popover width via the viewBox.
const W = 440;
const H = 180;
const PAD = { bottom: 22, left: 34, right: 34, top: 10 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const X_TICKS = 4;
const Y_TICKS = 4;
const COUNT_METRICS: MarketMetric[] = ["ranked", "top10", "top50"];

interface Scale {
  ticks: Array<{ label: string; value: number }>;
  y: (value: number) => number;
}

/** 0 at the bottom, a round maximum at the top. */
function countScale(max: number): Scale {
  const step = Math.max(1, Math.ceil(max / Y_TICKS));
  const top = step * Y_TICKS;
  const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) => ({
    label: String(i * step),
    value: i * step,
  }));
  return { ticks, y: (v) => PAD.top + PLOT_H - (v / top) * PLOT_H };
}

/** Positions: the best (lowest) at the top. */
function rankScale(min: number, max: number): Scale {
  const low = Math.max(1, Math.floor(min));
  const high = Math.max(low + 1, Math.ceil(max));
  const step = Math.max(1, Math.ceil((high - low) / Y_TICKS));
  const ticks: Scale["ticks"] = [];
  for (let v = low; v <= high; v += step) ticks.push({ label: `#${v}`, value: v });
  return { ticks, y: (v) => PAD.top + ((v - low) / (high - low)) * PLOT_H };
}

function linePath(values: Array<number | null>, x: (i: number) => number, y: (v: number) => number) {
  // A missed day breaks the line: joining across it would draw a movement
  // nobody measured.
  let started = false;
  const parts: string[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      started = false;
      return;
    }
    parts.push(`${started ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    started = true;
  });
  return parts.join(" ");
}

/**
 * The market table's numbers day by day for one market: ranked, top 10 and
 * top 50 on a count axis, the median position on its own axis with #1 on
 * top. Pointer or arrow keys pick a day; its values read out above the plot.
 */
export function MarketHistoryChart({
  days,
  initialMetric,
}: {
  days: MarketDay[];
  initialMetric: MarketMetric;
}) {
  const [shown, setShown] = useState<MarketMetric[]>([initialMetric]);
  const [active, setActive] = useState<number | null>(null);
  const activeIndex = active ?? days.length - 1;

  const chart = useMemo(() => {
    const series = Object.fromEntries(
      MARKET_METRICS.map((m) => [m.key, metricValues(days, m.key)]),
    ) as Record<MarketMetric, Array<number | null>>;
    const counts = shown.filter((m) => COUNT_METRICS.includes(m));
    const countMax = Math.max(
      1,
      ...counts.flatMap((m) => series[m].filter((v): v is number => v !== null)),
    );
    const medians = series.median.filter((v): v is number => v !== null);
    const x = (i: number) =>
      PAD.left + (days.length <= 1 ? PLOT_W / 2 : (i / (days.length - 1)) * PLOT_W);
    return {
      count: counts.length ? countScale(countMax) : null,
      rank:
        shown.includes("median") && medians.length
          ? rankScale(Math.min(...medians), Math.max(...medians))
          : null,
      series,
      x,
    };
  }, [days, shown]);

  if (!days.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No measurements in this market yet.
      </p>
    );
  }

  const { count, rank, series, x } = chart;
  const scaleFor = (metric: MarketMetric) =>
    metric === "median" ? rank : count;
  // The left axis belongs to the counts; the rank axis moves there when it is
  // the only one shown.
  const leftAxis = count ?? rank;
  const rightAxis = count && rank ? rank : null;
  const activeDay = days[activeIndex];

  const toggle = (metric: MarketMetric) =>
    setShown((current) =>
      current.includes(metric)
        ? current.length > 1
          ? current.filter((m) => m !== metric)
          : current
        : MARKET_METRICS.map((m) => m.key).filter(
            (m) => m === metric || current.includes(m),
          ),
    );

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || days.length <= 1) return;
    const plotX = ((event.clientX - rect.left) / rect.width) * W - PAD.left;
    const index = Math.round((plotX / PLOT_W) * (days.length - 1));
    setActive(Math.min(days.length - 1, Math.max(0, index)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: activeIndex - 1,
      ArrowRight: activeIndex + 1,
      End: days.length - 1,
      Home: 0,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setActive(Math.min(days.length - 1, Math.max(0, moves[event.key])));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Metrics">
        {MARKET_METRICS.map((m) => {
          const on = shown.includes(m.key);
          return (
            <button
              key={m.key}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs",
                on ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
              )}
              onClick={() => toggle(m.key)}
              type="button"
            >
              <span
                className="inline-block h-2 w-2 rounded-full border"
                style={{ backgroundColor: on ? m.color : undefined, borderColor: m.color }}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="min-h-8 text-xs" data-testid="market-history-readout">
        <span className="font-medium">{formatHistoryDay(activeDay.day)}</span>
        {activeDay.point ? (
          <>
            {MARKET_METRICS.map((m) => (
              <span key={m.key} className="ml-2 tabular-nums">
                <span className="text-muted-foreground">{m.label}</span>{" "}
                <span style={{ color: shown.includes(m.key) ? m.color : undefined }}>
                  {formatMetric(m.key, activeDay.point?.[m.key] ?? null)}
                </span>
              </span>
            ))}
            <span className="block text-muted-foreground">
              {activeDay.point.measured} of {activeDay.point.tracked} keywords measured that day
            </span>
          </>
        ) : (
          <span className="ml-2 text-muted-foreground">no check that day</span>
        )}
      </div>

      <div
        aria-label={`Day by day, ${formatHistoryDay(days[0].day)} to ${formatHistoryDay(days[days.length - 1].day)}. Arrow keys move between days.`}
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={onKeyDown}
        role="group"
        tabIndex={0}
      >
        <svg
          aria-hidden="true"
          className="h-auto w-full touch-none"
          onPointerLeave={() => setActive(null)}
          onPointerMove={onPointerMove}
          viewBox={`0 0 ${W} ${H}`}
        >
          {leftAxis?.ticks.map((t) => (
            <g key={`l${t.value}`}>
              <line
                className="stroke-border"
                strokeDasharray="2 3"
                x1={PAD.left}
                x2={W - PAD.right}
                y1={leftAxis.y(t.value)}
                y2={leftAxis.y(t.value)}
              />
              <text
                className="fill-muted-foreground"
                fontSize="9"
                textAnchor="end"
                x={PAD.left - 5}
                y={leftAxis.y(t.value) + 3}
              >
                {t.label}
              </text>
            </g>
          ))}
          {rightAxis?.ticks.map((t) => (
            <text
              key={`r${t.value}`}
              fill={MARKET_METRIC_INFO.median.color}
              fontSize="9"
              x={W - PAD.right + 5}
              y={rightAxis.y(t.value) + 3}
            >
              {t.label}
            </text>
          ))}
          {axisTickIndexes(days.length, X_TICKS).map((i) => (
            <text
              key={`x${i}`}
              className="fill-muted-foreground"
              fontSize="9"
              textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}
              x={x(i)}
              y={H - 6}
            >
              {formatHistoryDay(days[i].day)}
            </text>
          ))}

          <line
            className="stroke-muted-foreground/60"
            x1={x(activeIndex)}
            x2={x(activeIndex)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
          />

          {MARKET_METRICS.filter((m) => shown.includes(m.key)).map((m) => {
            const scale = scaleFor(m.key);
            if (!scale) return null;
            const values = series[m.key];
            const value = values[activeIndex];
            return (
              <g key={m.key} data-metric={m.key}>
                <path
                  d={linePath(values, x, scale.y)}
                  fill="none"
                  stroke={m.color}
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
                {/* A lone measured day between gaps still shows up. */}
                {values.map((v, i) =>
                  v !== null && values[i - 1] == null && values[i + 1] == null ? (
                    <circle key={i} cx={x(i)} cy={scale.y(v)} fill={m.color} r={2} />
                  ) : null,
                )}
                {value !== null && (
                  <circle
                    cx={x(activeIndex)}
                    cy={scale.y(value)}
                    fill={m.color}
                    r={3.5}
                    stroke="white"
                    strokeWidth={1}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
