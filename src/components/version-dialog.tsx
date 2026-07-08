"use client";

import packageJson from "../../package.json";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { CHANGELOG } from "@/lib/changelog";

export function VersionDialog() {
  const [open, setOpen] = useState(false);

  const health = useQuery({
    enabled: open,
    queryFn: () => api.system.health(),
    queryKey: ["system-health"],
    retry: false,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] text-white underline underline-offset-2 transition-opacity hover:opacity-80"
      >
        v{packageJson.version}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AppBoard</DialogTitle>
            <DialogDescription>Version info and release notes</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Panel version</span>
              <span className="tabular-nums">v{packageJson.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Server version</span>
              <span className="tabular-nums">
                {health.isLoading
                  ? "…"
                  : health.data
                    ? `v${health.data.version}`
                    : "unavailable"}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-5">
            {CHANGELOG.map((entry) => (
              <div key={entry.version} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">v{entry.version}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.date} · server v{entry.serverVersion}
                  </p>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {entry.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
