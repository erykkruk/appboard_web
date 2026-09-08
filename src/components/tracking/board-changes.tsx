"use client";

import { Badge } from "@/components/ui/badge";
import type { BoardChange } from "@/lib/types";

function truncate(value: string | null, max = 140): string {
  if (!value) return "(empty)";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

/**
 * What we changed and when, next to the rankings those changes were meant to
 * move. Without the before-after pair a chart marker only says "something
 * happened here".
 */
export function BoardChanges({ changes }: { changes: BoardChange[] }) {
  if (!changes.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No listing change recorded yet. Publishing a field, or marking one as
        pasted into the store, adds it here and marks it on the charts.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change) => (
        <div
          className={`space-y-1 border-l-2 pl-3 ${
            change.type === "listing_field"
              ? "border-amber-500"
              : "border-sky-500"
          }`}
          key={`${change.date}-${change.field}-${change.language}`}
        >
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {new Date(change.date).toLocaleDateString()}
            <span className="text-muted-foreground">{change.label}</span>
            {change.language ? (
              <Badge variant="secondary">{change.language}</Badge>
            ) : null}
          </p>
          {change.type === "listing_field" ? (
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <p className="line-through">{truncate(change.oldValue)}</p>
              <p className="text-foreground">{truncate(change.newValue)}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
