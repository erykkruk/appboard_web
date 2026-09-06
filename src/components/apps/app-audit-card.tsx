"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiStatus } from "@/hooks/use-ai";
import { useAudit, useRecheckAudit, useSuggestions } from "@/hooks/use-audit";
import { useVersions } from "@/hooks/use-publishing";
import { api } from "@/lib/api";
import { storeConsoleUrl, storeLocaleFor } from "@/lib/apps";
import type { App, AppVersion, AuditIssue, KeywordScore } from "@/lib/types";

/**
 * What each audit rule's button does. Keyword rules resolve on this very
 * screen - the audit already scored those terms, so sending the user to a
 * blank research form would throw away the answer we are holding.
 */
type IssueAction =
  | { label: string; kind: "route"; path: string }
  | { label: string; kind: "external"; href: string }
  | { label: string; kind: "keywords" };

const ISSUE_ACTION: Record<string, IssueAction> = {
  "brand-only-ranks": { kind: "keywords", label: "See the keywords" },
  "description-opening": {
    kind: "route",
    label: "Rewrite with AI",
    path: "write",
  },
  "description-short": {
    kind: "route",
    label: "Write a longer description",
    path: "write",
  },
  "missing-winnable-terms": { kind: "keywords", label: "See the keywords" },
  "no-ranks": { kind: "keywords", label: "See the keywords" },
  "ranks-below-fold": { kind: "keywords", label: "See the keywords" },
  screenshots: {
    kind: "route",
    label: "Open the editor",
    path: "screenshots?open=1",
  },
  "title-keywords": { kind: "route", label: "See the proposed title", path: "fixes" },
  "title-unwinnable": {
    kind: "route",
    label: "See the proposed title",
    path: "fixes",
  },
  "title-upgrade": { kind: "route", label: "See the proposed title", path: "fixes" },
};

/**
 * Two rules need the app to know where the fix lives: the language is
 * added on the Text screen under the store's locale, and the category is a
 * version field for API-connected apps but a store-console setting for
 * everyone else. Never send these to the ASO profile - that is a note, not
 * the listing.
 */
function resolveAction(
  issue: AuditIssue,
  app: App,
  report: { country: string; language: string },
  versions: AppVersion[] | undefined,
  aiReady: boolean,
): IssueAction | undefined {
  // Without a working AI key the "rewrite" buttons would land on a card
  // that only explains what a key buys. The description is still editable
  // by hand, so send people there instead.
  if (
    !aiReady &&
    (issue.id === "description-opening" || issue.id === "description-short")
  ) {
    return { kind: "route", label: "Edit the description", path: "text" };
  }
  if (issue.id === "no-local-listing") {
    const locale = storeLocaleFor(report.language, report.country, app.platform);
    return {
      kind: "route",
      label: `Add ${locale}`,
      path: `text?add=${encodeURIComponent(locale)}`,
    };
  }
  if (issue.id === "category-mismatch") {
    if (app.store?.connectionMode === "api") {
      const version =
        versions?.find((v) => v.isEditable) ?? versions?.[0];
      return version
        ? {
            kind: "route",
            label: "Set the category",
            path: `versions/${version.id}`,
          }
        : { kind: "route", label: "Set the category", path: "dashboard" };
    }
    const href = storeConsoleUrl(app);
    if (!href) return undefined;
    return {
      href,
      kind: "external",
      label:
        app.platform === "ios"
          ? "Change it in App Store Connect"
          : "Change it in Play Console",
    };
  }
  return ISSUE_ACTION[issue.id];
}

/** Terms worth chasing: real search volume, winnable, and you are absent. */
const GAP_MIN_POPULARITY = 35;
const GAP_MAX_DIFFICULTY = 45;

function isGap(score: KeywordScore, recommendable: Set<string>): boolean {
  return (
    !score.appRank &&
    recommendable.has(score.keyword.trim().toLowerCase()) &&
    (score.popularity ?? 0) >= GAP_MIN_POPULARITY &&
    score.difficulty <= GAP_MAX_DIFFICULTY
  );
}

