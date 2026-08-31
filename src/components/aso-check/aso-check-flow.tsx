"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useRef, useState } from "react";

import { KeywordScoreDetails } from "@/components/research/keyword-score-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calcOpportunity,
  calculateDifficulty,
  classifyKeyword,
  estimateDownloads,
  estimatePopularity,
} from "@/lib/aso-engine/keyword-scoring";
import type { KeywordScore } from "@/lib/aso-engine/scoring-types";
import {
  type AuditResult,
  buildAudit,
  buildNextSteps,
  extractKeywordCandidates,
  type NextStep,
} from "@/lib/aso-check/audit";
import {
  type CheckedApp,
  lookupApp,
  searchWithRank,
} from "@/lib/aso-check/itunes";
import {
  CLASSIFICATION_META,
  difficultyMeta,
  formatDownloadRange,
} from "@/lib/keyword-research";
import { parseStoreUrl } from "@/lib/research";

const CALL_DELAY_MS = 300;
const SIGNUP_URL = "/register?from=aso-check";

const PROGRESS_STEPS = [
  "Reading your listing",
  "Finding the keywords your listing targets",
  "Scoring each keyword against the live App Store",
  "Checking where you rank (top 200)",
  "Building your report",
] as const;

type Phase = "idle" | "running" | "done" | "error";

