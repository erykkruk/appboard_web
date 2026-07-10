"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

export function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted-foreground">—</span>;
  if (delta === 0)
    return (
      <span className="inline-flex items-center text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600">
        <ArrowUp className="h-3.5 w-3.5" />
        {delta}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-red-600">
      <ArrowDown className="h-3.5 w-3.5" />
      {Math.abs(delta)}
    </span>
  );
}
