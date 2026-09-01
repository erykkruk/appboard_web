"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type AuditResult,
  buildAudit,
  buildNextSteps,
  extractKeywordCandidates,
  type NextStep,
} from "@/lib/aso-check/audit";
import {
  type AppSuggestion,
  type CheckedApp,
  lookupApp,
  searchItunesApps,
  searchWithRank,
} from "@/lib/aso-check/itunes";
import {
  lookupPlayApp,
  playKeywordData,
  searchPlayApps,
} from "@/lib/aso-check/play";
import {
  consumeQuota,
  fetchQuota,
  type QuotaState,
} from "@/lib/aso-check/quota";
import {
  calcOpportunity,
  calculateDifficulty,
  classifyKeyword,
  estimateDownloads,
  estimatePopularity,
} from "@/lib/aso-engine/keyword-scoring";
import type { KeywordScore } from "@/lib/aso-engine/scoring-types";
import {
  CLASSIFICATION_META,
  countryLabel,
  difficultyMeta,
  formatDownloadRange,
  KEYWORD_COUNTRIES,
} from "@/lib/keyword-research";
import { parseStoreUrl } from "@/lib/research";

const CALL_DELAY_MS = 300;

const SEARCH_DEBOUNCE_MS = 400;
const SIGNUP_URL = "/register?from=aso-check";
const QUOTA_TOOL = "aso-check" as const;

/**
 * Google Play artwork is re-served from our own origin: privacy blockers
 * (Brave Shields, uBlock lists) commonly block googleusercontent.com, which
 * silently breaks every Play icon and screenshot.
 */
function storeImage(url: string): string {
  return url.includes("googleusercontent.com")
    ? `/api/public/play/image?u=${encodeURIComponent(url)}`
    : url;
}

// Progress budget: lookup 10%, keyword scoring 10-95%, finishing 95-100%.
const PROGRESS_LOOKUP_DONE = 10;
const PROGRESS_SCORING_SPAN = 85;

type Phase = "idle" | "running" | "done" | "error";
type StoreKind = "appstore" | "playstore";

interface CheckTarget {
  country: string;
  id: string;
  store: StoreKind;
}

