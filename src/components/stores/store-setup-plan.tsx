"use client";

import { KeyRound, Server } from "lucide-react";

import type {
  StoreCapabilityDefinition,
  StoreSetupInfo,
  StoreType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export interface SetupPlan {
  roles: string[];
  apis: string[];
  note: string;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Derive the console roles + GCP APIs a user must grant/enable for their
 * selection: the union of every selected capability's `consoleRoles` and
 * `gcpApis`, plus the store type's base APIs and note.
 */
export function computeSetupPlan(
  capabilities: StoreCapabilityDefinition[],
  setup: StoreSetupInfo | undefined,
  selected: string[],
): SetupPlan {
  const selectedDefs = capabilities.filter((c) => selected.includes(c.id));
  const roles = unique(selectedDefs.flatMap((c) => c.consoleRoles));
  const apis = unique([
    ...(setup?.baseGcpApis ?? []),
    ...selectedDefs.flatMap((c) => c.gcpApis),
  ]);
  return { roles, apis, note: setup?.baseNote ?? "" };
}

interface StoreSetupPlanProps {
  capabilities: StoreCapabilityDefinition[];
  setup: StoreSetupInfo | undefined;
  selected: string[];
  storeType: StoreType;
  className?: string;
}

export function StoreSetupPlan({
  capabilities,
  setup,
  selected,
  storeType,
  className,
}: StoreSetupPlanProps) {
  const plan = computeSetupPlan(capabilities, setup, selected);
  const isGooglePlay = storeType === "google_play";
  const consoleName = isGooglePlay
    ? "Google Play Console"
    : "App Store Connect";

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">
            Roles to grant in {consoleName}
          </p>
        </div>
        {plan.roles.length > 0 ? (
          <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
            {plan.roles.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
        ) : (
          <p className="ml-6 text-sm text-muted-foreground">
            No extra roles required for this selection.
          </p>
        )}
      </div>

      {isGooglePlay && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">APIs to enable</p>
          </div>
          {plan.apis.length > 0 ? (
            <ul className="ml-6 list-disc space-y-1 font-mono text-xs text-muted-foreground">
              {plan.apis.map((apiName) => (
                <li key={apiName}>{apiName}</li>
              ))}
            </ul>
          ) : (
            <p className="ml-6 text-sm text-muted-foreground">
              No APIs to enable.
            </p>
          )}
          {plan.note && (
            <p className="mt-2 text-xs text-muted-foreground">{plan.note}</p>
          )}
        </div>
      )}
    </div>
  );
}
