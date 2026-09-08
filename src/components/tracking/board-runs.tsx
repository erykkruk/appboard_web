"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BoardRun } from "@/lib/types";

/** Every measurement run, newest first: the shape of the history itself. */
export function BoardRuns({ runs }: { runs: BoardRun[] }) {
  if (!runs.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No measurement has run yet for this market.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Keywords measured</TableHead>
            <TableHead>Ranking</TableHead>
            <TableHead>In the top 10</TableHead>
            <TableHead>Average difficulty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.day}>
              <TableCell className="font-medium">{run.day}</TableCell>
              <TableCell className="tabular-nums">{run.measured}</TableCell>
              <TableCell className="tabular-nums">{run.ranked}</TableCell>
              <TableCell className="tabular-nums">{run.top10}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {run.avgDifficulty === null ? "-" : run.avgDifficulty}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
