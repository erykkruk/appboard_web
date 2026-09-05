"use client";

import { Check, Loader2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CLASSIFICATION_META, difficultyMeta } from "@/lib/keyword-research";
import type { KeywordScore } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CLASSIFICATION_SENTENCE } from "@/lib/write-with-ai";

interface KeywordChipsProps {
  keywords: string[];
  onToggle: (keyword: string) => void;
  /** Keyed by lowercase keyword; absent while scoring or on Google Play. */
  scores: Record<string, KeywordScore>;
  scoring: boolean;
  selected: ReadonlySet<string>;
}

function ScoreLine({ score }: { score: KeywordScore }) {
  const difficulty = difficultyMeta(score.difficultyLabel);
  return (
    <span className="flex flex-wrap gap-x-3 text-muted-foreground text-xs">
      <span>
        Popularity{" "}
        <span className="font-medium text-foreground">
          {score.popularity ?? "n/a"}
        </span>
      </span>
      <span>
        Difficulty{" "}
        <span className={cn("font-medium", difficulty.className)}>
          {score.difficulty} {difficulty.label}
        </span>
      </span>
      {typeof score.appRank === "number" && (
        <span>
          You rank{" "}
          <span className="font-medium text-foreground">#{score.appRank}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Toggleable keyword chips. Each one carries its score and a one-sentence
 * verdict, so picking targets does not require reading a research table.
 */
export function KeywordChips({
  keywords,
  onToggle,
  scores,
  scoring,
  selected,
}: KeywordChipsProps) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {keywords.map((keyword) => {
        const isSelected = selected.has(keyword);
        const score = scores[keyword];
        const classification = score
          ? CLASSIFICATION_META[score.classification]
          : null;
        return (
          <li key={keyword}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(keyword)}
              className={cn(
                "flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/50",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 text-muted-foreground",
                  )}
                >
                  {isSelected ? (
                    <Check className="size-3" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                </span>
                <span className="flex-1 truncate font-medium text-sm">
                  {keyword}
                </span>
                {classification && score && (
                  <Badge
                    variant="outline"
                    className={cn("shrink-0", classification.className)}
                  >
                    {classification.label}
                  </Badge>
                )}
              </span>
              {score ? (
                <>
                  <ScoreLine score={score} />
                  <span className="text-muted-foreground text-xs">
                    {CLASSIFICATION_SENTENCE[score.classification]}
                  </span>
                </>
              ) : scoring ? (
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Loader2 className="size-3 animate-spin" />
                  Scoring
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