interface CheckState {
  app: CheckedApp;
  audit: AuditResult;
  nextSteps: NextStep[];
  scores: KeywordScore[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fire-and-forget ingest: store the browser-computed results server-side. */
function submitResults(state: CheckState) {
  const payload = {
    appName: state.app.name.slice(0, 255),
    asoScore: state.audit.asoScore,
    country: state.app.country,
    keywords: state.scores
      .filter((s) => !s.error)
      .slice(0, 20)
      .map((s) => ({
        appRank: s.appRank ?? null,
        classification: s.classification,
        difficulty: s.difficulty,
        keyword: s.keyword,
        opportunity: s.opportunity,
        popularity: s.popularity,
      })),
    trackId: state.app.trackId,
  };
  if (!payload.keywords.length) return;
  fetch("/api/public/aso-reports", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => {
    // Storing the observation is our concern, not the visitor's.
  });
}

export function AsoCheckFlow() {
  const [link, setLink] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDetail, setStepDetail] = useState("");
  const [result, setResult] = useState<CheckState | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (running.current) return;
    const parsed = parseStoreUrl(link.trim());
    if (!parsed) {
      setError(
        "That doesn't look like an App Store or Google Play link. Example: https://apps.apple.com/us/app/yourapp/id1234567890",
      );
      return;
    }
    if (parsed.store === "playstore") {
      setError(
        "Google Play check-ups are coming soon - the free check currently supports App Store links. Create a free account to research Play apps in the full panel.",
      );
      return;
    }
    running.current = true;
    setError("");
    setPhase("running");
    setStepIndex(0);
    setStepDetail("");
    setExpanded(null);
    try {
      const app = await lookupApp(parsed.id, parsed.country);
      if (!app) {
        throw new Error(
          "We couldn't find this app in that storefront. Check the link and the country code in it.",
        );
      }

      setStepIndex(1);
      const candidates = extractKeywordCandidates(app);
      if (!candidates.length) {
        throw new Error(
          "This listing has too little text to extract keywords from.",
        );
      }

      setStepIndex(2);
      const scores: KeywordScore[] = [];
      for (const [i, keyword] of candidates.entries()) {
        if (i > 0) await sleep(CALL_DELAY_MS);
        setStepDetail(`"${keyword}" (${i + 1}/${candidates.length})`);
        if (i === Math.floor(candidates.length / 2)) setStepIndex(3);
        try {
          const { competitors, rank } = await searchWithRank(
            keyword,
            app.country,
            app.trackId,
          );
          const popularity = estimatePopularity(competitors, keyword);
          const difficulty = calculateDifficulty(competitors, keyword);
          scores.push({
            appRank: rank,
            breakdown: difficulty.breakdown,
            classification: classifyKeyword(popularity, difficulty.score),
            competitors: competitors.slice(0, 10),
            country: app.country,
            difficulty: difficulty.score,
            difficultyLabel: difficulty.label,
            downloads: estimateDownloads(popularity, app.country),
            keyword,
            opportunity: calcOpportunity(popularity, difficulty.score),
            popularity,
            tiers: difficulty.tiers,
          });
        } catch {
          // Skip a keyword Apple refused; the report survives.
        }
      }
      if (!scores.length) {
        throw new Error(
          "The App Store wouldn't answer our searches from your network. Try again in a minute.",
        );
      }

      setStepIndex(4);
      setStepDetail("");
      const audit = buildAudit(app, scores);
      const nextSteps = buildNextSteps(app, scores, audit);
      scores.sort((a, b) => b.opportunity - a.opportunity);
      const state: CheckState = { app, audit, nextSteps, scores };
      setResult(state);
      submitResults(state);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    } finally {
      running.current = false;
    }
  }, [link]);

  if (phase === "idle" || phase === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl py-16 text-center">
        <Badge variant="outline" className="mb-4">
          Free · no account · runs in your browser
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">
          Paste a link. Get your ASO check-up.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          AppBoard reads your App Store listing, finds the keywords it
          targets, scores them against the live store, checks where you rank
          and tells you what to fix first. All computed on your device -
          nothing to install, nothing to connect.
        </p>
        <form
          className="mx-auto mt-8 flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <Input
            type="url"
            placeholder="https://apps.apple.com/us/app/yourapp/id…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="h-11"
          />
          <Button type="submit" className="h-11">
            <Search className="mr-2 h-4 w-4" />
            Check my app
          </Button>
        </form>
        {error && (
          <p className="mx-auto mt-4 max-w-lg text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          Your browser talks directly to Apple&apos;s public API. We only store the
          resulting scores to improve keyword data for everyone.
        </p>
      </div>
    );
  }

  if (phase === "running") {
    return (
      <div className="mx-auto w-full max-w-md py-20">
        <div className="space-y-4">
          {PROGRESS_STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex items-center gap-3 text-sm transition-opacity ${
                i > stepIndex ? "opacity-40" : ""
              }`}
            >
              <span className="grid h-6 w-6 flex-none place-items-center rounded-full border">
                {i < stepIndex ? (
                  "✓"
                ) : i === stepIndex ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  ""
                )}
              </span>
              <span>
                {label}
                {i === stepIndex && stepDetail ? (
                  <span className="text-muted-foreground"> - {stepDetail}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!result) return null;
  const { app, audit, nextSteps, scores } = result;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 py-10">
      <div className="flex flex-wrap items-center gap-4">
        {app.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={app.icon} alt="" className="h-16 w-16 rounded-2xl" />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{app.name}</h1>
          <p className="text-sm text-muted-foreground">
            {app.developer} · {app.genre} · {app.country.toUpperCase()}
          </p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" onClick={() => setPhase("idle")}>
            Check another app
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-6 pt-6">
            <div
              className="grid h-24 w-24 flex-none place-items-center rounded-full border-8 text-3xl font-bold"
              style={{
                borderColor:
                  audit.asoScore >= 70
                    ? "var(--color-green-500, #22c55e)"
                    : audit.asoScore >= 45
                      ? "var(--color-amber-500, #f59e0b)"
                      : "var(--color-red-500, #ef4444)",
              }}
              aria-label={`ASO score ${audit.asoScore} out of 100`}
            >
              {audit.asoScore}
            </div>
            <div>
              <p className="font-semibold">Your ASO score</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {audit.strengths.slice(0, 2).map((s) => (
                  <li key={s}>✓ {s}</li>
                ))}
                <li>
                  {audit.issues.length} issue
                  {audit.issues.length === 1 ? "" : "s"} found below
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              What your listing talks about
            </CardTitle>
            <CardDescription>
              The store can only rank you for what your listing says.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {audit.themes.map((theme) => (
              <Badge key={theme} variant="secondary">
                {theme}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Do this next</h2>
        <div className="space-y-3">
          {nextSteps.map((step, i) => (
            <Card key={step.title}>
              <CardContent className="flex items-start gap-4 pt-5">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-primary/10 font-mono text-sm text-primary">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.detail}
                  </p>
                  {step.suggestion && (
                    <code className="mt-2 inline-block rounded bg-muted px-2 py-1 text-sm">
                      {step.suggestion}
                    </code>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={step.cta.href}>{step.cta.label}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Keywords your listing targets
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Keyword</TableHead>
                <TableHead>Popularity</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Targeting</TableHead>
                <TableHead>Your rank</TableHead>
                <TableHead>Downloads at #1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((score) => {
                const isOpen = expanded === score.keyword;
                const meta = CLASSIFICATION_META[score.classification];
                const diff = difficultyMeta(score.difficultyLabel);
                const top1 = score.downloads.positions[0];
                return (
                  <Fragment key={score.keyword}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpanded(isOpen ? null : score.keyword)
                      }
                    >
                      <TableCell>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {score.keyword}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {score.popularity ?? "-"}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${diff.className}`}>
                          {score.difficulty}
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {diff.label}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {score.opportunity}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={meta.className}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {score.appRank ? `#${score.appRank}` : "-"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {top1
                          ? `${formatDownloadRange(top1.low, top1.high)}/day`
                          : "-"}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30">
                          <KeywordScoreDetails score={score} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          What&apos;s holding you back
        </h2>
        <Card>
          <CardContent className="divide-y pt-2">
            {audit.issues.map((issue) => (
              <div key={issue.id} className="flex gap-3 py-3">
                <span
                  className={`mt-1 h-full w-1 flex-none self-stretch rounded ${
                    issue.severity === "high"
                      ? "bg-red-500"
                      : issue.severity === "medium"
                        ? "bg-amber-500"
                        : "bg-border"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">{issue.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {issue.detail}
                  </p>
                </div>
              </div>
            ))}
            {audit.issues.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">
                No blocking issues found - nice listing.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Sparkles className="h-8 w-8 flex-none text-primary" />
          <div className="min-w-60 flex-1">
            <p className="font-semibold">Want the full picture - free?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A free AppBoard account adds AI keyword ideas in every language
              you ship, review analysis, competitor teardowns, country
              opportunity scans and nightly rank tracking with trends.
            </p>
          </div>
          <Button asChild>
            <Link href={SIGNUP_URL}>
              Create free account <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
