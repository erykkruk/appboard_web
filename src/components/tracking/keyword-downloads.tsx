"use client";

import { ArrowDown, ArrowUpDown } from "lucide-react";

import type { KeywordDownloadsCell } from "@/lib/keyword-downloads";
import { keywordDownloadsSummary } from "@/lib/keyword-downloads";
import type { KeywordDownloadsReport } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One "Downloads" cell: real Play installs, an App Store estimate (muted) or a dash. */
export function KeywordDownloadsValue({ cell }: { cell: KeywordDownloadsCell | undefined }) {
  if (!cell) return <span className="text-muted-foreground">-</span>;
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        cell.kind !== "real" && "text-muted-foreground",
      )}
      title={cell.title}
    >
      {cell.label}
    </span>
  );
}

/** The market total above the table, with its source. */
export function KeywordDownloadsNote({ report }: { report: KeywordDownloadsReport | undefined }) {
  const text = report ? keywordDownloadsSummary(report) : null;
  if (!text) return null;
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

/** Header button that sorts the table by downloads (most first) and back. */
export function KeywordDownloadsSortHeader({
  active,
  onToggle,
  title,
}: {
  active: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      aria-pressed={active}
      className="inline-flex flex-row-reverse items-center gap-1 hover:text-foreground"
      onClick={onToggle}
      title={title}
      type="button"
    >
      Downloads
      {active ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
