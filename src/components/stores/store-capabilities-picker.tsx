"use client";

import { Info, Lock } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { StoreCapabilityDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Default checked selection for a fresh connection: every capability that is
 * actually usable via an API key (core is always on, plus everything the
 * backend has wired). `consoleOnly` capabilities are never part of the
 * selection — they can only be managed in the store console.
 */
export function initialCapabilitySelection(
  capabilities: StoreCapabilityDefinition[],
): string[] {
  return capabilities
    .filter((c) => !c.consoleOnly && (c.core || c.wired))
    .map((c) => c.id);
}

interface StoreCapabilitiesPickerProps {
  /** Capability definitions for a single store type. */
  capabilities: StoreCapabilityDefinition[];
  /** Currently checked capability ids (includes core, excludes consoleOnly). */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function StoreCapabilitiesPicker({
  capabilities,
  value,
  onChange,
  disabled = false,
  className,
}: StoreCapabilitiesPickerProps) {
  const byId = useMemo(() => {
    const map = new Map<string, StoreCapabilityDefinition>();
    for (const c of capabilities) map.set(c.id, c);
    return map;
  }, [capabilities]);

  const nameOf = (id: string) => byId.get(id)?.name ?? id;

  const isAvailable = (def: StoreCapabilityDefinition) =>
    def.dependsOn.every((dep) => value.includes(dep));

  const toggle = (def: StoreCapabilityDefinition, next: boolean) => {
    if (def.core || def.consoleOnly) return;
    if (next) {
      if (!value.includes(def.id)) onChange([...value, def.id]);
      return;
    }
    // Remove the capability and cascade to anything that depends on it.
    const toRemove = new Set<string>([def.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of capabilities) {
        if (c.core || toRemove.has(c.id) || !value.includes(c.id)) continue;
        if (c.dependsOn.some((dep) => toRemove.has(dep))) {
          toRemove.add(c.id);
          changed = true;
        }
      }
    }
    onChange(value.filter((id) => !toRemove.has(id)));
  };

  const consoleOnly = capabilities.filter((c) => c.consoleOnly);
  const toggleable = capabilities.filter((c) => !c.consoleOnly);

  return (
    <div className={cn("space-y-2", className)}>
      {toggleable.map((def) => {
        const available = isAvailable(def);
        const checked = def.core || (value.includes(def.id) && available);
        const rowDisabled = disabled || def.core || !available;
        const missingDeps = def.dependsOn.filter((dep) => !value.includes(dep));
        return (
          <label
            key={def.id}
            htmlFor={`cap-${def.id}`}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 transition-colors",
              rowDisabled ? "cursor-default" : "cursor-pointer hover:border-foreground/30",
            )}
          >
            <Checkbox
              id={`cap-${def.id}`}
              className="mt-0.5"
              checked={checked}
              disabled={rowDisabled}
              onCheckedChange={(c) => toggle(def, c === true)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{def.name}</span>
                {def.core && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Lock className="h-2.5 w-2.5" /> Always on
                  </Badge>
                )}
                {!def.wired && !def.core && (
                  <Badge variant="outline" className="text-[10px]">
                    Coming soon
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{def.description}</p>
              {!available && missingDeps.length > 0 && (
                <p className="mt-1 text-xs text-amber-500">
                  Requires {missingDeps.map(nameOf).join(", ")}
                </p>
              )}
            </div>
          </label>
        );
      })}

      {consoleOnly.map((def) => (
        <div
          key={def.id}
          className="flex items-start gap-3 rounded-lg border border-dashed p-3"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{def.name}</p>
            <p className="text-xs text-muted-foreground">
              Managed in Google Play Console — can&apos;t be set via the API key.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
