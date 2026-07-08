"use client";

import { Loader2 } from "lucide-react";

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
import { useResearchMarkets } from "@/hooks/use-research";
import { RESEARCH_COUNTRIES } from "@/lib/research";
import type { ResearchAppMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

const LOW_RATING_THRESHOLD = 3.6;

export function ReportMarketsCard({ meta }: { meta: ResearchAppMeta }) {
  const markets = useResearchMarkets();
  const snapshots = markets.data;
  const isPlay = meta.store === "playstore";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market comparison</CardTitle>
        <CardDescription>
          Rating and review sentiment of the same app across markets
          {isPlay ? " + share of reviews with a developer reply" : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!snapshots && (
          <Button
            variant="secondary"
            onClick={() => markets.mutate({ id: meta.id, store: meta.store })}
            disabled={markets.isPending}
          >
            {markets.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {markets.isPending
              ? "Fetching…"
              : `Compare markets (${RESEARCH_COUNTRIES.map((c) => c.toUpperCase()).join("/")})`}
          </Button>
        )}
        {snapshots && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Market</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Ratings count</TableHead>
                <TableHead>% negative (sample)</TableHead>
                {isPlay && <TableHead>% with dev reply</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => (
                <TableRow key={snapshot.country}>
                  <TableCell className="font-medium">
                    {snapshot.country.toUpperCase()}
                  </TableCell>
                  {snapshot.error ? (
                    <TableCell
                      colSpan={isPlay ? 4 : 3}
                      className="text-muted-foreground"
                    >
                      not available in this market
                    </TableCell>
                  ) : (
                    <>
                      <TableCell
                        className={cn(
                          snapshot.rating !== undefined &&
                            snapshot.rating < LOW_RATING_THRESHOLD &&
                            "font-semibold text-red-600",
                        )}
                      >
                        {snapshot.rating?.toFixed(2) ?? "?"}
                      </TableCell>
                      <TableCell>
                        {snapshot.ratingsCount?.toLocaleString("en-US") ?? "?"}
                      </TableCell>
                      <TableCell>
                        {snapshot.negativeShare !== undefined
                          ? `${(snapshot.negativeShare * 100).toFixed(0)}%`
                          : "—"}
                      </TableCell>
                      {isPlay && (
                        <TableCell>
                          {snapshot.devReplyRate !== undefined
                            ? `${(snapshot.devReplyRate * 100).toFixed(0)}%`
                            : "—"}
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
