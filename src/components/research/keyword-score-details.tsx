"use client";

import { ExternalLink, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BREAKDOWN_ROWS,
  CLASSIFICATION_META,
  difficultyMeta,
  formatCount,
  formatDownloadRange,
  OVERRIDE_REASON_LABELS,
} from "@/lib/keyword-research";
import type { KeywordRankingTier, KeywordScore } from "@/lib/types";

const DOWNLOAD_POSITIONS_SHOWN = 10;

function TierCard({ name, tier }: { name: string; tier: KeywordRankingTier }) {
  const meta = difficultyMeta(tier.label);
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{name}</p>
        <span className={`text-sm font-semibold ${meta.className}`}>
          {meta.label} ({tier.tierScore})
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
        <li>
          Weakest app: {formatCount(tier.minReviews)} reviews
          {tier.weakestApp ? ` (${tier.weakestApp})` : ""}
        </li>
        <li>Median reviews: {formatCount(tier.medianReviews)}</li>
        <li>
          {tier.weakCount} of {tier.totalApps} apps under 1K reviews
        </li>
        {tier.freshCount > 0 && (
          <li>
            {tier.freshCount} app{tier.freshCount === 1 ? "" : "s"} broke in
            within the last year
          </li>
        )}
        <li>
          {tier.titleKeywordCount} of {tier.totalApps} apps use this keyword in
          their title
        </li>
      </ul>
    </div>
  );
}

export function KeywordScoreDetails({ score }: { score: KeywordScore }) {
  const classification = CLASSIFICATION_META[score.classification];
  const overrideNote = score.breakdown.overrideReason
    ? OVERRIDE_REASON_LABELS[score.breakdown.overrideReason]
    : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {classification.description}
      </p>
      {overrideNote && (
        <p className="text-sm text-muted-foreground">
          {overrideNote} (raw score: {score.breakdown.rawTotal})
        </p>
      )}
      {score.breakdown.isBrandKeyword && (
        <p className="text-sm text-muted-foreground">
          Brand keyword - matches publisher{" "}
          {score.breakdown.brandName ?? "of the #1 app"}. Difficulty reflects
          the full competitive landscape.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Difficulty breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {BREAKDOWN_ROWS.map((row) => {
              const value = score.breakdown[row.key];
              return (
                <div key={row.key} className="flex items-center gap-2 text-xs">
                  <span className="w-44 shrink-0 text-muted-foreground">
                    {row.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary/70"
                      style={{ width: `${Math.min(100, value)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums">
                    {Math.round(value)}
                  </span>
                  <span className="w-9 text-right text-muted-foreground">
                    {row.weight}
                  </span>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">
              Median reviews: {formatCount(score.breakdown.medianReviews)} ·
              Title matches: {score.breakdown.titleMatchCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Estimated daily downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">
              ~{formatCount(Math.round(score.downloads.dailySearches))}{" "}
              searches/day · ranges assume a 5-20% install conversion
            </p>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded border p-2">
                <p className="text-muted-foreground">Top 5</p>
                <p className="font-medium">
                  {formatDownloadRange(
                    score.downloads.tiers.top5.low,
                    score.downloads.tiers.top5.high,
                  )}
                </p>
              </div>
              <div className="rounded border p-2">
                <p className="text-muted-foreground">Top 6-10</p>
                <p className="font-medium">
                  {formatDownloadRange(
                    score.downloads.tiers.top6to10.low,
                    score.downloads.tiers.top6to10.high,
                  )}
                </p>
              </div>
              <div className="rounded border p-2">
                <p className="text-muted-foreground">Top 11-20</p>
                <p className="font-medium">
                  {formatDownloadRange(
                    score.downloads.tiers.top11to20.low,
                    score.downloads.tiers.top11to20.high,
                  )}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {score.downloads.positions
                .slice(0, DOWNLOAD_POSITIONS_SHOWN)
                .map((pos) => (
                  <div
                    key={pos.position}
                    className="flex justify-between border-b border-dashed py-0.5 last:border-0"
                  >
                    <span className="text-muted-foreground">
                      #{pos.position} ({pos.ttr}% tap)
                    </span>
                    <span className="tabular-nums">
                      {formatDownloadRange(pos.low, pos.high)}/day
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Ranking tiers</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <TierCard name="Top 5" tier={score.tiers.top5} />
          <TierCard name="Top 10" tier={score.tiers.top10} />
          <TierCard name="Top 20" tier={score.tiers.top20} />
        </div>
      </div>

      {score.competitors.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">
            Top apps ranking for this keyword
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {score.competitors.map((competitor, index) => (
                  <TableRow key={competitor.trackId}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {competitor.icon && (
                          <img
                            src={competitor.icon}
                            alt=""
                            className="h-7 w-7 rounded-md"
                          />
                        )}
                        <div>
                          <p className="max-w-64 truncate text-sm font-medium">
                            {competitor.title}
                          </p>
                          <p className="max-w-64 truncate text-xs text-muted-foreground">
                            {competitor.developer}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {competitor.rating ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                          {competitor.rating.toFixed(1)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCount(competitor.ratingsCount)}
                      {(competitor.ratingsCount ?? 0) < 1_000 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          beatable
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {competitor.genre ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {competitor.released
                        ? new Date(competitor.released).getFullYear()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {competitor.url && (
                        <a
                          href={competitor.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
