"use client";

import { AlertTriangle } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { BulkCopyPart } from "@/lib/types";
import { cn } from "@/lib/utils";

import { BULK_PART_DEFINITIONS } from "./bulk-parts";

interface BulkPartPickerProps {
  selected: Set<BulkCopyPart>;
  onToggle: (part: BulkCopyPart) => void;
  disabled?: boolean;
}

export function BulkPartPicker({
  selected,
  onToggle,
  disabled = false,
}: BulkPartPickerProps) {
  return (
    <div className="divide-y rounded-lg border">
      {BULK_PART_DEFINITIONS.map((part) => {
        const inputId = `bulk-part-${part.id}`;
        return (
          <div key={part.id} className="flex items-start gap-3 px-4 py-3">
            <Checkbox
              id={inputId}
              checked={selected.has(part.id)}
              disabled={disabled}
              onCheckedChange={() => onToggle(part.id)}
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <Label htmlFor={inputId} className="cursor-pointer font-medium">
                {part.label}
              </Label>
              <p
                className={cn(
                  "flex items-start gap-1.5 text-sm",
                  part.overwritesDrafts
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {part.overwritesDrafts && (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span>{part.description}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
