"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useVersions } from "@/hooks/use-publishing";
import {
  type AuditIssue,
  buildAudit,
  extractKeywordCandidates,
} from "@/lib/aso-check/audit";
import { lookupApp, searchWithRank } from "@/lib/aso-check/itunes";
import { lookupPlayApp, playKeywordData } from "@/lib/aso-check/play";
import {
  calcOpportunity,
  calculateDifficulty,
  classifyKeyword,
  estimateDownloads,
  estimatePopularity,
} from "@/lib/aso-engine/keyword-scoring";
import type { KeywordScore } from "@/lib/aso-engine/scoring-types";
import type { App } from "@/lib/types";

const CALL_DELAY_MS = 300;
// Fewer keywords than the full /aso-check so the card finishes fast.
const MAX_QUICKCHECK_KEYWORDS = 8;
const PROGRESS_LOOKUP_DONE = 10;
const PROGRESS_SCORING_SPAN = 85;
const STORAGE_PREFIX = "appboard:aso-quickcheck:";

type Phase = "idle" | "running" | "done" | "error";

interface QuickCheckResult {
  asoScore: number;
  checkedAt: string;
  country: string;
  issues: Array<
    Pick<AuditIssue, "id" | "severity" | "title" | "detail" | "scorePenalty">
  >;
  strengths: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadCached(appId: string): QuickCheckResult | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${appId}`);
    return raw ? (JSON.parse(raw) as QuickCheckResult) : null;
  } catch {
    return null;
  }
}

function saveCached(appId: string, result: QuickCheckResult) {
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${appId}`,
      JSON.stringify(result),
    );
  } catch {
    // Cache is a convenience; the check still ran.
  }
}

/** Where in the panel each audit issue gets fixed. */
function issueLink(
  issueId: string,
  appId: string,
  versionId?: string,
): { href: string; label: string } {
  const base = `/apps/${appId}`;
  const listing = versionId
    ? { href: `${base}/versions/${versionId}`, label: "Edit listing" }
    : { href: `${base}/information`, label: "Open ASO profile" };
  switch (issueId) {
    case "title-keywords":
    case "description-short":
    case "description-opening":
      return listing;
    case "screenshots":
      return versionId
        ? {
            href: `${base}/versions/${versionId}/screenshots`,
            label: "Open screenshots",
          }
        : listing;
    case "few-ratings":
    case "low-rating":
      return { href: `${base}/reviews`, label: "Open reviews" };
    case "stale-update":
      return { href: `${base}/publish`, label: "Open publish" };
    default:
      return { href: `${base}/research`, label: "Open research" };
  }
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-green-500, #22c55e)";
  if (score >= 45) return "var(--color-amber-500, #f59e0b)";
  return "var(--color-red-500, #ef4444)";
}

/**
 * Browser-side ASO check-up for a synced app: fetches the public listing,
 * scores the keywords it targets with the shared engine and shows the top
 * things to improve, each linking to the panel section that fixes it.
 */
