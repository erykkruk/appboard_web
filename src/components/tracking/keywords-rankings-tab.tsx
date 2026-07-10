"use client";

import { Loader2, Plus, RefreshCw, X } from "lucide-react";
import { useMemo, useState } from "react";

import { DeltaBadge } from "@/components/tracking/delta-badge";
import { RankChart } from "@/components/tracking/rank-chart";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAddKeywords,
  useRankHistory,
  useRemoveKeyword,
  useRunRankCheck,
  useTracking,
} from "@/hooks/use-tracking";
import { formatKeywordPosition, RESEARCH_COUNTRIES } from "@/lib/research";
import { MAX_TRACKED_KEYWORDS_PER_LANGUAGE } from "@/lib/types";

export function KeywordsRankingsTab({ appId }: { appId: string }) {
  const tracking = useTracking(appId);
  const addKeywords = useAddKeywords(appId);
  const removeKeyword = useRemoveKeyword(appId);
  const rankCheck = useRunRankCheck(appId);

  const [country, setCountry] = useState("us");
  const [input, setInput] = useState("");
  const [chartCountry, setChartCountry] = useState("us");

  const keywords = useMemo(
    () => tracking.data?.keywords ?? [],
    [tracking.data?.keywords],
  );
  const positions = tracking.data?.positions ?? [];

  const countriesUsed = useMemo(
    () => [...new Set(keywords.map((k) => k.country))].sort(),
    [keywords],
  );

  // Effective chart filter: keep the user's choice if it still has keywords,
  // otherwise fall back to the first available market (derived, not stateful).
  const effectiveChartCountry = countriesUsed.includes(chartCountry)
    ? chartCountry
    : (countriesUsed[0] ?? "us");

  const history = useRankHistory(appId, { country: effectiveChartCountry });

  const perCountryCount = keywords.filter((k) => k.country === country).length;

  function submitKeywords() {
    const parsed = [
      ...new Set(
        input
          .split(/[,\n]/)
          .map((k) => k.trim())
          .filter(Boolean),
      ),
    ];
    if (!parsed.length) return;
    addKeywords.mutate(
      { country, keywords: parsed },
      { onSuccess: () => setInput("") },
    );
  }

  if (tracking.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Add keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Tracked keywords</CardTitle>
          <CardDescription>
            Track up to {MAX_TRACKED_KEYWORDS_PER_LANGUAGE} keywords per market.
            Positions are measured daily at 00:00 and 12:00 (and whenever you hit
            “Check now”).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Market</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESEARCH_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1" style={{ minWidth: 240 }}>
              <Label>
                Keywords ({perCountryCount}/{MAX_TRACKED_KEYWORDS_PER_LANGUAGE})
              </Label>
              <Input
                placeholder="habit tracker, todo list, planner"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitKeywords();
                }}
              />
            </div>
            <Button
              onClick={submitKeywords}
              disabled={addKeywords.isPending || !input.trim()}
            >
              {addKeywords.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>

          {countriesUsed.map((c) => (
            <div key={c} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {c.toUpperCase()}
              </p>
              <div className="flex flex-wrap gap-2">
                {keywords
                  .filter((k) => k.country === c)
                  .map((k) => (
                    <Badge
                      key={k.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {k.keyword}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                        onClick={() => removeKeyword.mutate(k.id)}
                        aria-label={`Remove ${k.keyword}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            </div>
          ))}
          {!keywords.length && (
            <p className="text-sm text-muted-foreground">
              No tracked keywords yet — add some above or use “Add” from a research
              report.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Current positions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Current positions</CardTitle>
            <CardDescription>
              {tracking.data?.config.lastRankCheckAt
                ? `Last checked ${new Date(tracking.data.config.lastRankCheckAt).toLocaleString()}`
                : "Not checked yet"}
            </CardDescription>
          </div>
          <Button
            variant="secondary"
            onClick={() => rankCheck.mutate()}
            disabled={rankCheck.isPending || !keywords.length}
          >
            {rankCheck.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check now
          </Button>
        </CardHeader>
        <CardContent>
          {positions.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => (
                  <TableRow key={`${p.country}-${p.keyword}`}>
                    <TableCell className="font-medium">{p.keyword}</TableCell>
                    <TableCell>{p.country.toUpperCase()}</TableCell>
                    <TableCell>{formatKeywordPosition(p.position).label}</TableCell>
                    <TableCell>
                      <DeltaBadge delta={p.delta} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run a check to record positions for your tracked keywords.
            </p>
          )}
        </CardContent>
      </Card>

      {/* History chart */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Ranking history</CardTitle>
            <CardDescription>
              Position over time. Amber markers show when you changed a listing.
            </CardDescription>
          </div>
          {countriesUsed.length > 1 && (
            <Select value={effectiveChartCountry} onValueChange={setChartCountry}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countriesUsed.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {history.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <RankChart
              annotations={history.data?.annotations ?? []}
              snapshots={history.data?.snapshots ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
