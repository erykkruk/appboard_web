"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ASO_SUMMARY_LIMIT,
  ASO_TITLE_LIMIT,
  auditMetadata,
  keywordCoverage,
  type KeywordPlacement,
} from "@/lib/research";
import type { ResearchAnalysis, ResearchAppMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLACEMENT_BADGE_CLASS: Record<KeywordPlacement, string> = {
  description:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  missing: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  summary: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  title:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const PLACEMENT_LABELS: Record<KeywordPlacement, string> = {
  description: "description",
  missing: "MISSING",
  summary: "short description",
  title: "title",
};

export function ReportMetadataAuditCard({
  analysis,
  meta,
}: {
  analysis?: ResearchAnalysis;
  meta: ResearchAppMeta;
}) {
  const audit = auditMetadata(meta);
  const coverage = analysis
    ? keywordCoverage(
        meta,
        analysis.asoKeywords.map((k) => k.keyword),
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>ASO metadata audit</CardTitle>
        <CardDescription>
          The title is the strongest ranking signal — limits:{" "}
          {ASO_TITLE_LIMIT} characters (iOS/Play title), {ASO_SUMMARY_LIMIT}{" "}
          (Play short description).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">
            Title ({audit.titleLength} chars)
          </dt>
          <dd className={cn(audit.titleTooLong && "text-amber-600")}>
            {meta.title}
            {audit.titleTooLong && ` — over ${ASO_TITLE_LIMIT} characters`}
          </dd>
          {meta.summary && (
            <>
              <dt className="text-muted-foreground">
                Short description ({audit.summaryLength}/{ASO_SUMMARY_LIMIT})
              </dt>
              <dd className={cn(audit.summaryTooLong && "text-amber-600")}>
                {meta.summary}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Description</dt>
          <dd>{audit.descriptionLength.toLocaleString("en-US")} characters</dd>
        </dl>

        {coverage.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">
              Keyword coverage in metadata:
            </p>
            <div className="flex flex-wrap gap-1">
              {coverage.map((entry) => (
                <Badge
                  key={entry.keyword}
                  className={PLACEMENT_BADGE_CLASS[entry.placement]}
                >
                  {entry.keyword} · {PLACEMENT_LABELS[entry.placement]}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis && analysis.metadataTips.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {analysis.metadataTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        )}

        {!analysis && (
          <p className="text-sm text-muted-foreground">
            Keyword coverage and tips appear after the AI analysis (or check
            your own keywords below — colors show where they occur).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
