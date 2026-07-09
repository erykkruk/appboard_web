"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { AppResearchReport } from "@/components/tracking/app-research-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAppResearchRun,
  useAppResearchRuns,
  useDeleteAppResearchRun,
} from "@/hooks/use-app-research";
import { cn } from "@/lib/utils";

export function ResearchHistoryTab({ appId }: { appId: string }) {
  const runs = useAppResearchRuns(appId);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRun = useAppResearchRun(appId, selected);
  const deleteRun = useDeleteAppResearchRun(appId);

  if (runs.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!runs.data?.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No saved research yet. Run research from the Research tab or enable
          auto-research in Automation.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        {runs.data.map((run) => (
          <Card
            key={run.id}
            className={cn(
              "cursor-pointer transition-colors hover:border-primary",
              selected === run.id && "border-primary",
            )}
            onClick={() => setSelected(run.id)}
          >
            <CardHeader className="p-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{run.title ?? "Research"}</CardTitle>
                <Badge variant={run.kind === "scheduled" ? "secondary" : "outline"}>
                  {run.kind}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {new Date(run.createdAt).toLocaleString()}
                {run.country ? ` · ${run.country.toUpperCase()}` : ""}
              </CardDescription>
              {run.summary && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {run.summary}
                </p>
              )}
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-muted-foreground hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRun.mutate(run.id, {
                      onSuccess: () =>
                        setSelected((cur) => (cur === run.id ? null : cur)),
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div>
        {!selected && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Select a saved run to view its report.
            </CardContent>
          </Card>
        )}
        {selected && selectedRun.isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {selectedRun.data && <AppResearchReport run={selectedRun.data} />}
      </div>
    </div>
  );
}
