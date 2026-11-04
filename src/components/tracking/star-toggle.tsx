"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Marks a keyword as one of the team's own targets. Without an id (history of
 * a phrase that is no longer tracked) there is nothing to star.
 */
export function StarToggle({
  className,
  disabled = false,
  keyword,
  onToggle,
  starred,
  title,
}: {
  className?: string;
  disabled?: boolean;
  keyword: string;
  onToggle: () => void;
  starred: boolean;
  /** Overrides the default hint, e.g. why the star is disabled. */
  title?: string;
}) {
  return (
    <button
      aria-label={starred ? `Unstar ${keyword}` : `Star ${keyword}`}
      aria-pressed={starred}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        starred && "text-amber-500 hover:text-amber-500",
        className,
      )}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      title={
        title ??
        (starred ? "Starred: one of your keywords" : "Star as one of your keywords")
      }
      type="button"
    >
      <Star aria-hidden className={cn("h-4 w-4", starred && "fill-current")} />
    </button>
  );
}
