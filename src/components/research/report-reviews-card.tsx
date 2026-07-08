"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ResearchReview } from "@/lib/types";
import { cn } from "@/lib/utils";

import { formatResearchDate } from "./shared";

const REVIEWS_PAGE_SIZE = 20;

function starsClass(stars: number): string {
  if (stars <= 2) return "text-red-600";
  if (stars === 3) return "text-amber-600";
  return "text-emerald-600";
}

export function ReportReviewsCard({ reviews }: { reviews: ResearchReview[] }) {
  const [shown, setShown] = useState(REVIEWS_PAGE_SIZE);

  if (!reviews.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews ({reviews.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.slice(0, shown).map((review, index) => (
          <div
            key={`${review.date ?? ""}-${index}`}
            className="rounded-md border p-3"
          >
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className={cn(starsClass(review.stars))}>
                {"★".repeat(review.stars)}
                {"☆".repeat(Math.max(0, 5 - review.stars))}
              </span>
              {review.version && (
                <span className="text-xs text-muted-foreground">
                  v{review.version}
                </span>
              )}
              {review.date && (
                <span className="text-xs text-muted-foreground">
                  {formatResearchDate(review.date)}
                </span>
              )}
            </div>
            {review.title && (
              <p className="text-sm font-medium">{review.title}</p>
            )}
            <p className="text-sm text-muted-foreground">{review.text}</p>
          </div>
        ))}
        {shown < reviews.length && (
          <Button
            variant="outline"
            onClick={() => setShown((n) => n + REVIEWS_PAGE_SIZE)}
          >
            Show more ({reviews.length - shown} remaining)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
