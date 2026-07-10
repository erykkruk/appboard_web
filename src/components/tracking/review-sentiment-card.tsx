"use client";

import { SmilePlus, ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useAppResearchRun,
  useAppResearchRuns,
} from "@/hooks/use-app-research";

const TOP_FEATURES_LIMIT = 3;

const SENTIMENT_SEGMENTS = [
  { color: "bg-emerald-500", key: "positive", label: "Positive" },
  { color: "bg-zinc-500", key: "neutral", label: "Neutral" },
  { color: "bg-red-500", key: "negative", label: "Negative" },
] as const;

function FeatureList({
  items,
  tone,
}: {
  items: Array<{ mentions: number; name: string }>;
  tone: "loved" | "hated";
}) {
  const Icon = tone === "loved" ? ThumbsUp : ThumbsDown;
  const iconClass = tone === "loved" ? "text-emerald-500" : "text-red-500";
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        {tone === "loved" ? "Users love" : "Users complain about"}
      </p>
      {items.slice(0, TOP_FEATURES_LIMIT).map((f) => (
        <div key={f.name} className="flex items-center gap-2 text-sm">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
          <span className="flex-1 truncate">{f.name}</span>
          <span className="text-xs text-muted-foreground">{f.mentions}×</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Dashboard card with the review-sentiment breakdown from the app's most
 * recent saved research run (the same analysis shown in Research → History).
 */
export function ReviewSentimentCard({
  appId,
  appBundleId,
  appExternalId,
}: {
  appId: string;
  appBundleId: string;
  appExternalId?: string;
}) {
  const runs = useAppResearchRuns(appId);
  // Newest run analyzing THIS app (competitor analyses are attached too).
  // Google Play run ids are package names (= bundleId); iOS uses externalId.
  const ownRun = runs.data?.find(
    (r) =>
      r.externalId === appBundleId ||
      (appExternalId && r.externalId === appExternalId),
  );
  const run = useAppResearchRun(appId, ownRun?.id ?? null);

  if (runs.isError || run.isError) return null;

  const analysis = run.data?.report.analysis;
  const total = analysis
    ? analysis.sentiment.positive +
      analysis.sentiment.neutral +
      analysis.sentiment.negative
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SmilePlus className="h-4 w-4" />
          Review Sentiment
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={`/apps/${appId}/research?tab=history`}>Full report</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {runs.isLoading || run.isLoading ? (
          <p className="py-2 text-sm text-muted-foreground">
            Loading review analysis…
          </p>
        ) : !analysis || total === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No review analysis yet. Run research on this app to analyze what
            users say in reviews.
          </p>
        ) : (
          <>
            <div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full">
                {SENTIMENT_SEGMENTS.map((s) => (
                  <div
                    key={s.key}
                    className={s.color}
                    style={{
                      width: `${(analysis.sentiment[s.key] / total) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-4">
                {SENTIMENT_SEGMENTS.map((s) => (
                  <span
                    key={s.key}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                    {s.label}{" "}
                    {Math.round((analysis.sentiment[s.key] / total) * 100)}%
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureList items={analysis.featuresLoved} tone="loved" />
              <FeatureList items={analysis.featuresHated} tone="hated" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