function verdict(
  score: KeywordScore,
  recommendable: Set<string>,
): { label: string; tone: string } {
  if (isGap(score, recommendable)) {
    return { label: "opportunity", tone: "text-emerald-500" };
  }
  // Measured, but from a neighbouring category - shown so you can see why a
  // query is contested, never presented as something to chase.
  if (!recommendable.has(score.keyword.trim().toLowerCase())) {
    return { label: "another category", tone: "text-muted-foreground" };
  }
  if (score.appRank && score.appRank <= 10) {
    return { label: "you are visible", tone: "text-emerald-500" };
  }
  if (score.appRank) return { label: "ranked, below the fold", tone: "text-amber-500" };
  if (score.difficulty > GAP_MAX_DIFFICULTY) {
    return { label: "too hard for now", tone: "text-muted-foreground" };
  }
  return { label: "not ranking", tone: "text-muted-foreground" };
}

function ScoreBlock({
  label,
  score,
  hint,
}: {
  label: string;
  score: number | null;
  hint: string;
}) {
  return (
    <div className="min-w-[140px]">
      <div className="font-bold text-4xl leading-none tracking-tight">
        {score ?? "--"}
        <span className="ml-1 font-medium text-lg text-muted-foreground">/100</span>
      </div>
      <div className="mt-1 text-muted-foreground text-xs">{label}</div>
      <div className="text-muted-foreground text-xs">{hint}</div>
    </div>
  );
}

