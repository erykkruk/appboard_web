"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { researchCategoryLabel } from "@/lib/research";
import type { ResearchAnalysis, ResearchAnalysisFeature } from "@/lib/types";
import { cn } from "@/lib/utils";

import { SEVERITY_BADGE_CLASS } from "./shared";

export function AiSummaryCard({ analysis }: { analysis: ResearchAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="leading-relaxed">{analysis.summary}</p>
        <div className="flex gap-2">
          <Badge className={SEVERITY_BADGE_CLASS.low}>
            Positive: {analysis.sentiment.positive}
          </Badge>
          <Badge className={SEVERITY_BADGE_CLASS.medium}>
            Neutral: {analysis.sentiment.neutral}
          </Badge>
          <Badge className={SEVERITY_BADGE_CLASS.high}>
            Negative: {analysis.sentiment.negative}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureList({
  emptyLabel,
  features,
  tone,
}: {
  emptyLabel: string;
  features: ResearchAnalysisFeature[];
  tone: "loved" | "hated";
}) {
  return (
    <div className="space-y-2">
      {features.map((feature) => (
        <div
          key={feature.name}
          className={cn(
            "rounded-md border p-2",
            tone === "loved"
              ? "border-emerald-200 dark:border-emerald-900"
              : "border-red-200 dark:border-red-900",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{feature.name}</span>
            <Badge variant="outline">×{feature.mentions}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{feature.insight}</p>
        </div>
      ))}
      {!features.length && (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

export function FeatureInsightsSection({
  analysis,
}: {
  analysis: ResearchAnalysis;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Features users love</CardTitle>
        </CardHeader>
        <CardContent>
          <FeatureList
            emptyLabel="No clearly praised features."
            features={analysis.featuresLoved}
            tone="loved"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Features users criticize</CardTitle>
        </CardHeader>
        <CardContent>
          <FeatureList
            emptyLabel="No clearly criticized features."
            features={analysis.featuresHated}
            tone="hated"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function IssuesSection({ analysis }: { analysis: ResearchAnalysis }) {
  const categories = [...analysis.categories].sort((a, b) => b.count - a.count);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Top user irritations</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5">
            {analysis.topIrritations.map((irritation) => (
              <li key={irritation} className="leading-relaxed">
                {irritation}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {researchCategoryLabel(category.id)}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{category.count}</Badge>
                  <Badge className={SEVERITY_BADGE_CLASS[category.severity]}>
                    {category.severity}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">{category.insight}</p>
              {category.quotes.map((quote) => (
                <blockquote
                  key={quote}
                  className="border-l-2 pl-3 text-sm italic text-muted-foreground"
                >
                  „{quote}”
                </blockquote>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export function QuickWinsCard({ analysis }: { analysis: ResearchAnalysis }) {
  if (!analysis.quickWins.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick wins</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-2 pl-5">
          {analysis.quickWins.map((win) => (
            <li key={win} className="leading-relaxed">
              {win}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
