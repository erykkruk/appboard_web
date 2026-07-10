"use client";

import { Loader2, Search } from "lucide-react";
import Link from "next/link";

import { DeltaBadge } from "@/components/tracking/delta-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { useTrackingSummary } from "@/hooks/use-tracking";
import { formatKeywordPosition } from "@/lib/research";

const TOP_KEYWORDS_LIMIT = 6;

const POSITION_TONE_CLASSES: Record<string, string> = {
  default: "",
  medium: "text-amber-500",
  muted: "text-muted-foreground",
  strong: "text-emerald-500 font-semibold",
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-lg font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Dashboard card with keyword rank stats. The backend call behind it also
 * auto-imports keywords from the app's ASO profile and runs a first rank
 * check, so brand-new apps show data without any manual setup.
 */
export function KeywordRankingsCard({ appId }: { appId: string }) {
  const summary = useTrackingSummary(appId);

  // Feature disabled (403) or request failed — keep the dashboard clean.
  if (summary.isError) return null;

  const stats = summary.data?.stats;
  const positions = summary.data?.positions ?? [];
  const topPositions = [...positions]
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity))
    .slice(0, TOP_KEYWORDS_LIMIT);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Search className="h-4 w-4" />
          Keyword Rankings
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
          <Link href={`/apps/${appId}/research?tab=keywords`}>View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking store positions for your keywords…
          </div>
        ) : !stats || stats.trackedKeywords === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No keywords tracked yet. Add keywords in the Information tab or in
            Research → Keywords &amp; Rankings.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Tracked" value={String(stats.trackedKeywords)} />
              <StatTile
                label="Avg position"
                value={stats.avgPosition !== null ? `#${stats.avgPosition}` : "—"}
              />
              <StatTile label="In top 10" value={String(stats.top10Count)} />
              <StatTile
                label="Improving / declining"
                value={`${stats.improvedCount} / ${stats.declinedCount}`}
              />
            </div>

            {topPositions.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="w-16 uppercase">Country</TableHead>
                    <TableHead className="w-24 text-right">Position</TableHead>
                    <TableHead className="w-16 text-right">Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPositions.map((p) => {
                    const formatted = formatKeywordPosition(p.position);
                    return (
                      <TableRow key={`${p.country}|${p.keyword}`}>
                        <TableCell className="font-medium">{p.keyword}</TableCell>
                        <TableCell className="uppercase text-muted-foreground">
                          {p.country}
                        </TableCell>
                        <TableCell
                          className={`text-right ${POSITION_TONE_CLASSES[formatted.tone] ?? ""}`}
                        >
                          {formatted.label}
                        </TableCell>
                        <TableCell className="text-right">
                          <DeltaBadge delta={p.delta} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {stats.lastCheckedAt && (
              <p className="text-xs text-muted-foreground">
                Last checked {new Date(stats.lastCheckedAt).toLocaleString()}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
