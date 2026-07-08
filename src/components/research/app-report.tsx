"use client";

import type { ResearchAppResult } from "@/hooks/use-research";

import {
  AiSummaryCard,
  FeatureInsightsSection,
  IssuesSection,
  QuickWinsCard,
} from "./report-ai-insights";
import { ReportCompetitorsCard } from "./report-competitors-card";
import { ReportHeuristicsCard } from "./report-heuristics-card";
import { ReportKeywordsCard } from "./report-keywords-card";
import { ReportMarketsCard } from "./report-markets-card";
import { ReportMetaCard } from "./report-meta-card";
import { ReportMetadataAuditCard } from "./report-metadata-audit-card";
import { ReportReviewsCard } from "./report-reviews-card";
import { ReportVisualCard } from "./report-visual-card";

export function AppReport({
  country,
  result,
}: {
  country: string;
  result: ResearchAppResult;
}) {
  const { analysis, heuristics, meta, positions, reviews } = result;

  return (
    <div className="space-y-6">
      {result.error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </p>
      )}

      <ReportMetaCard meta={meta} />
      <ReportHeuristicsCard heuristics={heuristics} />

      {analysis && (
        <>
          <AiSummaryCard analysis={analysis} />
          <FeatureInsightsSection analysis={analysis} />
          <IssuesSection analysis={analysis} />
          <QuickWinsCard analysis={analysis} />
        </>
      )}

      <ReportMetadataAuditCard analysis={analysis} meta={meta} />
      <ReportMarketsCard meta={meta} />
      <ReportVisualCard meta={meta} />
      <ReportCompetitorsCard country={country} meta={meta} reviews={reviews} />
      <ReportKeywordsCard
        analysis={analysis}
        country={country}
        meta={meta}
        positions={positions}
      />
      <ReportReviewsCard reviews={reviews} />
    </div>
  );
}
