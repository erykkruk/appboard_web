"use client";

import { useEffect, useRef, useState } from "react";

import { MarketHistoryChart } from "@/components/tracking/market-history-chart";
import { Sparkline } from "@/components/tracking/sparkline";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatHistoryDay,
  hasTrend,
  MARKET_METRIC_INFO,
  type MarketDay,
  type MarketMetric,
  metricValues,
} from "@/lib/market-history";

/** Hover this long before the chart opens, so sweeping across a row does not flash charts. */
export const HOVER_OPEN_DELAY_MS = 200;
/** Time to move the pointer from the sparkline into the chart. */
export const HOVER_CLOSE_DELAY_MS = 250;

const SPARKLINE_WIDTH = 48;
const SPARKLINE_HEIGHT = 16;

/**
 * A small trend of one market-table number. Hover (after a short delay),
 * focus + Enter or a tap opens the larger day-by-day chart; a click pins it
 * open until Escape, a second click or a click elsewhere. Hidden on narrow
 * screens, where the table has no room for it.
 */
export function MarketTrendSparkline({
  days,
  marketName,
  metric,
}: {
  days: MarketDay[];
  marketName: string;
  metric: MarketMetric;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHover = useRef(false);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const info = MARKET_METRIC_INFO[metric];
  const values = metricValues(days, metric);
  if (!hasTrend(values)) {
    return (
      <span aria-hidden="true" className="hidden w-[52px] lg:inline-block" />
    );
  }

  const schedule = (next: boolean, delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next) openedByHover.current = true;
      setOpen(next);
    }, delay);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const hoverOpen = () => {
    if (!open) schedule(true, HOVER_OPEN_DELAY_MS);
    else cancel();
  };
  const hoverClose = () => {
    if (!pinned) schedule(false, HOVER_CLOSE_DELAY_MS);
    else cancel();
  };

  const first = days[0].day;
  const last = days[days.length - 1].day;
  const label = `${info.label} in ${marketName}, ${formatHistoryDay(first)} to ${formatHistoryDay(last)}: open the day-by-day chart`;

  return (
    <Popover
      onOpenChange={(next) => {
        cancel();
        setOpen(next);
        if (!next) setPinned(false);
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <button
          aria-label={label}
          className="hidden rounded-sm p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
          onClick={(event) => {
            // Picking the chart is not picking the market row.
            event.stopPropagation();
            event.preventDefault();
            cancel();
            if (open && pinned) {
              setOpen(false);
              setPinned(false);
              return;
            }
            openedByHover.current = false;
            setPinned(true);
            setOpen(true);
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") hoverOpen();
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") hoverClose();
          }}
          type="button"
        >
          <Sparkline
            height={SPARKLINE_HEIGHT}
            invert={info.lowerIsBetter}
            lowerIsBetter={info.lowerIsBetter}
            values={values}
            width={SPARKLINE_WIDTH}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(30rem,calc(100vw-2rem))]"
        onClick={(event) => event.stopPropagation()}
        onOpenAutoFocus={(event) => {
          // A chart that opened on hover must not pull focus away from the table.
          if (openedByHover.current) event.preventDefault();
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") cancel();
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") hoverClose();
        }}
      >
        <PopoverHeader className="mb-3">
          <PopoverTitle>
            {info.label} in {marketName}
          </PopoverTitle>
          <PopoverDescription className="text-xs">
            Day by day, not counting your app name. Each day shows every keyword at its last check up to that day.
          </PopoverDescription>
        </PopoverHeader>
        <MarketHistoryChart days={days} initialMetric={metric} />
      </PopoverContent>
    </Popover>
  );
}
