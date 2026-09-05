"use client";

import { Badge } from "@/components/ui/badge";
import type { App } from "@/lib/types";

import { PLATFORM_LABELS } from "./bulk-parts";

interface BulkTargetChipsProps {
  apps: App[];
}

export function BulkTargetChips({ apps }: BulkTargetChipsProps) {
  if (apps.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No targets yet. Tick at least one more app in the app switcher, or pick
        a different source.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {apps.map((app) => (
        <Badge
          key={app.id}
          variant="outline"
          className="gap-1.5 py-1 pr-2.5 pl-1.5 font-normal"
        >
          {app.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.iconUrl}
              alt=""
              className="h-4 w-4 rounded"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="h-4 w-4 rounded bg-muted" />
          )}
          <span className="max-w-[200px] truncate">{app.name}</span>
          <span className="text-muted-foreground">
            {PLATFORM_LABELS[app.platform]}
          </span>
        </Badge>
      ))}
    </div>
  );
}
