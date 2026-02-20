"use client";

import { useParams } from "next/navigation";
import { Clock, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistory, useRollback } from "@/hooks/use-history";

export default function HistoryPage() {
  const routeParams = useParams<{ appId: string }>();
  const appId = routeParams.appId;
  const [language, setLanguage] = useState("");
  const [field, setField] = useState("");

  const history = useHistory(appId, {
    language: language || undefined,
    field: field || undefined,
  });
  const rollback = useRollback(appId);

  const handleRollback = async (historyId: string) => {
    try {
      await rollback.mutateAsync(historyId);
      toast.success("Rolled back successfully");
    } catch {
      toast.error("Failed to rollback");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Languages</SelectItem>
          </SelectContent>
        </Select>

        <Select value={field} onValueChange={setField}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Fields" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Fields</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="shortDesc">Short Description</SelectItem>
            <SelectItem value="fullDesc">Full Description</SelectItem>
            <SelectItem value="whatsNew">What&apos;s New</SelectItem>
            <SelectItem value="keywords">Keywords</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => history.refetch()}
          disabled={history.isRefetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {history.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {history.isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-sm text-muted-foreground">
            Failed to load history.
          </p>
          <Button variant="outline" onClick={() => history.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {history.data && history.data.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <Clock className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No changes recorded yet.
          </p>
        </div>
      )}

      {history.data && history.data.length > 0 && (
        <div className="relative space-y-4 pl-6 before:absolute before:bottom-0 before:left-2.5 before:top-0 before:w-px before:bg-border">
          {history.data.map((entry) => (
            <div key={entry.id} className="relative">
              <div className="absolute -left-6 top-3 h-2 w-2 rounded-full bg-primary" />
              <Card>
                <CardContent className="pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{entry.field}</Badge>
                      <Badge variant="secondary">{entry.language}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRollback(entry.id)}
                      disabled={rollback.isPending}
                    >
                      {rollback.isPending ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                      )}
                      Rollback
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border bg-red-500/5 p-3">
                      <p className="mb-1 text-xs font-medium text-red-400">
                        Previous
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {entry.oldValue || "(empty)"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-green-500/5 p-3">
                      <p className="mb-1 text-xs font-medium text-green-400">
                        New
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {entry.newValue || "(empty)"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
