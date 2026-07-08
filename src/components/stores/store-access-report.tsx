"use client";

import {
  CheckCircle2,
  HelpCircle,
  MinusCircle,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import type {
  CapabilityAccessResult,
  CapabilityAccessStatus,
  StoreCapabilityDefinition,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  CapabilityAccessStatus,
  {
    label: string;
    badgeClassName: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  granted: {
    label: "You have access",
    badgeClassName: "bg-green-500/10 text-green-500",
    icon: CheckCircle2,
  },
  missing: {
    label: "No access — grant the required role",
    badgeClassName: "bg-amber-500/10 text-amber-500",
    icon: TriangleAlert,
  },
  unsupported: {
    label: "Managed in the store console",
    badgeClassName: "bg-muted text-muted-foreground",
    icon: MinusCircle,
  },
  unknown: {
    label: "Confirmed after your first app syncs",
    badgeClassName: "bg-muted text-muted-foreground",
    icon: HelpCircle,
  },
  error: {
    label: "Error",
    badgeClassName: "bg-red-500/10 text-red-500",
    icon: XCircle,
  },
};

interface StoreAccessReportProps {
  results: CapabilityAccessResult[];
  /** Capability definitions used to resolve a friendly name for each id. */
  capabilities?: StoreCapabilityDefinition[];
  className?: string;
}

export function StoreAccessReport({
  results,
  capabilities,
  className,
}: StoreAccessReportProps) {
  const nameOf = (id: string) =>
    capabilities?.find((c) => c.id === id)?.name ?? id;

  if (results.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        No capabilities to report.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {results.map((result) => {
        const config = STATUS_CONFIG[result.status] ?? STATUS_CONFIG.unknown;
        const Icon = config.icon;
        return (
          <div
            key={result.id}
            className="flex items-start justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{nameOf(result.id)}</p>
              {result.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {result.detail}
                </p>
              )}
            </div>
            <Badge className={cn("shrink-0 gap-1", config.badgeClassName)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
