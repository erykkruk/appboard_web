"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BulkCopyResult } from "@/lib/types";

import { BULK_PART_LABELS } from "./bulk-parts";

type ResultStatus = BulkCopyResult["results"][number]["status"];

const STATUS_LABELS: Record<ResultStatus, string> = {
  error: "Error",
  ok: "Applied",
  skipped: "Skipped",
};

const STATUS_VARIANTS: Record<ResultStatus, "default" | "destructive" | "secondary"> = {
  error: "destructive",
  ok: "default",
  skipped: "secondary",
};

interface BulkResultsTableProps {
  result: BulkCopyResult;
}

export function BulkResultsTable({ result }: BulkResultsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>App</TableHead>
            <TableHead className="w-[140px]">Part</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead className="w-[90px] text-right">Changed</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.results.map((row, index) => (
            <TableRow key={`${row.appId}-${row.part}-${index}`}>
              <TableCell className="font-medium">{row.appName}</TableCell>
              <TableCell>{BULK_PART_LABELS[row.part]}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[row.status]}>
                  {STATUS_LABELS[row.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.changed}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.message ?? "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
