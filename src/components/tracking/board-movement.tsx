"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BoardMove } from "@/lib/types";

/**
 * Entering and leaving the scan are worded, not subtracted: we never measured
 * the position a term held while it was outside the top 50, so "moved up 12"
 * would be a number nobody observed.
 */
function describe(move: BoardMove): { text: string; tone: string } {
  switch (move.kind) {
    case "entered":
      return {
        text: `entered at #${move.to}`,
        tone: "text-green-600 dark:text-green-500",
      };
    case "dropped":
      return {
        text: `fell out of the scan (was #${move.from})`,
        tone: "text-red-600 dark:text-red-500",
      };
    case "new":
      return { text: `first measurement: #${move.to}`, tone: "" };
    default: {
      const diff = (move.from ?? 0) - (move.to ?? 0);
      return {
        text:
          diff > 0
            ? `up ${diff} to #${move.to}`
            : `down ${Math.abs(diff)} to #${move.to}`,
        tone:
          diff > 0
            ? "text-green-600 dark:text-green-500"
            : "text-red-600 dark:text-red-500",
      };
    }
  }
}

export function BoardMovement({ movement }: { movement: BoardMove[] }) {
  if (!movement.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing moved between the last two checks.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Keyword</TableHead>
            <TableHead>What happened</TableHead>
            <TableHead>Difficulty change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movement.map((move) => {
            const described = describe(move);
            return (
              <TableRow key={`${move.country}-${move.keyword}`}>
                <TableCell className="font-medium">{move.keyword}</TableCell>
                <TableCell className={described.tone}>
                  {described.text}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {move.difficultyDelta === null || move.difficultyDelta === 0
                    ? "-"
                    : `${move.difficultyDelta > 0 ? "+" : ""}${move.difficultyDelta}`}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
