"use client";

import { Star } from "lucide-react";

import type { KeywordFilter } from "@/lib/starred-keywords";
import { cn } from "@/lib/utils";

const OPTION_CLASSES =
  "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors";

/** Segmented "Starred / All" switch for a keyword list. */
export function StarredFilter({
  allCount,
  filter,
  onChange,
  starredCount,
}: {
  allCount: number;
  filter: KeywordFilter;
  onChange: (next: KeywordFilter) => void;
  starredCount: number;
}) {
  return (
    <div
      aria-label="Show keywords"
      className="inline-flex items-center rounded-md border bg-muted/40 p-0.5"
      role="group"
    >
      <button
        aria-pressed={filter === "starred"}
        className={cn(
          OPTION_CLASSES,
          filter === "starred"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => onChange("starred")}
        type="button"
      >
        <Star aria-hidden className="h-3.5 w-3.5" />
        Starred ({starredCount})
      </button>
      <button
        aria-pressed={filter === "all"}
        className={cn(
          OPTION_CLASSES,
          filter === "all"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => onChange("all")}
        type="button"
      >
        All ({allCount})
      </button>
    </div>
  );
}
