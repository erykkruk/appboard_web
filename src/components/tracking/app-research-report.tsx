"use client";

import {
  AiSummaryCard,
  FeatureInsightsSection,
  IssuesSection,
  QuickWinsCard,
} from "@/components/research/report-ai-insights";
import { ReportHeuristicsCard } from "@/components/research/report-heuristics-card";
import { ReportKeywordsCard } from "@/components/research/report-keywords-card";
import { ReportMetaCard } from "@/components/research/report-meta-card";
import { ReportMetadataAuditCard } from "@/components/research/report-metadata-audit-card";
import type { ResearchRun } from "@/lib/types";

/**
 * Renders a persisted research run using the existing report cards. Only the
 * data saved with the run is shown (no live competitor/market/visual fetches).
 */
export function AppResearchReport({ run }: { run: ResearchRun }) {
  const { report } = run;
  const { analysis, heuristics, keywords, meta } = report;
  const country = run.country ?? meta.country;

  return (
    <div className="space-y-6">
      <ReportMetaCard meta={meta} />
      <ReportHeuristicsCard heuristics={heuristics} />

      {analysis && (
        <>
          <AiSummaryCard analysis={analysis} />
          <FeatureInsightsSection analysis={analysis} />
          <IssuesSection analysis={analysis} />
          <QuickWinsCard analysis={analysis} />
          <ReportMetadataAuditCard analysis={analysis} meta={meta} />
        </>
      )}

      <ReportKeywordsCard
        analysis={analysis}
        appId={run.appId ?? undefined}
        country={country}
        meta={meta}
        positions={keywords ?? []}
      />
    </div>
  );
}
