"use client";

import { useParams, useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { AiUnlockCard } from "@/components/ai-unlock-card";
import { InlineDiff } from "@/components/diff/inline-diff";
import { FlowSteps } from "@/components/flow-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/hooks/use-apps";
import { useAudit, useSuggestions } from "@/hooks/use-audit";
import { useUpdateListing } from "@/hooks/use-listings";
import { computeDiff } from "@/lib/diff";
import type { Suggestion } from "@/lib/types";

const FIELD_LABEL: Record<Suggestion["field"], { android: string; ios: string }> =
  {
    keywords: { android: "Keywords", ios: "Keyword field" },
    shortDesc: { android: "Short description", ios: "Subtitle" },
    title: { android: "Title", ios: "Title" },
  };

/**
 * Step 6 of the flow: every proposed text change as a diff you accept or
 * reject. Accepting writes the draft listing - the ordinary listing update -
 * so it shows up in the publish diff like any hand edit. Nothing here touches
 * the store.
 */
export default function FixesPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const router = useRouter();
  const queryClient = useQueryClient();
  const app = useApp(appId);
  const audit = useAudit(appId);
  const suggestions = useSuggestions(appId);
  const updateListing = useUpdateListing(appId);

  const [decided, setDecided] = useState<Record<string, "accepted" | "rejected">>(
    {},
  );
  const [busy, setBusy] = useState<string | null>(null);

  const list = useMemo(
    () => suggestions.data?.suggestions ?? [],
    [suggestions.data],
  );
  const open = list.filter((s) => !decided[s.id]);
  const acceptedCount = Object.values(decided).filter((d) => d === "accepted")
    .length;
  const platform = app.data?.platform === "android" ? "android" : "ios";

  const accept = async (s: Suggestion) => {
    setBusy(s.id);
    try {
      await updateListing.mutateAsync({
        data: { [s.field]: s.proposed },
        language: s.language,
      });
      setDecided((d) => ({ ...d, [s.id]: "accepted" }));
      // The draft score is recomputed from the draft text, so the audit
      // must be re-read once a proposal lands.
      queryClient.invalidateQueries({ queryKey: ["app-audit", appId] });
      toast.success("Saved as a draft. Nothing was sent to the store.");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : "Could not save",
      );
    } finally {
      setBusy(null);
    }
  };

  const reject = (s: Suggestion) =>
    setDecided((d) => ({ ...d, [s.id]: "rejected" }));

  if (app.isLoading || suggestions.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const notInStore = audit.data?.status === "not-in-store";
  const measuring =
    !notInStore &&
    (audit.data?.status === "measuring" || suggestions.data?.status === "no-audit");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <FlowSteps current="audit" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="font-bold text-xl tracking-tight">Text fixes</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Each change is a proposal. Accept it and it becomes your draft;
          reject it and nothing happens. The store is only touched when you
          publish.
          {suggestions.data?.language ? ` Language: ${suggestions.data.language}.` : ""}
        </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push(`/apps/${appId}/text`)}>
          Edit all text
        </Button>
      </div>

      {notInStore && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <p className="text-muted-foreground">
              This app is not in a store yet, so there is nothing to measure.
              Write your text first; proposals appear after the first audit,
              the day the app is live.
            </p>
            <Button size="sm" onClick={() => router.push(`/apps/${appId}/text`)}>
              Write the text
            </Button>
          </CardContent>
        </Card>
      )}

      {measuring && (
        <Card>
          <CardContent className="pt-6 text-muted-foreground text-sm">
            The audit has not finished measuring this app yet. Proposals appear
            as soon as it does.
          </CardContent>
        </Card>
      )}

      {!measuring && !notInStore && list.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-muted-foreground text-sm">
            Nothing to propose for this language: your title, subtitle and
            keyword field already carry the terms you can win.
          </CardContent>
        </Card>
      )}

      {list.map((s) => {
        const state = decided[s.id];
        const { segments, mode } = computeDiff(s.current, s.proposed);
        return (
          <Card
            key={s.id}
            className={
              state === "accepted"
                ? "border-emerald-600/60"
                : state === "rejected"
                  ? "opacity-50"
                  : undefined
            }
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">
                  {FIELD_LABEL[s.field][platform]}
                  <Badge variant="outline" className="ml-2 font-normal">
                    {s.language}
                  </Badge>
                </CardTitle>
                <p className="mt-1 text-muted-foreground text-xs">{s.reason}</p>
              </div>
              {state === "accepted" ? (
                <Badge className="bg-emerald-600 text-white">accepted</Badge>
              ) : state === "rejected" ? (
                <Badge variant="secondary">rejected</Badge>
              ) : s.points > 0 ? (
                <Badge variant="secondary">+{s.points}</Badge>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 font-mono text-sm">
                {s.current ? (
                  <InlineDiff
                    segments={segments}
                    mode={mode === "line" ? "line-by-line" : "inline"}
                  />
                ) : (
                  <span className="rounded bg-green-500/20 px-0.5 text-green-400">
                    {s.proposed}
                  </span>
                )}
              </div>
              {!state && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => accept(s)}
                    disabled={busy !== null}
                  >
                    {busy === s.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Accept
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => reject(s)}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Not for me
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Everything above is deterministic. The description itself is the one
          field only a model can rewrite well - say so instead of hiding it. */}
      <AiUnlockCard compact />

      {!measuring && list.length > 0 && open.length === 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm">
              {acceptedCount > 0
                ? `${acceptedCount} change${acceptedCount === 1 ? "" : "s"} saved to your draft.`
                : "All proposals reviewed."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/apps/${appId}/screenshots?open=1`)}
              >
                Next: screenshots
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/apps/${appId}/dashboard?flow=1`)}
              >
                Back to the audit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
