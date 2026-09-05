"use client";

import { ArrowRight } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { App, BulkCopyChange, BulkCopyPreview } from "@/lib/types";

import { BULK_PART_LABELS, PLATFORM_LABELS, truncateText } from "./bulk-parts";

interface BulkPreviewTableProps {
  preview: BulkCopyPreview;
  appsById: Map<string, App>;
}

interface ChangeGroup {
  appId: string;
  appName: string;
  changes: BulkCopyChange[];
}

/** Groups in first-seen order, so the table follows the API's own ordering. */
function groupByApp(changes: BulkCopyChange[]): ChangeGroup[] {
  const groups = new Map<string, ChangeGroup>();
  for (const change of changes) {
    const group = groups.get(change.appId);
    if (group) {
      group.changes.push(change);
    } else {
      groups.set(change.appId, {
        appId: change.appId,
        appName: change.appName,
        changes: [change],
      });
    }
  }
  return [...groups.values()];
}

function ValueCell({ value }: { value: string | null }) {
  if (value === null || value.trim() === "") {
    return <span className="text-muted-foreground italic">(empty)</span>;
  }
  return <span title={value}>{truncateText(value)}</span>;
}

export function BulkPreviewTable({ preview, appsById }: BulkPreviewTableProps) {
  const groups = useMemo(() => groupByApp(preview.changes), [preview.changes]);

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing to change - the targets already match the source for the
          parts you picked.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Part</TableHead>
                <TableHead className="w-[160px]">Field</TableHead>
                <TableHead className="w-[90px]">Language</TableHead>
                <TableHead>Before</TableHead>
                <TableHead className="w-6" />
                <TableHead>After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => {
                const platform = appsById.get(group.appId)?.platform;
                return [
                  <TableRow key={`${group.appId}-header`} className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={6} className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {group.appName}
                        {platform && (
                          <span className="font-normal text-muted-foreground">
                            {PLATFORM_LABELS[platform]}
                          </span>
                        )}
                        <Badge variant="secondary">
                          {group.changes.length}{" "}
                          {group.changes.length === 1 ? "change" : "changes"}
                        </Badge>
                      </span>
                    </TableCell>
                  </TableRow>,
                  ...group.changes.map((change, index) => (
                    <TableRow key={`${group.appId}-${change.part}-${change.field}-${change.language ?? ""}-${index}`}>
                      <TableCell>{BULK_PART_LABELS[change.part]}</TableCell>
                      <TableCell className="font-medium">{change.field}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {change.language ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-[320px] text-muted-foreground">
                        <ValueCell value={change.before} />
                      </TableCell>
                      <TableCell className="px-0 text-muted-foreground">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <ValueCell value={change.after} />
                      </TableCell>
                    </TableRow>
                  )),
                ];
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {preview.skipped.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-sm">
            Skipped ({preview.skipped.length})
          </p>
          <ul className="space-y-1 text-sm">
            {preview.skipped.map((item, index) => (
              <li
                key={`${item.appId}-${item.part}-${index}`}
                className="flex flex-wrap items-baseline gap-x-2"
              >
                <span className="font-medium">{item.appName}</span>
                <Badge variant="outline">{BULK_PART_LABELS[item.part]}</Badge>
                <span className="text-muted-foreground">{item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
