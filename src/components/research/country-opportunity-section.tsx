"use client";

import { Globe, Loader2, Square, Trophy } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCountryOpportunity } from "@/hooks/use-keyword-research";
import {
  CLASSIFICATION_META,
  countryLabel,
  difficultyMeta,
  formatDownloadRange,
  KEYWORD_COUNTRIES,
} from "@/lib/keyword-research";

const DEFAULT_SELECTED = ["us", "gb", "ca", "au", "de", "fr", "pl"];

interface CountryOpportunitySectionProps {
  appstoreId?: string;
}

export function CountryOpportunitySection({
  appstoreId,
}: CountryOpportunitySectionProps) {
  const finder = useCountryOpportunity();
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(DEFAULT_SELECTED),
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const trimmed = keyword.trim().toLowerCase();
  const allSelected = selected.size === KEYWORD_COUNTRIES.length;

  function toggleCountry(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      allSelected ? new Set() : new Set(KEYWORD_COUNTRIES.map((c) => c.code)),
    );
  }

  async function run() {
    if (!trimmed || selected.size === 0) return;
    setExpanded(null);
    await finder.run(
      trimmed,
      KEYWORD_COUNTRIES.filter((c) => selected.has(c.code)).map(
        (c) => c.code,
      ),
      appstoreId,
    );
  }

  const withRank = Boolean(appstoreId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Country Opportunity Finder</CardTitle>
          <CardDescription>
            Scan up to {KEYWORD_COUNTRIES.length} App Store regions for one
            keyword and see where the ranking opportunity is best.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="e.g. habit tracker"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="max-w-sm"
            />
            {finder.running ? (
              <Button variant="outline" onClick={finder.cancel}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button onClick={run} disabled={!trimmed || selected.size === 0}>
                <Globe className="mr-2 h-4 w-4" />
                Scan {selected.size}{" "}
                {selected.size === 1 ? "country" : "countries"}
              </Button>
            )}
            {finder.progress && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {finder.progress.done + 1}/{finder.progress.total} -{" "}
                {countryLabel(finder.progress.current)}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              Select all
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
              {KEYWORD_COUNTRIES.map((c) => (
                <label
                  key={c.code}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Checkbox
                    checked={selected.has(c.code)}
                    onCheckedChange={() => toggleCountry(c.code)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {finder.results.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Popularity</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Targeting</TableHead>
                <TableHead>Downloads at #1</TableHead>
                {withRank && <TableHead>Your rank</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {finder.results.map((result, index) => {
                const { score } = result;
                const isOpen = expanded === result.country;
                const classification =
                  CLASSIFICATION_META[score.classification];
                const diff = difficultyMeta(score.difficultyLabel);
                const top1 = score.downloads.positions[0];
                const colSpan = withRank ? 8 : 7;
                return (
                  <Fragment key={result.country}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setExpanded(isOpen ? null : result.country)
                      }
                    >
                      <TableCell>
                        {index === 0 ? (
                          <Trophy className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <span className="text-muted-foreground">
                            {index + 1}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {countryLabel(result.country)}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {score.opportunity}
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
    </div>
  );
}