interface FinishedReport {
  audit: AuditResult;
  nextSteps: NextStep[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fire-and-forget ingest: store the browser-computed results server-side. */
function submitResults(
  app: CheckedApp,
  audit: AuditResult,
  scores: KeywordScore[],
  store: StoreKind,
) {
  const payload = {
    appName: app.name.slice(0, 255),
    asoScore: audit.asoScore,
    country: app.country,
    keywords: scores
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
    store,
    trackId: app.trackId,
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

/** Floating progress overlay shown while the report builds underneath. */
function ProgressOverlay({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            {label}
          </span>
          <span className="font-mono tabular-nums text-muted-foreground">
            {Math.round(percent)}%
          </span>
        </div>
        <Progress value={percent} className="mt-2 h-2" />
      </div>
    </div>
  );
}

export function AsoCheckFlow() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("us");
  const [suggestions, setSuggestions] = useState<AppSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [percent, setPercent] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [app, setApp] = useState<CheckedApp | null>(null);
  const [store, setStore] = useState<StoreKind>("appstore");
  const [scores, setScores] = useState<KeywordScore[]>([]);
  const [report, setReport] = useState<FinishedReport | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const running = useRef(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    fetchQuota().then((status) => {
      if (status) setQuota(status[QUOTA_TOOL]);
    });
  }, []);

  // App-name typeahead: search both stores while typing (skipped for URLs).
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3 || term.includes("://") || phase === "running") {
      setSuggestions([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      const [apple, play] = await Promise.allSettled([
        searchItunesApps(term, country),
        searchPlayApps(term, country),
      ]);
      if (seq !== searchSeq.current) return;
      const merged = [
        ...(apple.status === "fulfilled" ? apple.value.slice(0, 4) : []),
        ...(play.status === "fulfilled" ? play.value.slice(0, 4) : []),
      ];
      setSuggestions(merged);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, country, phase]);

  const run = useCallback(
    async (target: CheckTarget) => {
      if (running.current) return;
      running.current = true;
      const reservation = await consumeQuota(QUOTA_TOOL);
      if (!reservation.allowed) {
        setQuota(reservation);
        setError(
          `You have used today's ${reservation.limit} free check-ups. The counter resets tomorrow - or create a free account for unlimited reports.`,
        );
        setPhase("error");
        running.current = false;
        return;
      }
      setQuota(reservation);
      const isPlay = target.store === "playstore";
      setStore(target.store);
      setError("");
      setSuggestions([]);
      setPhase("running");
      setPercent(2);
      setStepLabel("Reading your listing");
      setApp(null);
      setScores([]);
      setReport(null);
      setExpanded(null);
      try {
        const checkedApp = isPlay
          ? await lookupPlayApp(target.id, target.country)
          : await lookupApp(target.id, target.country);
        if (!checkedApp) {
          throw new Error(
            "We couldn't find this app in that storefront. Check the link and the selected market.",
          );
        }
        // The report shell renders immediately; everything below fills it in.
        setApp(checkedApp);
        setPercent(PROGRESS_LOOKUP_DONE);

        const candidates = extractKeywordCandidates(checkedApp);
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
              ? await playKeywordData(
                  keyword,
                  checkedApp.country,
                  checkedApp.trackId,
                )
              : await searchWithRank(
                  keyword,
                  checkedApp.country,
                  checkedApp.trackId,
                );
            const popularity = estimatePopularity(competitors, keyword);
            const difficulty = calculateDifficulty(competitors, keyword);
            const score: KeywordScore = {
              appRank: rank,
              breakdown: difficulty.breakdown,
              classification: classifyKeyword(popularity, difficulty.score),
              competitors: competitors.slice(0, 10),
              country: checkedApp.country,
              difficulty: difficulty.score,
              difficultyLabel: difficulty.label,
              downloads: estimateDownloads(popularity, checkedApp.country),
              keyword,
              opportunity: calcOpportunity(popularity, difficulty.score),
              popularity,
              tiers: difficulty.tiers,
            };
            collected.push(score);
            // Live-append so the table grows while we work.
            setScores([...collected]);
          } catch {
            // Skip a keyword the store refused; the report survives.
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

        setStepLabel("Building your report");
        setPercent(97);
        const audit = buildAudit(checkedApp, collected);
        const nextSteps = buildNextSteps(checkedApp, collected, audit);
        collected.sort((a, b) => b.opportunity - a.opportunity);
        setScores([...collected]);
        setReport({ audit, nextSteps });
        submitResults(checkedApp, audit, collected, target.store);
        setPercent(100);
        setPhase("done");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
        setPhase("error");
        setApp(null);
      } finally {
        running.current = false;
      }
    },
    [],
  );

  const submitQuery = useCallback(() => {
    const parsed = parseStoreUrl(query.trim());
    if (parsed) {
      run({
        country: parsed.country || country,
        id: parsed.id,
        store: parsed.store,
      });
      return;
    }
    if (suggestions.length) {
      const first = suggestions[0];
      run({ country, id: first.appId, store: first.store });
      return;
    }
    setError(
      "Paste an App Store / Google Play link, or type an app name and pick it from the list.",
    );
  }, [query, country, suggestions, run]);

  if (phase === "idle" || phase === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl py-16 text-center">
        <Badge variant="outline" className="mb-4">
          Free · no account · runs in your browser
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">
          Find your app. Get your ASO check-up.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          AppBoard reads your App Store or Google Play listing, finds the
          keywords it targets, scores them against the live store, checks
          where you rank and tells you what to fix first.
        </p>

        <form
          className="mx-auto mt-8 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery();
          }}
        >
          <div className="flex gap-2">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="!h-11 w-44 flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" disabled>
                  <span className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5" />
                    All markets - full AppBoard
                  </span>
                </SelectItem>
                {KEYWORD_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input
                placeholder="App name, or paste a store link…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  const parsed = parseStoreUrl(e.target.value.trim());
                  if (parsed?.country) setCountry(parsed.country);
                }}
                className="h-11"
              />
              {(suggestions.length > 0 || searching) && (
                <div className="absolute inset-x-0 top-12 z-40 rounded-lg border bg-background text-left shadow-lg">
                  {searching && suggestions.length === 0 && (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching both stores…
                    </div>
                  )}
                  {suggestions.map((s) => (
                    <button
                      key={`${s.store}:${s.appId}`}
                      type="button"
                      className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-muted/60"
                      onClick={() =>
                        run({ country, id: s.appId, store: s.store })
                      }
                    >
                      {s.icon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={storeImage(s.icon)}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 rounded-lg"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {s.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {s.developer}
                        </span>
                      </span>
                      <Badge variant="secondary" className="flex-none text-xs">
                        {s.store === "appstore" ? "App Store" : "Google Play"}
                      </Badge>
                      {s.rating ? (
                        <span className="flex flex-none items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {s.rating.toFixed(1)}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" className="h-11 flex-none">
              <Search className="mr-2 h-4 w-4" />
              Check
            </Button>
          </div>
          <p className="mt-2 text-left text-xs text-muted-foreground">
            {quota
              ? `${quota.remaining} of ${quota.limit} free check-ups left today. `
              : ""}
            Pick one market for the free check. Scanning all markets at once
            is part of the full AppBoard -{" "}
            <Link href={SIGNUP_URL} className="underline">
              free account
            </Link>
            .
          </p>
        </form>
        {error && (
          <p className="mx-auto mt-4 max-w-lg text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          App Store checks talk directly to Apple&apos;s public API from your
          browser; Google Play data flows through our lightweight proxy. We
          only store the resulting scores to improve keyword data for
          everyone.
        </p>
      </div>
    );
  }

  // Report shell: renders as soon as the listing is read and fills in live.
  if (!app) {
    return (
      <>
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Reading your listing…
        </div>
        <ProgressOverlay label={stepLabel} percent={percent} />
      </>
    );
  }

  const audit = report?.audit;
  const isRunning = phase === "running";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 py-10 pb-28">
      {isRunning && <ProgressOverlay label={stepLabel} percent={percent} />}

      <div className="flex flex-wrap items-center gap-4">
        {app.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={storeImage(app.icon)}
            alt=""
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-2xl"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{app.name}</h1>
          <p className="text-sm text-muted-foreground">
            {app.developer} · {app.genre} ·{" "}
            {countryLabel(app.country)} ·{" "}
            {store === "appstore" ? "App Store" : "Google Play"}
          </p>
        </div>
        {!isRunning && (
          <div className="ml-auto">
            <Button variant="outline" onClick={() => setPhase("idle")}>
              Check another app
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-6 pt-6">
            {audit ? (
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
            ) : (
              <div className="grid h-24 w-24 flex-none animate-pulse place-items-center rounded-full border-8 border-muted text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            <div>
              <p className="font-semibold">Your ASO score</p>
              {audit ? (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {audit.strengths.slice(0, 2).map((s) => (
                    <li key={s}>✓ {s}</li>
                  ))}
                  <li>
                    {audit.issues.length} issue
                    {audit.issues.length === 1 ? "" : "s"} found below
                  </li>
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Calculating while keywords are scored…
                </p>
              )}
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
            {(audit?.themes ?? extractKeywordCandidates(app).slice(0, 4)).map(
              (theme) => (
                <Badge key={theme} variant="secondary">
                  {theme}
                </Badge>
              ),
            )}
          </CardContent>
        </Card>
      </div>

      {app.screenshotUrls.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Your store preview
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              what searchers see
            </span>
          </h2>
          <div className="flex gap-3 overflow-x-auto rounded-lg border p-3">
            {app.screenshotUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={storeImage(url)}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-56 w-auto flex-none rounded-lg border"
              />
            ))}
          </div>
        </section>
      )}

      {report && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Do this next</h2>
          <div className="space-y-3">
            {report.nextSteps.map((step, i) => (
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
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          Keywords your listing targets
          {isRunning && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              scoring live…
            </span>
          )}
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
              {isRunning && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-4 text-center text-sm text-muted-foreground"
                  >
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    {stepLabel}…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {report && (
          <p className="mt-2 text-xs text-muted-foreground">
            Want more? The full AppBoard generates AI keyword ideas in every
            language you ship and scans all markets at once -{" "}
            <Link href={SIGNUP_URL} className="underline">
              free account
            </Link>
            .
          </p>
        )}
      </section>

      {audit && (
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
                    {issue.appboard && (
                      <p className="mt-1.5 text-sm">
                        <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-primary">
                          Easy with AppBoard:
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {issue.appboard}
                        </span>
                      </p>
                    )}
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
      )}

      {report && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-4 pt-6">
            <Sparkles className="h-8 w-8 flex-none text-primary" />
            <div className="min-w-60 flex-1">
              <p className="font-semibold">Want the full picture - free?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A free AppBoard account adds AI keyword ideas in every
                language you ship, all-markets scans, review analysis,
                competitor teardowns and nightly rank tracking with trends.
              </p>
            </div>
            <Button asChild>
              <Link href={SIGNUP_URL}>
                Create free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
