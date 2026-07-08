"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useResearchCompare, useResearchCompetitors } from "@/hooks/use-research";
import type {
  ResearchAppMeta,
  ResearchCompareResult,
  ResearchReview,
  ResearchSuggestion,
} from "@/lib/types";

const COMPARE_REVIEWS_LIMIT = 120;

function ComparisonDetails({ result }: { result: ResearchCompareResult }) {
  const { comparison, compHeuristics } = result;

  if (!comparison) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {compHeuristics.buckets.slice(0, 6).map((bucket) => (
          <Badge key={bucket.id} variant="outline">
            {bucket.label} ×{bucket.count}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground">
          ({compHeuristics.negative}/{compHeuristics.total} negative reviews at
          the competitor)
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      <p>{comparison.verdict}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="font-medium text-red-700 dark:text-red-400">
            They do better:
          </p>
          <ul className="list-disc pl-5">
            {comparison.theyDoBetter.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            We do better:
          </p>
          <ul className="list-disc pl-5">
            {comparison.weDoBetter.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {comparison.featureGaps.length > 0 && (
        <div>
          <p className="font-medium">Feature gaps:</p>
          <ul className="list-disc pl-5">
            {comparison.featureGaps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CompetitorRow({
  competitor,
  country,
  meta,
  reviews,
}: {
  competitor: ResearchSuggestion;
  country: string;
  meta: ResearchAppMeta;
  reviews: ResearchReview[];
}) {
  const compare = useResearchCompare();

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-3">
        {competitor.icon && (
          <img src={competitor.icon} alt="" className="h-9 w-9 rounded-lg" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {competitor.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {competitor.developer}
            {competitor.rating ? ` · ★ ${competitor.rating.toFixed(2)}` : ""}
          </span>
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            compare.mutate({
              competitor: { id: competitor.id, store: competitor.store },
              country,
              ourMeta: meta,
              ourReviews: reviews.slice(0, COMPARE_REVIEWS_LIMIT),
            })
          }
          disabled={compare.isPending}
        >
          {compare.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {compare.isPending ? "Comparing…" : "Compare"}
        </Button>
      </div>
      {compare.data && <ComparisonDetails result={compare.data} />}
    </div>
  );
}

export function ReportCompetitorsCard({
  country,
  meta,
  reviews,
}: {
  country: string;
  meta: ResearchAppMeta;
  reviews: ResearchReview[];
}) {
  const competitors = useResearchCompetitors();
  const [requested, setRequested] = useState(false);

  function findCompetitors() {
    setRequested(true);
    competitors.mutate({
      country,
      developer: meta.developer,
      genre: meta.genre,
      id: meta.id,
      store: meta.store,
      title: meta.title,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitors</CardTitle>
        <CardDescription>
          {meta.store === "playstore"
            ? "Similar apps according to Google Play."
            : "Top search results in the category/keyword (iTunes has no official similar apps)."}{" "}
          Comparison reads the competitor&apos;s reviews and builds an AI diff
          report (heuristics only without an OpenRouter key).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!requested && (
          <Button variant="secondary" onClick={findCompetitors}>
            Find competitors
          </Button>
        )}
        {requested && competitors.isPending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </p>
        )}
        {competitors.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No competitors found.</p>
        )}
        {competitors.data?.map((competitor) => (
          <CompetitorRow
            key={`${competitor.store}:${competitor.id}`}
            competitor={competitor}
            country={country}
            meta={meta}
            reviews={reviews}
          />
        ))}
      </CardContent>
    </Card>
  );
}
