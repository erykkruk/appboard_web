"use client";

import { Check, Loader2, Save, Trash2 } from "lucide-react";
import { useState } from "react";

import { AppResearchReport } from "@/components/tracking/app-research-report";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ResearchAppResult } from "@/hooks/use-research";
import {
  useDeleteResearchRun,
  useResearchRun,
  useSaveResearchRun,
  useStandaloneRuns,
} from "@/hooks/use-app-research";

export function SaveResearchButton({
  country,
  result,
}: {
  country: string;
  result: ResearchAppResult;
}) {
  const save = useSaveResearchRun();
  const [saved, setSaved] = useState(false);

  if (result.error) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={save.isPending || saved}
      onClick={() =>
        save.mutate(
          {
            country,
            report: {
              analysis: result.analysis,
              heuristics: result.heuristics,
              keywords: result.positions,
              meta: result.meta,
              reviewsCount: result.reviews.length,
            },
          },
          { onSuccess: () => setSaved(true) },
        )
      }
    >
      {save.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <Check className="h-4 w-4" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {saved ? "Saved" : "Save to history"}
    </Button>
  );
}

export function SavedResearchList() {
  const runs = useStandaloneRuns();
  const deleteRun = useDeleteResearchRun();
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useResearchRun(openId);

  if (!runs.data?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved research</CardTitle>
        <CardDescription>Reports you saved to history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {runs.data.map((run) => (
          <div
            key={run.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => setOpenId(run.id)}
            >
              <p className="truncate text-sm font-medium">
                {run.title ?? "Research"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(run.createdAt).toLocaleString()}
                {run.country ? ` · ${run.country.toUpperCase()}` : ""}
              </p>
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-red-600"
              onClick={() => deleteRun.mutate(run.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail.data?.title ?? "Research report"}</DialogTitle>
          </DialogHeader>
          {detail.isLoading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {detail.data && <AppResearchReport run={detail.data} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
