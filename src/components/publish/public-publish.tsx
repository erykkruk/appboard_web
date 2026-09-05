"use client";

import Link from "next/link";
import { Copy, Download, KeyRound } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { InlineDiff } from "@/components/diff/inline-diff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useListingDiffs } from "@/hooks/use-listing-diffs";
import { computeDiff } from "@/lib/diff";
import { getListingFieldLabel } from "@/lib/field-labels";
import type { ListingDiff } from "@/lib/types";

/** Plain text a person can paste into a store console, field by field. */
function changesAsText(diffs: ListingDiff[]): string {
  return diffs
    .map((d) =>
      [
        `== ${d.language} ==`,
        ...d.fields.map(
          (f) => `${getListingFieldLabel(f.field)}:\n${f.newValue ?? ""}`,
        ),
      ].join("\n\n"),
    )
    .join("\n\n\n");
}

function csvCell(value: string | null): string {
  return `"${(value ?? "").replace(/"/g, '""')}"`;
}

function changesAsCsv(diffs: ListingDiff[]): string {
  const rows = [["language", "field", "store value", "new value"].join(",")];
  for (const d of diffs) {
    for (const f of d.fields) {
      rows.push(
        [d.language, f.field, csvCell(f.oldValue), csvCell(f.newValue)].join(","),
      );
    }
  }
  return rows.join("\n");
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied - paste it into the store console`);
  } catch {
    toast.error("Could not copy");
  }
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Publish for an app that has no store API connection. The work done in the
 * panel must still have a way out: the full diff, copyable per field, plus a
 * CSV - and one honest sentence about what the API would add. A screen that
 * only says "connect the API" turns every draft into a paywall.
 */
export function PublicPublishView({
  appId,
  appName,
  storeType,
}: {
  appId: string;
  appName: string;
  storeType?: string;
}) {
  const diffs = useListingDiffs(appId);
  const list = useMemo(() => diffs.data ?? [], [diffs.data]);
  const changed = list.reduce((n, d) => n + d.fields.length, 0);
  const consoleName =
    storeType === "google_play" ? "Google Play Console" : "App Store Connect";
  const connectHref = storeType ? `/onboarding?type=${storeType}` : "/onboarding";

  if (diffs.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl tracking-tight">Publish</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {changed === 0
              ? "Your drafts match the store. Nothing to take across yet."
              : `${changed} change${changed === 1 ? "" : "s"} in ${list.length} language${list.length === 1 ? "" : "s"}, ready to paste into ${consoleName}.`}
          </p>
        </div>
        {changed > 0 && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => copy(changesAsText(list), "All changes")}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy all changes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                download(
                  `${appName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-listing-changes.csv`,
                  changesAsCsv(list),
                )
              }
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {list.map((d) => (
        <Card key={d.language}>
          <CardHeader>
            <CardTitle className="text-base">
              {d.language}
              <Badge variant="outline" className="ml-2 font-normal">
                {d.fields.length} field{d.fields.length === 1 ? "" : "s"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {d.fields.map((f) => {
              const { segments, mode } = computeDiff(f.oldValue ?? "", f.newValue ?? "");
              return (
                <div key={f.field} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{getListingFieldLabel(f.field)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(f.newValue ?? "", getListingFieldLabel(f.field))}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3 font-mono text-sm">
                    {f.oldValue ? (
                      <InlineDiff segments={segments} mode={mode === "line" ? "line-by-line" : "inline"} />
                    ) : (
                      <span className="rounded bg-green-500/20 px-0.5 text-green-400 whitespace-pre-wrap">
                        {f.newValue}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
          <p className="text-muted-foreground">
            <KeyRound className="mr-1 inline h-3.5 w-3.5" />
            With the store API connected, this becomes one button: the changes
            go to {consoleName}, screenshots upload, and reviews get answered
            from here.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={connectHref}>Connect the store API</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