export function AppAuditCard({ app }: { app: App }) {
  const router = useRouter();
  const { data, isLoading } = useAudit(app.id);
  const recheck = useRecheckAudit(app.id);
  // Only API-connected apps have versions to set a category on.
  const versions = useVersions(app.id, app.store?.connectionMode === "api");
  const aiStatus = useAiStatus();
  const aiReady = !!aiStatus.data?.configured && !aiStatus.data.lastError;
  const suggestions = useSuggestions(app.id);
  const proposalCount = suggestions.data?.suggestions.length ?? 0;
  const [tracking, setTracking] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  // Not published anywhere: there is no listing out there to measure, so we
  // point at the work that does move the needle instead of faking a score.
  if (data?.status === "not-in-store") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Not in a store yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            There is no live listing to score, so the audit stays off. Write
            your title and description here, design the screenshots, and the
            score plus keyword tracking switch on the day you go live.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => router.push(`/apps/${app.id}/start`)}>
              Write the listing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/apps/${app.id}/screenshots`)}
            >
              Design screenshots
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/apps/${app.id}/research`)}
            >
              Research keywords
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // A first measurement takes about a minute of live store calls. Showing a
  // progress state is honest; showing 0/100 would not be.
  if (!data || data.status === "measuring" || !data.report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Measuring your listing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Reading what the store serves right now and scoring the keywords it
            suggests. This takes about a minute the first time.
          </p>
          <Progress className="h-1.5" />
        </CardContent>
      </Card>
    );
  }

  const { report } = data;
  const storeScore = report.store.asoScore;
  const draftScore = report.draft?.asoScore ?? null;
  const actionable = report.store.issues.filter((i) => i.actionable);
  const context = report.store.issues.filter((i) => !i.actionable);
  const topTwo = actionable.slice(0, 2).reduce((sum, i) => sum + i.scorePenalty, 0);

  const recommendable = new Set(
    (report.recommendable ?? []).map((k) => k.trim().toLowerCase()),
  );
  const keywords = [...report.keywords].sort((a, b) => {
    // Opportunities first, then whatever you already rank for, then the rest.
    const ga = isGap(a, recommendable);
    const gb = isGap(b, recommendable);
    if (ga !== gb) return ga ? -1 : 1;
    if (!!a.appRank !== !!b.appRank) return a.appRank ? -1 : 1;
    if (a.appRank && b.appRank) return a.appRank - b.appRank;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });
  const gaps = keywords.filter((k) => isGap(k, recommendable));

  const openFix = (issue: AuditIssue) => {
    const action = resolveAction(issue, app, report, versions.data, aiReady);
    if (!action || action.kind === "external") return;
    if (action.kind === "route") {
      router.push(`/apps/${app.id}/${action.path}`);
      return;
    }
    document
      .getElementById("audit-keywords")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const trackAll = async () => {
    setTracking(true);
    try {
      const added = await api.tracking.addKeywords(app.id, {
        country: report.country.toUpperCase(),
        keywords: keywords.map((k) => k.keyword),
      });
      toast.success(
        `Tracking ${added.length} keyword${added.length === 1 ? "" : "s"} - positions refresh nightly.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Could not start tracking",
      );
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Listing score</CardTitle>
            <p className="mt-1 text-muted-foreground text-xs">
              {report.country.toUpperCase()} · {report.language} · measured{" "}
              {new Date(report.measuredAt).toLocaleString()}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/apps/${app.id}/text`)}
          >
            Edit text
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => recheck.mutate()}
            disabled={data.refreshing || recheck.isPending}
          >
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${
                data.refreshing || recheck.isPending ? "animate-spin" : ""
              }`}
            />
            {data.refreshing || recheck.isPending ? "Measuring" : "Re-check"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-8">
            <ScoreBlock
              label="In the store"
              score={storeScore}
              hint="what people see today"
            />
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <ScoreBlock
              label="In your draft"
              score={draftScore ?? storeScore}
              hint={
                report.draft
                  ? `${report.draft.changedFields.length} field(s) changed`
                  : "nothing changed yet"
              }
            />
          </div>
          {proposalCount > 0 && (
            <Button size="sm" onClick={() => router.push(`/apps/${app.id}/fixes`)}>
              Review {proposalCount} text fix{proposalCount === 1 ? "" : "es"}
            </Button>
          )}
          <p className="text-sm">
            <span className="font-semibold">
              {actionable.length} thing{actionable.length === 1 ? "" : "s"} to fix
              here.
            </span>{" "}
            {actionable.length > 0 && (
              <span className="text-muted-foreground">
                {actionable.length === 1
                  ? `It is worth ${topTwo} points.`
                  : `The top two are worth ${topTwo} points.`}
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {actionable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Do next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actionable.map((issue, index) => {
              const action = resolveAction(issue, app, report, versions.data, aiReady);
              return (
                <div
                  key={issue.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-background text-xs">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{issue.title}</div>
                    <div className="mt-0.5 text-muted-foreground text-xs">
                      {issue.detail}
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-emerald-600 text-sm">
                    +{issue.scorePenalty}
                  </span>
                  {action?.kind === "external" && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={action.href} target="_blank" rel="noreferrer">
                        {action.label}
                      </a>
                    </Button>
                  )}
                  {action && action.kind !== "external" && (
                    <Button size="sm" onClick={() => openFix(issue)}>
                      {action.label}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card id="audit-keywords" className="scroll-mt-24">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">
              Keywords we checked for you
            </CardTitle>
            <p className="mt-1 text-muted-foreground text-xs">
              Taken from your own listing and from the titles of the apps you
              compete with, then scored against live {report.country.toUpperCase()}{" "}
              search results.
              {gaps.length > 0 && (
                <>
                  {" "}
                  <span className="text-emerald-500">
                    {gaps.length} of them are open opportunities.
                  </span>
                </>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={trackAll}
            disabled={tracking || keywords.length === 0}
          >
            {tracking && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Track these nightly
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="py-2 pr-3 font-medium">Keyword</th>
                  <th className="py-2 pr-3 font-medium">Popularity</th>
                  <th className="py-2 pr-3 font-medium">Difficulty</th>
                  <th className="py-2 pr-3 font-medium">Your position</th>
                  <th className="py-2 font-medium">What it means</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((score) => {
                  const v = verdict(score, recommendable);
                  return (
                    <tr key={score.keyword} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{score.keyword}</td>
                      <td className="py-2 pr-3">{score.popularity ?? "--"}</td>
                      <td className="py-2 pr-3">{score.difficulty}</td>
                      <td className="py-2 pr-3">
                        {score.appRank ? `#${score.appRank}` : "not in top 200"}
                      </td>
                      <td className={`py-2 ${v.tone}`}>{v.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-muted-foreground text-xs">
            Popularity and difficulty are 1-100 estimates from live App Store
            results, not Apple&apos;s own numbers. Difficulty is App Store only.
          </p>
        </CardContent>
      </Card>

      {context.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Context, not a task
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {context.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start justify-between gap-4 border-dashed border-b pb-2 text-sm last:border-0 last:pb-0"
              >
                <div className="text-muted-foreground">
                  <div className="font-medium text-foreground/70">{issue.title}</div>
                  <div className="text-xs">{issue.detail}</div>
                </div>
                <span className="shrink-0 text-muted-foreground text-sm">
                  -{issue.scorePenalty}
                </span>
              </div>
            ))}
            <p className="pt-1 text-muted-foreground text-xs">
              These lower the score but AppBoard cannot fix them for you, so they
              get no button.
            </p>
          </CardContent>
        </Card>
      )}

      {report.store.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What already works</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.store.strengths.map((strength) => (
              <Badge key={strength} variant="secondary">
                {strength}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
