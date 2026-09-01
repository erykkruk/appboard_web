"use client";

import { ArrowRight, Loader2, Search, Sparkles } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { searchCompetitors } from "@/lib/aso-check/itunes";
import { playKeywordData } from "@/lib/aso-check/play";
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
  difficultyMeta,
  formatDownloadRange,
  KEYWORD_COUNTRIES,
  parseKeywordInput,
} from "@/lib/keyword-research";

const CALL_DELAY_MS = 300;
const MAX_FREE_KEYWORDS = 5;
const QUOTA_TOOL = "keyword-check" as const;
const SEARCH_LIMIT = 25;
const SIGNUP_URL = "/register?from=keyword-check";

type StoreKind = "appstore" | "playstore";

/** Ingest the scores so the crowd keyword dataset keeps growing. */
function submitResults(
  scores: KeywordScore[],
  country: string,
  store: StoreKind,
) {
  const keywords = scores
    .filter((s) => !s.error)
    .map((s) => ({
      appRank: null,
      classification: s.classification,
      difficulty: s.difficulty,
      keyword: s.keyword,
      opportunity: s.opportunity,
      popularity: s.popularity,
    }));
  if (!keywords.length) return;
  fetch("/api/public/aso-reports", {
    body: JSON.stringify({ country, keywords, store }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => {
    // Storing the observation is our concern, not the visitor's.
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Free keyword difficulty checker: score any keywords (not just the ones a
 * listing already targets). App Store data is fetched straight from Apple by
 * the visitor's browser; Play goes through our cached public proxy. Scoring
 * itself always runs locally with the shared engine.
 */
export function KeywordCheckFlow() {
  const [input, setInput] = useState("");
  const [country, setCountry] = useState("us");
  const [store, setStore] = useState<StoreKind>("appstore");
  const [scores, setScores] = useState<KeywordScore[]>([]);
  const [percent, setPercent] = useState(0);
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const running = useRef(false);

  useEffect(() => {
    fetchQuota().then((status) => {
      if (status) setQuota(status[QUOTA_TOOL]);
    });
  }, []);

  const allowance = quota?.remaining ?? MAX_FREE_KEYWORDS;
  const keywords = parseKeywordInput(input).slice(
    0,
    Math.max(0, Math.min(MAX_FREE_KEYWORDS, allowance)),
  );

  const run = useCallback(async () => {
    if (running.current || !keywords.length) return;
    running.current = true;
    setBusy(true);
    setError("");
    setScores([]);
    setExpanded(null);
    setPercent(0);
    const reservation = await consumeQuota(QUOTA_TOOL, keywords.length);
    if (!reservation.allowed) {
      setQuota(reservation);
      setError(
        `You have used today's ${reservation.limit} free keywords. The counter resets tomorrow - or create a free account for unlimited checks.`,
      );
      setBusy(false);
      running.current = false;
      return;
    }
    setQuota(reservation);

    const collected: KeywordScore[] = [];
    let lastError = "";
    try {
      for (const [i, keyword] of keywords.entries()) {
        if (i > 0) await sleep(CALL_DELAY_MS);
        setCurrent(keyword);
        try {
          const competitors =
            store === "playstore"
              ? (await playKeywordData(keyword, country)).competitors
              : await searchCompetitors(keyword, country, SEARCH_LIMIT);
          const popularity = estimatePopularity(competitors, keyword);
          const difficulty = calculateDifficulty(competitors, keyword);
          collected.push({
            appRank: null,
            breakdown: difficulty.breakdown,
            classification: classifyKeyword(popularity, difficulty.score),
            competitors: competitors.slice(0, 10),
            country,
            difficulty: difficulty.score,
            difficultyLabel: difficulty.label,
            downloads: estimateDownloads(popularity, country),
            keyword,
            opportunity: calcOpportunity(popularity, difficulty.score),
            popularity,
            tiers: difficulty.tiers,
          });
          setScores([...collected]);
        } catch (err) {
          // One keyword failing must not kill the batch - but remember why,
          // so a fully failed run can say what actually went wrong.
          lastError = err instanceof Error ? err.message : String(err);
        }
        setPercent(((i + 1) / keywords.length) * 100);
      }
      if (!collected.length) {
        setError(
          lastError ||
            "The store wouldn't answer our searches. Try again in a minute.",
        );
        return;
      }
      collected.sort((a, b) => b.opportunity - a.opportunity);
      setScores([...collected]);
      submitResults(collected, country, store);
    } finally {
      setBusy(false);
      setCurrent("");
      running.current = false;
    }
  }, [country, keywords, store]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 py-10">
      <div className="text-center">
        <Badge variant="outline" className="mb-4">
          Free · no account · runs in your browser
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">
          Keyword difficulty checker
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Type any keywords - not just the ones your listing already uses - and
          see how hard they are to rank for, how much they are searched, and
          which apps own them today.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Textarea
            placeholder="habit tracker, meditation timer, budget planner"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={store}
              onValueChange={(v) => setStore(v as StoreKind)}
            >
              <SelectTrigger className="!h-11 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appstore">App Store</SelectItem>
                <SelectItem value="playstore">Google Play</SelectItem>
              </SelectContent>
            </Select>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="!h-11 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KEYWORD_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="h-11"
              disabled={!keywords.length || busy}
              onClick={run}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Check {keywords.length || ""} keyword
              {keywords.length === 1 ? "" : "s"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {quota
                ? `${quota.remaining} of ${quota.limit} free keywords left today`
                : `${MAX_FREE_KEYWORDS} free keywords per day`}{" "}
              · unlimited with a free account
            </span>
          </div>
          {busy && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Scoring &ldquo;{current}&rdquo;…</span>
                <span className="font-mono tabular-nums">
                  {Math.round(percent)}%
                </span>
              </div>
              <Progress value={percent} className="mt-1 h-2" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {scores.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Popularity</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead>Downloads at #1</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((score) => {
                const meta = CLASSIFICATION_META[score.classification];
                const diff = difficultyMeta(score.difficultyLabel);
                const top1 = score.downloads.positions[0];
                const isOpen = expanded === score.keyword;
                return (
                  <Fragment key={score.keyword}>
                    <TableRow>
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
                        {top1
                          ? `${formatDownloadRange(top1.low, top1.high)}/day`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpanded(isOpen ? null : score.keyword)
                          }
                        >
                          {isOpen ? "Hide" : "Details"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
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
      )}

      {scores.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Check your own app against these keywords
            </CardTitle>
            <CardDescription>
              A free account scores unlimited keywords, shows where your app
              ranks for each one, scans every market at once, and tracks the
              numbers nightly so you can see what your changes did.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={SIGNUP_URL}>
                Create free account <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/aso-check">Run a full app check-up</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
