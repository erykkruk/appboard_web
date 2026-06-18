"use client";

import { CheckCircle2, FileText, Image as ImageIcon, Languages, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublishReportItem } from "@/lib/types";

const KIND_LABELS: Record<
  PublishReportItem["kind"],
  { label: string; icon: typeof FileText }
> = {
  asset: { label: "Assets", icon: ImageIcon },
  listing: { label: "Listings", icon: FileText },
  localization: { label: "Localizations", icon: Languages },
};

const KIND_ORDER: PublishReportItem["kind"][] = [
  "listing",
  "asset",
  "localization",
];

interface PublishReportProps {
  report: PublishReportItem[];
  className?: string;
}

function groupByKind(report: PublishReportItem[]) {
  const groups = new Map<PublishReportItem["kind"], PublishReportItem[]>();
  for (const item of report) {
    const list = groups.get(item.kind) ?? [];
    list.push(item);
    groups.set(item.kind, list);
  }
  return KIND_ORDER.filter((kind) => groups.has(kind)).map((kind) => ({
    kind,
    items: groups.get(kind) ?? [],
  }));
}

export function PublishReport({ report, className }: PublishReportProps) {
  if (report.length === 0) return null;

  const published = report.filter((r) => r.status === "published").length;
  const failed = report.filter((r) => r.status === "failed").length;
  const hasFailures = failed > 0;
  const groups = groupByKind(report);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        {hasFailures ? (
          <XCircle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
        <span className="text-sm font-medium">
          {hasFailures
            ? `${published} published, ${failed} failed`
            : `${published} published`}
        </span>
        {hasFailures && (
          <Badge variant="destructive" className="text-xs">
            Partial failure
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {groups.map(({ kind, items }) => {
          const { label, icon: Icon } = KIND_LABELS[kind];
          const groupFailed = items.filter(
            (i) => i.status === "failed",
          ).length;
          return (
            <div key={kind} className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                <Badge variant="outline" className="text-[10px]">
                  {items.length - groupFailed}/{items.length}
                </Badge>
              </div>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li
                    key={`${item.kind}-${item.ref}`}
                    className={cn(
                      "flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                      item.status === "failed"
                        ? "border-red-500/20 bg-red-500/5"
                        : "border-border bg-muted/40",
                    )}
                  >
                    {item.status === "failed" ? (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs">{item.ref}</span>
                      {item.status === "failed" && item.error && (
                        <p className="mt-0.5 text-xs text-red-500/90">
                          {item.error}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