export function AsoQuickcheckCard({ app }: { app: App }) {
  const versions = useVersions(app.id);
  const [phase, setPhase] = useState<Phase>("idle");
  const [percent, setPercent] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<QuickCheckResult | null>(null);
  const running = useRef(false);

  useEffect(() => {
    const cached = loadCached(app.id);
    if (cached) {
      setResult(cached);
      setPhase("done");
    }
  }, [app.id]);

  const externalId = app.externalId;
  const country = app.rawData?.publicCountry ?? "us";
  const isPlay = app.platform === "android";

  const runCheck = useCallback(async () => {
    if (running.current || !externalId) return;
    running.current = true;
    setPhase("running");
    setError("");
    setPercent(2);
    setStepLabel("Reading your listing");
    try {
      const checkedApp = isPlay
        ? await lookupPlayApp(externalId, country)
        : await lookupApp(externalId, country);
      if (!checkedApp) {
        throw new Error(
          "We couldn't read this app's public listing right now.",
        );
      }
      setPercent(PROGRESS_LOOKUP_DONE);

      const candidates = extractKeywordCandidates(checkedApp).slice(
        0,
        MAX_QUICKCHECK_KEYWORDS,
      );
      if (!candidates.length) {
        throw new Error(
          "This listing has too little text to extract keywords from.",
        );
      }

      const collected: KeywordScore[] = [];
      for (const [i, keyword] of candidates.entries()) {
        if (i > 0) await sleep(CALL_DELAY_MS);
        setStepLabel(`Scoring "${keyword}"`);
        try {
          const { competitors, rank } = isPlay
            ? await playKeywordData(keyword, country, checkedApp.trackId)
            : await searchWithRank(keyword, country, checkedApp.trackId);
          const popularity = estimatePopularity(competitors, keyword);
          const difficulty = calculateDifficulty(competitors, keyword);
          collected.push({
            appRank: rank,
            breakdown: difficulty.breakdown,
            classification: classifyKeyword(popularity, difficulty.score),
            competitors: [],
            country,
            difficulty: difficulty.score,
            difficultyLabel: difficulty.label,
            downloads: estimateDownloads(popularity, country),
            keyword,
            opportunity: calcOpportunity(popularity, difficulty.score),
            popularity,
            tiers: difficulty.tiers,
          });
        } catch {
          // Skip a keyword the store refused; the check-up survives.
        }
        setPercent(
          PROGRESS_LOOKUP_DONE +
            ((i + 1) / candidates.length) * PROGRESS_SCORING_SPAN,
        );
      }
      if (!collected.length) {
        throw new Error(
          "The store wouldn't answer our searches. Try again in a minute.",
        );
      }

      setStepLabel("Building your check-up");
      const audit = buildAudit(checkedApp, collected);
      const next: QuickCheckResult = {
        asoScore: audit.asoScore,
        checkedAt: new Date().toISOString(),
        country,
        issues: [...audit.issues]
          .sort((a, b) => b.scorePenalty - a.scorePenalty)
          .slice(0, 5)
          .map(({ id, severity, title, detail, scorePenalty }) => ({
            detail,
            id,
            scorePenalty,
            severity,
            title,
          })),
        strengths: audit.strengths,
      };
      saveCached(app.id, next);
      setResult(next);
      setPercent(100);
      setPhase("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setPhase("error");
    } finally {
      running.current = false;
    }
  }, [app.id, country, externalId, isPlay]);

  // Without a store id there is no public listing to read.
  if (!externalId) return null;

  const versionList = versions.data ?? [];
  const versionId = (versionList.find((v) => v.isEditable) ?? versionList[0])
    ?.id;
  const isRunning = phase === "running";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            ASO Check-up
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runCheck}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3.5 w-3.5" />
            )}
            {result ? "Re-run check-up" : "Run check-up"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isRunning && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {stepLabel}…
            </p>
            <Progress value={percent} className="h-2" />
          </div>
        )}

        {!isRunning && phase === "error" && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {!isRunning && phase !== "error" && !result && (
          <p className="text-sm text-muted-foreground">
            Score your live store listing in your browser: the keywords it
            targets, where you rank and what to improve first.
          </p>
        )}

        {!isRunning && phase === "done" && result && (
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex flex-none flex-col items-center gap-1">
              <div
                className="grid h-16 w-16 place-items-center rounded-full border-4 text-xl font-bold"
                style={{ borderColor: scoreColor(result.asoScore) }}
                aria-label={`ASO score ${result.asoScore} out of 100`}
              >
                {result.asoScore}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {new Date(result.checkedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {result.issues.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No blocking issues found - nice listing.
                </p>
              )}
              {result.issues.map((issue) => {
                const link = issueLink(issue.id, app.id, versionId);
                return (
                  <div
                    key={issue.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className={`h-4 w-1 flex-none rounded ${
                        issue.severity === "high"
                          ? "bg-red-500"
                          : issue.severity === "medium"
                            ? "bg-amber-500"
                            : "bg-border"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate" title={issue.detail}>
                      {issue.title}
                    </span>
                    <Link
                      href={link.href}
                      className="flex flex-none items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {link.label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
