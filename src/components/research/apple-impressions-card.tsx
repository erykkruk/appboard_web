"use client";

import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAppleAdsStatus,
  useAppleImpressions,
  useSyncAppleImpressions,
} from "@/hooks/use-apple-ads";

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

/**
 * Impression share from the Apple Ads insights API: for search terms where
 * the app&apos;s own ads served, the share of all impressions it captured.
 * Rendered only when Apple Ads is connected; zero rows is normal (Apple
 * suppresses terms with few impressions).
 */
export function AppleImpressionsCard({ appId }: { appId: string }) {
  const status = useAppleAdsStatus();
  const impressions = useAppleImpressions(
    status.data?.connected ? appId : null,
  );
  const sync = useSyncAppleImpressions();

  if (!status.data?.connected) return null;
  const rows = impressions.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          Impression share (Apple Ads)
          <Button
            variant="outline"
            size="sm"
            onClick={() => sync.mutate(appId)}
            disabled={sync.isPending}
          >
            {sync.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync
          </Button>
        </CardTitle>
        <CardDescription>
          Terms where this app&apos;s ads served in the last 4 weeks, with the
          share of all impressions captured. Apple omits low-volume terms, so
          an empty list is normal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No impression-share rows stored yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Share</TableHead>
                <TableHead>Rank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.searchTerm}
                  </TableCell>
                  <TableCell>{row.country.toUpperCase()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.week}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {percent(row.lowShare)} - {percent(row.highShare)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.rank ? `#${row.rank}` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
