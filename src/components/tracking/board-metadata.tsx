"use client";

import { Loader2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BoardGap } from "@/lib/types";

/**
 * The two halves of "our metadata says one thing, the store says another".
 * They are deliberately separate: a term we measured and do not rank for is a
 * problem, a term we never measured is only a candidate.
 */
export function BoardMetadata({
  gap,
  untracked,
  onTrack,
  tracking = false,
}: {
  gap: BoardGap[];
  untracked: string[];
  onTrack?: (keyword: string) => void;
  tracking?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          In your listing, but not ranking
        </h3>
        <p className="text-sm text-muted-foreground">
          You target these terms in the text the store indexes, and the store
          still does not show you for them.
        </p>
        {gap.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Where you use it</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Popularity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gap.map((row) => (
                  <TableRow key={row.keyword}>
                    <TableCell className="font-medium">{row.keyword}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.fields.join(", ")}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.difficulty ?? "-"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.popularity ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Every term your listing targets is ranking. Nothing to fix here.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">
          In your keyword field, never measured
        </h3>
        <p className="text-sm text-muted-foreground">
          These sit in your keyword field but nothing tracks them, so you have
          no idea whether they work.
        </p>
        {untracked.length ? (
          <div className="flex flex-wrap gap-2">
            {untracked.map((keyword) => (
              <Badge className="gap-1 pr-1" key={keyword} variant="secondary">
                {keyword}
                {onTrack ? (
                  <button
                    aria-label={`Track ${keyword}`}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    disabled={tracking}
                    onClick={() => onTrack(keyword)}
                    type="button"
                  >
                    {tracking ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </button>
                ) : null}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Everything in your keyword field is tracked.
          </p>
        )}
      </div>

      {untracked.length && onTrack ? (
        <Button
          disabled={tracking}
          onClick={() => untracked.forEach((keyword) => onTrack(keyword))}
          size="sm"
          variant="secondary"
        >
          Track all {untracked.length}
        </Button>
      ) : null}
    </div>
  );
}
