"use client";

import {
  ChevronDown,
  ChevronRight,
  Download,
  History,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { Fragment, useState } from "react";

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
import { Label } from "@/components/ui/label";
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
import {
  useKeywordHistory,
  useKeywordScores,
} from "@/hooks/use-keyword-research";
import {
  CLASSIFICATION_META,
  countryLabel,
  difficultyMeta,
  downloadCsv,
  formatDownloadRange,
  KEYWORD_COUNTRIES,
  keywordScoresToCsv,
  MAX_KEYWORDS_PER_SCORING,
  parseKeywordInput,
} from "@/lib/keyword-research";
import type { KeywordScore } from "@/lib/types";

interface KeywordScoresSectionProps {
  /** App Store track id of the current app - adds a Rank column. */
  appstoreId?: string;
  /** Hide the built-in history list (per-app page shows its own tools). */
  defaultCountry?: string;
}

export function KeywordScoresSection({
  appstoreId,
  defaultCountry = "us",
}: KeywordScoresSectionProps) {
  const scoring = useKeywordScores();
  const history = useKeywordHistory();

  const [input, setInput] = useState("");
  const [country, setCountry] = useState(defaultCountry);
  const [scores, setScores] = useState<KeywordScore[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const keywords = parseKeywordInput(input);
  const withRank = Boolean(appstoreId);

  async function run() {
    if (keywords.length === 0) return;
    setExpanded(null);
    const result = await scoring.mutateAsync({
      country,
      keywords,
      ...(appstoreId ? { appstoreId } : {}),
    });
    setScores(result);
    history.add({ country, keywords, scores: result });
  }

  function loadFromHistory(id: string) {
    const entry = history.entries.find((e) => e.id === id);
    if (!entry) return;
    setScores(entry.scores);
    setCountry(entry.country);
    setInput(entry.keywords.join(", "));
    setExpanded(null);
  }

  function exportCsv() {
    downloadCsv(
      `keyword-scores-${country}-${new Date().toISOString().slice(0, 10)}.csv`,
      keywordScoresToCsv(scores),
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Keyword scores</CardTitle>
          <CardDescription>
            Popularity, competition difficulty, opportunity and download
            estimates for up to {MAX_KEYWORDS_PER_SCORING} App Store keywords
            at once (comma or newline separated).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="fitness tracker, habit tracker, calorie counter"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-48">
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
            </div>
            <Button
              onClick={run}
              disabled={keywords.length === 0 || scoring.isPending}
            >
              {scoring.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Score {keywords.length > 0 ? `${keywords.length} ` : ""}keyword
              {keywords.length === 1 ? "" : "s"}
            </Button>
            {scores.length > 0 && (
              <Button variant="outline" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {scores.length > 0 && (
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
                <TableHead>Downloads at #1</TableHead>
                {withRank && <TableHead>Your rank</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((score) => {
                const isOpen = expanded === score.keyword;
                const classification =
                  CLASSIFICATION_META[score.classification];
                const diff = difficultyMeta(score.difficultyLabel);
                const top1 = score.downloads.positions[0];
                const colSpan = withRank ? 8 : 7;
                if (score.error) {
                  return (
                    <TableRow key={score.keyword}>
                      <TableCell />
                      <TableCell className="font-medium">
                        {score.keyword}
                      </TableCell>
                      <TableCell
                        colSpan={colSpan - 2}
                        className="text-sm text-muted-foreground"
                      >
                        Failed to score: {score.error}
                      </TableCell>
                    </TableRow>
                  );
                }
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
                        <Badge
                          variant="outline"
                          className={classification.className}
                        >
                          {classification.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {top1
                          ? `${formatDownloadRange(top1.low, top1.high)}/day`
                          : "-"}
                      </TableCell>
                      {withRank && (
                        <TableCell className="tabular-nums">
                          {score.appRank ? `#${score.appRank}` : "-"}
                        </TableCell>
                      )}
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={colSpan} className="bg-muted/30">
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

      {history.entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4" />
              Recent searches
            </CardTitle>
            <CardDescription>
              Stored in this browser only. Click to reload results.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {history.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <button
                  type="button"
                  onClick={() => loadFromHistory(entry.id)}
                  className="flex-1 truncate text-left text-sm"
                >
                  <span className="font-medium">
                    {entry.keywords.join(", ")}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {countryLabel(entry.country)} ·{" "}
                    {new Date(entry.date).toLocaleString()}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => history.remove(entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
