"use client";

import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Globe,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Square,
  Star,
} from "lucide-react";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

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
  extractKeywordCandidates,
  type NextStep,
} from "@/lib/aso-check/audit";
import {
  type AppSuggestion,
  type CheckedApp,
  searchItunesApps,
} from "@/lib/aso-check/itunes";
import { searchPlayApps } from "@/lib/aso-check/play";
import {
  consumeQuota,
  fetchQuota,
  type QuotaState,
} from "@/lib/aso-check/quota";
import {
  ALL_MARKETS,
  type CheckProgress,
  runCheck,
} from "@/lib/aso-check/run-check";
import {
  type CheckMode,
  createShare,
  fetchShare,
  type MarketReport,
  type SharedAsoReport,
  sharePath,
  type StoreKind,
} from "@/lib/aso-check/share";
import type { KeywordScore } from "@/lib/aso-engine/scoring-types";
import {
  CLASSIFICATION_META,
  countryLabel,
  difficultyMeta,
  formatDownloadRange,
  KEYWORD_COUNTRIES,
} from "@/lib/keyword-research";
import { parseStoreUrl } from "@/lib/research";

const SEARCH_DEBOUNCE_MS = 400;
const SIGNUP_URL = "/register?from=aso-check";
const QUOTA_TOOL = "aso-check" as const;
const TOOL_PATH = "/aso-check";
/** Storefront used for the name typeahead when "all markets" is selected. */
const TYPEAHEAD_COUNTRY = "us";
const FIRST_PAGE_RANK = 10;

/**
 * Public store link of the checked app. The lookup normally carries one; the
 * canonical fallback is rebuilt from the store id so the signup link is never
 * empty.
 */
function storeLinkFor(app: CheckedApp, store: StoreKind): string {
  if (app.url) return app.url;
  return store === "playstore"
    ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.trackId)}&gl=${encodeURIComponent(app.country)}`
    : `https://apps.apple.com/${encodeURIComponent(app.country)}/app/id${encodeURIComponent(app.trackId)}`;
}

/**
 * Signup link that carries the checked app along, so the free report does not
 * dead-end: the panel picks the link up and imports the app after signup.
 */
function importSignupUrl(app: CheckedApp, store: StoreKind): string {
  return `${SIGNUP_URL}&url=${encodeURIComponent(storeLinkFor(app, store))}`;
}

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

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-green-500, #22c55e)";
  if (score >= 45) return "var(--color-amber-500, #f59e0b)";
  return "var(--color-red-500, #ef4444)";
}

type Phase = "idle" | "loading" | "running" | "done" | "error";

/** The storefront being scored right now: rows arrive one keyword at a time. */
interface LiveMarket {
  app: CheckedApp;
  country: string;
  scores: KeywordScore[];
}

/** What the detail section renders: a finished market or the live one. */
interface ShownMarket {
  app: CheckedApp;
  audit?: AuditResult;
  country: string;
  nextSteps: NextStep[];
  pending: boolean;
  scores: KeywordScore[];
}

/** Fire-and-forget ingest: store one market's results server-side. */
function submitResults(report: MarketReport, store: StoreKind) {
  const payload = {
    appName: report.app.name.slice(0, 255),
    asoScore: report.audit.asoScore,
    country: report.country,
    keywords: report.scores
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
    trackId: report.app.trackId,
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

function marketStats(report: MarketReport) {
  const ranked = report.scores.filter((s) => s.appRank);
  return {
    firstPage: ranked.filter((s) => (s.appRank ?? 999) <= FIRST_PAGE_RANK)
      .length,
    highIssues: report.audit.issues.filter((i) => i.severity === "high")
      .length,
    ranked: ranked.length,
    // Scores arrive sorted by opportunity, best first.
    top: report.scores[0],
  };
}

/** Floating progress overlay shown while the report builds underneath. */
function ProgressOverlay({
  label,
  onStop,
  percent,
  progress,
}: {
  label: string;
  onStop?: () => void;
  percent: number;
  progress: CheckProgress | null;
}) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="w-full max-w-md rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <Loader2 className="h-4 w-4 flex-none animate-spin" />
            <span className="truncate">{label}</span>
          </span>
          <span className="flex flex-none items-center gap-2">
            <span className="font-mono tabular-nums text-muted-foreground">
              {Math.round(percent)}%
            </span>
            {onStop && (
              <Button size="sm" variant="outline" onClick={onStop}>
                <Square className="mr-1.5 h-3 w-3" />
                Stop here
              </Button>
            )}
          </span>
        </div>
        {progress && progress.marketCount > 1 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Market {progress.marketIndex + 1} of {progress.marketCount} ·{" "}
            {countryLabel(progress.country)}
          </p>
        )}
        <Progress value={percent} className="mt-2 h-2" />
      </div>
    </div>
  );
}

