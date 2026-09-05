"use client";

import { Check, Eye, Loader2, MousePointerClick } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BulkPartPicker } from "@/components/bulk/bulk-part-picker";
import { BULK_PART_DEFINITIONS, PLATFORM_LABELS } from "@/components/bulk/bulk-parts";
import { BulkPreviewTable } from "@/components/bulk/bulk-preview-table";
import { BulkResultsTable } from "@/components/bulk/bulk-results-table";
import { BulkTargetChips } from "@/components/bulk/bulk-target-chips";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApps } from "@/hooks/use-apps";
import { useBulkApply, useBulkPreview } from "@/hooks/use-bulk-copy";
import { useAppSelection } from "@/lib/app-selection-context";
import type {
  BulkCopyPart,
  BulkCopyPreview,
  BulkCopyRequest,
  BulkCopyResult,
} from "@/lib/types";

interface PreviewSnapshot {
  /** Identifies the exact request the preview answers, so a changed selection cannot be applied unseen. */
  requestKey: string;
  data: BulkCopyPreview;
}

function buildRequestKey(request: BulkCopyRequest): string {
  return [
    request.sourceAppId,
    [...request.targetAppIds].sort().join(","),
    [...request.parts].sort().join(","),
  ].join("|");
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function BulkCopyPage() {
  const selection = useAppSelection();
  const apps = useApps();
  const previewMutation = useBulkPreview();
  const applyMutation = useBulkApply();

  const [parts, setParts] = useState<Set<BulkCopyPart>>(() => new Set());
  const [preview, setPreview] = useState<PreviewSnapshot | null>(null);
  const [result, setResult] = useState<BulkCopyResult | null>(null);

  const allApps = useMemo(() => apps.data ?? [], [apps.data]);
  const appsById = useMemo(
    () => new Map(allApps.map((app) => [app.id, app])),
    [allApps],
  );
  const selectedApps = useMemo(
    () => allApps.filter((app) => selection.selectedIds.has(app.id)),
    [allApps, selection.selectedIds],
  );

  // The remembered source wins as long as it still points at a real app;
  // otherwise the first ticked app is the natural template.
  const sourceAppId = useMemo(() => {
    if (selection.sourceAppId && appsById.has(selection.sourceAppId)) {
      return selection.sourceAppId;
    }
    return selectedApps[0]?.id ?? null;
  }, [appsById, selectedApps, selection.sourceAppId]);

  const targets = useMemo(
    () => selectedApps.filter((app) => app.id !== sourceAppId),
    [selectedApps, sourceAppId],
  );

  const request = useMemo<BulkCopyRequest | null>(() => {
    if (!sourceAppId || targets.length === 0 || parts.size === 0) return null;
    return {
      sourceAppId,
      targetAppIds: targets.map((app) => app.id),
      parts: BULK_PART_DEFINITIONS.filter((part) => parts.has(part.id)).map(
        (part) => part.id,
      ),
    };
  }, [parts, sourceAppId, targets]);

  const requestKey = request ? buildRequestKey(request) : null;
  const activePreview =
    preview && preview.requestKey === requestKey ? preview.data : null;
  const previewIsStale = preview !== null && activePreview === null;
  const changeCount = activePreview?.changes.length ?? 0;
  const busy = previewMutation.isPending || applyMutation.isPending;

  const togglePart = (part: BulkCopyPart) => {
    setParts((current) => {
      const next = new Set(current);
      if (!next.delete(part)) next.add(part);
      return next;
    });
  };

  const handlePreview = async () => {
    if (!request || !requestKey) return;
    setResult(null);
    try {
      const data = await previewMutation.mutateAsync(request);
      setPreview({ requestKey, data });
    } catch (error) {
      toast.error(errorMessage(error, "Could not build the preview"));
    }
  };

  const handleApply = async () => {
    if (!request || !activePreview || changeCount === 0) return;
    try {
      const data = await applyMutation.mutateAsync(request);
      setResult(data);
      setPreview(null);
      const failed = data.results.filter((row) => row.status === "error").length;
      const changed = data.results.reduce((sum, row) => sum + row.changed, 0);
      if (failed > 0) {
        toast.warning(
          `Applied ${pluralize(changed, "change", "changes")}, ${pluralize(failed, "part", "parts")} failed`,
        );
      } else {
        toast.success(
          `Applied ${pluralize(changed, "change", "changes")} to ${pluralize(targets.length, "app", "apps")} as drafts`,
        );
      }
    } catch (error) {
      toast.error(errorMessage(error, "Could not apply the changes"));
    }
  };

  if (apps.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (apps.isError) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
        <h1 className="font-bold text-xl tracking-tight">Apply to many apps</h1>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-8">
            <p className="text-destructive text-sm">
              {errorMessage(apps.error, "Could not load your apps")}
            </p>
            <Button variant="outline" onClick={() => apps.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-bold text-xl tracking-tight">Apply to many apps</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Copy the setup of one app to the others you ticked. Everything lands
          as drafts in AppBoard - nothing is sent to any store.
        </p>
      </div>

      {selectedApps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MousePointerClick className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No apps selected</p>
              <p className="max-w-md text-muted-foreground text-sm">
                Tick the apps you want to update in the app switcher in the top
                bar, then come back here to choose what to copy.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Copy from</CardTitle>
              <CardDescription>
                The app whose setup becomes the template. It does not have to
                be one of the ticked apps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Select
                value={sourceAppId ?? undefined}
                onValueChange={(id) => selection.setSource(id)}
                disabled={busy}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Pick a source app" />
                </SelectTrigger>
                <SelectContent>
                  {allApps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      <span>{app.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {PLATFORM_LABELS[app.platform]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <p className="font-medium text-sm">
                  Targets ({targets.length})
                </p>
                <BulkTargetChips apps={targets} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What to copy</CardTitle>
              <CardDescription>
                Each part is applied on its own, so a problem with one never
                blocks the others.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BulkPartPicker
                selected={parts}
                onToggle={togglePart}
                disabled={busy}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handlePreview}
                  disabled={!request || busy}
                >
                  {previewMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Eye />
                  )}
                  Preview changes
                </Button>
                {previewIsStale && (
                  <p className="text-muted-foreground text-sm">
                    The selection changed since the last preview. Preview again
                    before applying.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {activePreview && request && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  {pluralize(targets.length, "app", "apps")} x{" "}
                  {pluralize(request.parts.length, "thing", "things")} ={" "}
                  {pluralize(changeCount, "change", "changes")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BulkPreviewTable preview={activePreview} appsById={appsById} />
                <Button
                  onClick={handleApply}
                  disabled={changeCount === 0 || busy}
                >
                  {applyMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  Apply {pluralize(changeCount, "change", "changes")}
                </Button>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  Drafts are updated in AppBoard. Review and publish each app
                  when you are ready.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkResultsTable result={result} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
