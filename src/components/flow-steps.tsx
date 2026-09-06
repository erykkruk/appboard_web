"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The three steps between "I have an app" and "I know what to fix". Shown
 * while you are inside them, so the flow is visible instead of implied by
 * whichever screen happens to load next.
 */
const STEPS = [
  { id: "add", label: "Add the app" },
  { id: "text", label: "Your text" },
  { id: "audit", label: "Audit and fixes" },
  { id: "publish", label: "Publish or copy" },
] as const;

export type FlowStepId = (typeof STEPS)[number]["id"];

export function FlowSteps({ current }: { current: FlowStepId }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-semibold text-[11px]",
                done && "bg-emerald-600 text-white",
                active && "bg-foreground text-background",
                !done && !active && "border border-muted-foreground/40 text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-border sm:w-10" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
