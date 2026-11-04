"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { RatingBar, StarRating } from "@/components/reviews/stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  countryName,
  countryRatingRows,
  formatAverage,
  storeLabel,
  storeSummaryLine,
} from "@/lib/ratings";
import type { RatingHistogram, RatingsSummary } from "@/lib/types";

/** Countries shown before "Show all". */
const COUNTRY_ROWS_COLLAPSED = 8;
const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

function histogramTotal(histogram: RatingHistogram): number {
  return STAR_LEVELS.reduce((sum, s) => sum + histogram[String(s) as keyof RatingHistogram], 0);
}

export function RatingOverview({
  summary,
  onRefresh,
  isRefreshPending,
}: {
  summary: RatingsSummary;
  onRefresh: () => void;
  isRefreshPending: boolean;
}) {
  const [showAllCountries, setShowAllCountries] = useState(false);
  const rows = countryRatingRows(summary);
  const visibleRows = showAllCountries
    ? rows
    : rows.slice(0, COUNTRY_ROWS_COLLAPSED);
  const refreshing = summary.refreshing || isRefreshPending;
  const hasRatings = summary.total.ratingCount > 0;
  // Only Google Play publishes the star split; the App Store does not.
  const histogramStore = summary.stores.find((s) => s.histogram !== null);
  const showStoreColumn = summary.stores.length > 1;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Rating Overview</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh store ratings"
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasRatings ? (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-bold tabular-nums">
                  {formatAverage(summary.total.average)}
                </p>
                <StarRating rating={Math.round(summary.total.average ?? 0)} size={16} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.total.ratingCount.toLocaleString("en-US")} ratings
                  <br />
                  {summary.total.writtenReviews.toLocaleString("en-US")} with text
                </p>
              </div>
              {histogramStore?.histogram && (
                <div className="flex-1 space-y-1.5">
                  {STAR_LEVELS.map((s) => (
                    <RatingBar
                      key={s}
                      stars={s}
                      count={histogramStore.histogram![String(s) as keyof RatingHistogram]}
                      total={histogramTotal(histogramStore.histogram!)}
                    />
                  ))}
                  <p className="text-right text-xs text-muted-foreground">
                    {storeLabel(histogramStore.storeType)} stars
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {refreshing
                ? "Fetching the store ratings of every country. This takes a few minutes."
                : "No store ratings yet."}
            </p>
          )}

          <ul className="space-y-1.5">
            {summary.stores.map((store) => (
              <li
                key={store.storeType}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>{storeSummaryLine(store)}</span>
                {store.syncedReviews > 0 &&
                  store.syncedReviews !== store.writtenReviews && (
                    <span className="text-xs text-muted-foreground">
                      {store.syncedReviews} in AppBoard
                    </span>
                  )}
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            Counts every star rating, also the ones without text, summed over
            all countries.
            {summary.group &&
              ` Group ${summary.group.name}: ${summary.apps.length} apps.`}
            {summary.fetchedAt &&
              ` Updated ${new Date(summary.fetchedAt).toLocaleString()}.`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ratings by country</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No country has ratings yet.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    {showStoreColumn && <TableHead>Store</TableHead>}
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-right">Ratings</TableHead>
                    <TableHead className="text-right">Reviews</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow key={`${row.storeType}-${row.country}`}>
                      <TableCell>{countryName(row.country)}</TableCell>
                      {showStoreColumn && (
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {storeLabel(row.storeType)}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right tabular-nums">
                        {formatAverage(row.average)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.ratingCount.toLocaleString("en-US")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.writtenReviews.toLocaleString("en-US")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > COUNTRY_ROWS_COLLAPSED && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAllCountries((v) => !v)}
                >
                  {showAllCountries ? "Show fewer" : `Show all ${rows.length}`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