export function AsoCheckFlow({ reportId }: { reportId?: string }) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState<string>(ALL_MARKETS);
  const [suggestions, setSuggestions] = useState<AppSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [phase, setPhase] = useState<Phase>(reportId ? "loading" : "idle");
  const [error, setError] = useState("");
  const [percent, setPercent] = useState(0);
  const [progress, setProgress] = useState<CheckProgress | null>(null);
  const [store, setStore] = useState<StoreKind>("appstore");
  const [mode, setMode] = useState<CheckMode>("all");
  const [markets, setMarkets] = useState<MarketReport[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [live, setLive] = useState<LiveMarket | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [sharedAt, setSharedAt] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);
  const [copied, setCopied] = useState(false);
  const running = useRef(false);
  const cancelled = useRef(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    fetchQuota().then((status) => {
      if (status) setQuota(status[QUOTA_TOOL]);
    });
  }, []);

  // Opening a link: the snapshot is rendered exactly as it was checked.
  useEffect(() => {
    if (!reportId) return;
    let alive = true;
    fetchShare(reportId).then((result) => {
      if (!alive) return;
      if (result.status !== "ok") {
        setError(
          result.status === "not-found"
            ? "This shared report does not exist or has expired. Run a new check-up below."
            : "We could not open this shared report right now. Try again in a moment.",
        );
        setPhase("error");
        return;
      }
      const { report } = result.record;
      setStore(report.store);
      setMode(report.mode);
      setMarkets(report.markets);
      setMissing(report.missing);
      setPartial(report.partial);
      setActiveCountry(report.markets[0]?.country ?? null);
      setShareId(result.record.id);
      setSharedAt(result.record.createdAt);
      setPhase("done");
    });
    return () => {
      alive = false;
    };
  }, [reportId]);

  // App-name typeahead: search both stores while typing (skipped for URLs).
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3 || term.includes("://") || phase === "running") {
      setSuggestions([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const searchCountry = country === ALL_MARKETS ? TYPEAHEAD_COUNTRY : country;
    const timer = setTimeout(async () => {
      const [apple, play] = await Promise.allSettled([
        searchItunesApps(term, searchCountry),
        searchPlayApps(term, searchCountry),
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
    async (target: { country: string; id: string; store: StoreKind }) => {
      if (running.current) return;
      running.current = true;
      cancelled.current = false;
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
      const runMode: CheckMode = country === ALL_MARKETS ? "all" : "single";
      setStore(target.store);
      setMode(runMode);
      setError("");
      setSuggestions([]);
      setPhase("running");
      setPercent(2);
      setProgress(null);
      setMarkets([]);
      setMissing([]);
      setLive(null);
      setActiveCountry(null);
      setExpanded(null);
      setShareId(null);
      setSharedAt(null);
      setPartial(false);
      setCopied(false);
      const collected: MarketReport[] = [];
      const skipped: string[] = [];
      try {
        const outcome = await runCheck(
          {
            country: target.country,
            id: target.id,
            mode: runMode,
            store: target.store,
          },
          {
            isCancelled: () => cancelled.current,
            onApp: (app) => setLive({ app, country: app.country, scores: [] }),
            onMarket: (report) => {
              collected.push(report);
              skipped.length = 0;
              setMarkets([...collected]);
              setLive(null);
              // Stay on the first finished market; later ones fill the
              // overview without yanking the page around.
              if (collected.length === 1) setActiveCountry(report.country);
              submitResults(report, target.store);
            },
            onMissing: (cc) => {
              skipped.push(cc);
              setMissing((prev) => [...prev, cc]);
              setLive(null);
            },
            onProgress: (p) => {
              setProgress(p);
              setPercent(Math.max(2, p.percent));
            },
            onScores: (cc, app, scores) =>
              setLive({ app, country: cc, scores }),
          },
        );
        setPartial(outcome.partial);
        setLive(null);
        setProgress(null);
        setPercent(100);
        setPhase("done");
        const snapshot: SharedAsoReport = {
          markets: outcome.markets,
          missing: outcome.missing,
          mode: runMode,
          partial: outcome.partial,
          store: target.store,
          version: 1,
        };
        const id = await createShare(snapshot);
        if (id) {
          setShareId(id);
          setSharedAt(new Date().toISOString());
          // The address bar becomes the share link, so a reload or a
          // bookmark brings this report back instead of an empty form.
          window.history.replaceState(window.history.state, "", sharePath(id));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
        setPhase("error");
        setLive(null);
        setProgress(null);
      } finally {
        running.current = false;
      }
    },
    [country],
  );

  const submitQuery = useCallback(() => {
    const parsed = parseStoreUrl(query.trim());
    if (parsed) {
      run({
        country:
          country === ALL_MARKETS
            ? parsed.country || TYPEAHEAD_COUNTRY
            : country,
        id: parsed.id,
        store: parsed.store,
      });
      return;
    }
    if (suggestions.length) {
      const first = suggestions[0];
      run({
        country: country === ALL_MARKETS ? TYPEAHEAD_COUNTRY : country,
        id: first.appId,
        store: first.store,
      });
      return;
    }
    setError(
      "Paste an App Store / Google Play link, or type an app name and pick it from the list.",
    );
  }, [query, country, suggestions, run]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError("");
    setQuery("");
    if (window.location.pathname !== TOOL_PATH) {
      window.history.replaceState(window.history.state, "", TOOL_PATH);
    }
  }, []);

  const shareUrl = useMemo(
    () =>
      shareId && typeof window !== "undefined"
        ? `${window.location.origin}${sharePath(shareId)}`
        : "",
    [shareId],
  );

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied - anyone can open this report.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed - select the link below and copy it yourself.");
    }
  }, [shareUrl]);

  const isRunning = phase === "running";

  const shown: ShownMarket | null = useMemo(() => {
    const picked = activeCountry
      ? markets.find((m) => m.country === activeCountry)
      : undefined;
    if (picked) return { ...picked, pending: false };
    if (live) {
      return {
        app: live.app,
        country: live.country,
        nextSteps: [],
        pending: true,
        scores: live.scores,
      };
    }
    const first = markets[0];
    return first ? { ...first, pending: false } : null;
  }, [activeCountry, markets, live]);

  if (phase === "idle" || phase === "error") {
    return (
      <div className="mx-auto w-full max-w-2xl py-16 text-center">
        <Badge variant="outline" className="mb-4">
          Free · no account · runs in your browser
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight">
          Find your app. Get your ASO check-up in every market.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          AppBoard reads your App Store or Google Play listing in each of the{" "}
          {KEYWORD_COUNTRIES.length} storefronts we know, finds the keywords
          it targets, scores them against the live store, checks where you
          rank and tells you what to fix first. You get a link to share.
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
                <SelectItem value={ALL_MARKETS}>
                  <span className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" />
                    All markets
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
                placeholder="App name, or paste a store link..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  const parsed = parseStoreUrl(e.target.value.trim());
                  // A link names its storefront; a single-market pick
                  // follows it, "all markets" just starts there.
                  if (parsed?.country && country !== ALL_MARKETS) {
                    setCountry(parsed.country);
                  }
                }}
                className="h-11"
              />
              {(suggestions.length > 0 || searching) && (
                <div className="absolute inset-x-0 top-12 z-40 rounded-lg border bg-background text-left shadow-lg">
                  {searching && suggestions.length === 0 && (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching both stores...
                    </div>
                  )}
                  {suggestions.map((s) => (
                    <button
                      key={`${s.store}:${s.appId}`}
                      type="button"
                      className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-muted/60"
                      onClick={() =>
                        run({
                          country:
                            country === ALL_MARKETS
                              ? TYPEAHEAD_COUNTRY
                              : country,
                          id: s.appId,
                          store: s.store,
                        })
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
            One check-up covers all {KEYWORD_COUNTRIES.length} storefronts
            (a few minutes, you can stop early) or the single market you
            pick.
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
          keep the finished report so your link keeps working, and the scores
          to improve keyword data for everyone.
        </p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Opening the shared report...
      </div>
    );
  }

  // Report shell: renders as soon as a listing is read and fills in live.
  if (!shown) {
    return (
      <>
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {progress ? `Reading your listing in ${countryLabel(progress.country)}...` : "Reading your listing..."}
        </div>
        {isRunning && (
          <ProgressOverlay
            label={progress?.label ?? "Reading your listing"}
            onStop={mode === "all" ? () => (cancelled.current = true) : undefined}
            percent={percent}
            progress={progress}
          />
        )}
      </>
    );
  }

  const app = shown.app;
  const audit = shown.audit;
  const storeName = store === "appstore" ? "App Store" : "Google Play";
  const checkedCount = markets.length + missing.length;
  const averageScore = markets.length
    ? Math.round(
        markets.reduce((sum, m) => sum + m.audit.asoScore, 0) / markets.length,
      )
    : null;
  const bestMarket = markets.length
    ? markets.reduce((a, b) => (b.audit.asoScore > a.audit.asoScore ? b : a))
    : null;
  const weakestMarket = markets.length
    ? markets.reduce((a, b) => (b.audit.asoScore < a.audit.asoScore ? b : a))
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 py-10 pb-28">
      {isRunning && (
        <ProgressOverlay
          label={progress?.label ?? "Working"}
          onStop={mode === "all" ? () => (cancelled.current = true) : undefined}
          percent={percent}
          progress={progress}
        />
      )}

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
            {mode === "all"
              ? `${markets.length} market${markets.length === 1 ? "" : "s"}`
              : countryLabel(shown.country)}{" "}
            · {storeName}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {shareId && (
            <Button variant="outline" onClick={copyLink}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          )}
          {!isRunning && (
            <>
              {markets.length > 0 && (
                <Button asChild>
                  <Link href={importSignupUrl(app, store)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add this app to AppBoard
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={reset}>
                Check another app
              </Button>
            </>
          )}
        </div>
      </div>

      {(sharedAt || partial) && !isRunning && (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {sharedAt && (
            <>
              Shared report, checked on{" "}
              {new Date(sharedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Scores and ranks reflect the store on that day.{" "}
            </>
          )}
          {partial && (
            <>
              The check was stopped early, so only{" "}
              {checkedCount} of {KEYWORD_COUNTRIES.length} storefronts were
              looked at.
            </>
          )}
        </p>
      )}

      {mode === "all" && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">
            Your listing across markets
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {markets.length > 0 && averageScore !== null ? (
              <>
                Listed in {markets.length} of {checkedCount} storefront
                {checkedCount === 1 ? "" : "s"} checked · average score{" "}
                {averageScore}
                {bestMarket && weakestMarket && bestMarket !== weakestMarket
                  ? ` · best ${countryLabel(bestMarket.country)} (${bestMarket.audit.asoScore}), weakest ${countryLabel(weakestMarket.country)} (${weakestMarket.audit.asoScore})`
                  : ""}
                . Click a market to see its report.
              </>
            ) : (
              "Each storefront gets its own score and keyword ranks."
            )}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>ASO score</TableHead>
                  <TableHead>Ranking keywords</TableHead>
                  <TableHead>First page</TableHead>
                  <TableHead>Best opportunity</TableHead>
                  <TableHead>Blocking issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {markets.map((m) => {
                  const stats = marketStats(m);
                  const isActive = shown.country === m.country && !shown.pending;
                  return (
                    <TableRow
                      key={m.country}
                      className={`cursor-pointer ${isActive ? "bg-muted/50" : ""}`}
                      onClick={() => {
                        setActiveCountry(m.country);
                        setExpanded(null);
                      }}
                      aria-selected={isActive}
                    >
                      <TableCell className="font-medium">
                        {countryLabel(m.country)}
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-block rounded-full border-4 px-2 py-0.5 font-semibold tabular-nums"
                          style={{ borderColor: scoreColor(m.audit.asoScore) }}
                        >
                          {m.audit.asoScore}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {stats.ranked} of {m.scores.length}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {stats.firstPage}
                      </TableCell>
                      <TableCell>
                        {stats.top ? (
                          <>
                            <span className="font-medium">{stats.top.keyword}</span>{" "}
                            <span className="text-xs text-muted-foreground">
                              {stats.top.opportunity}
                            </span>
                          </>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {stats.highIssues}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {live && !markets.some((m) => m.country === live.country) && (
                  <TableRow className="text-muted-foreground">
                    <TableCell className="font-medium">
                      {countryLabel(live.country)}
                    </TableCell>
                    <TableCell colSpan={5}>
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Scoring {live.scores.length} keyword
                      {live.scores.length === 1 ? "" : "s"} so far...
                    </TableCell>
                  </TableRow>
                )}
                {isRunning && !live && (
                  <TableRow className="text-muted-foreground">
                    <TableCell colSpan={6}>
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      {progress
                        ? `Looking for the app in ${countryLabel(progress.country)}...`
                        : "Working..."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {missing.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Not listed (or nothing to score) in:{" "}
              {missing.map((cc) => countryLabel(cc)).join(", ")}.
            </p>
          )}
        </section>
      )}

      {mode === "all" && (
        <h2 className="text-lg font-semibold">
          {countryLabel(shown.country)} in detail
          {shown.pending && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              scoring live...
            </span>
          )}
        </h2>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-6 pt-6">
            {audit ? (
              <div
                className="grid h-24 w-24 flex-none place-items-center rounded-full border-8 text-3xl font-bold"
                style={{ borderColor: scoreColor(audit.asoScore) }}
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
              <p className="font-semibold">
                Your ASO score
                {mode === "all" ? ` in ${countryLabel(shown.country)}` : ""}
              </p>
              {audit ? (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {audit.strengths.slice(0, 2).map((s) => (
                    <li key={s}>+ {s}</li>
                  ))}
                  <li>
                    {audit.issues.length} issue
                    {audit.issues.length === 1 ? "" : "s"} found below
                  </li>
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Calculating while keywords are scored...
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
              what searchers in {countryLabel(shown.country)} see
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

      {shown.nextSteps.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Do this next</h2>
          <div className="space-y-3">
            {shown.nextSteps.map((step, i) => (
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
          {shown.pending && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              scoring live...
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
              {shown.scores.map((score) => {
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
              {shown.pending && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-4 text-center text-sm text-muted-foreground"
                  >
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    {progress?.label ?? "Scoring"}...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!isRunning && (
          <p className="mt-2 text-xs text-muted-foreground">
            Want more? The full AppBoard generates AI keyword ideas in every
            language you ship and re-checks your ranks nightly with trends -{" "}
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
            {mode === "all" ? ` in ${countryLabel(shown.country)}` : ""}
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

      {shareId && !isRunning && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Share this report</CardTitle>
            <CardDescription>
              Anyone with the link sees exactly this report, no account
              needed. It stays available for a year.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-60 flex-1 font-mono text-xs"
              aria-label="Share link"
            />
            <Button variant="outline" onClick={copyLink}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isRunning && markets.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-4 pt-6">
            <Sparkles className="h-8 w-8 flex-none text-primary" />
            <div className="min-w-60 flex-1">
              <p className="font-semibold">Want the full picture - free?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A free AppBoard account adds AI keyword ideas in every
                language you ship, review analysis, competitor teardowns and
                nightly rank tracking with trends.
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
