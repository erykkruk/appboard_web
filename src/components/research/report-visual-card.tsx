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
import { useResearchVisual } from "@/hooks/use-research";
import type { ResearchAppMeta } from "@/lib/types";

export function ReportVisualCard({ meta }: { meta: ResearchAppMeta }) {
  const visual = useResearchVisual();
  const result = visual.data;
  const screenshots = meta.screenshots ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual analysis (icon + screenshots)</CardTitle>
        <CardDescription>
          A vision model reviews the store page for install conversion.
          Requires an OpenRouter key in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {screenshots.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {screenshots.map((screenshot, index) => (
              <img
                key={screenshot}
                src={screenshot}
                alt={`Screenshot ${index + 1}`}
                className="h-40 rounded-md border"
              />
            ))}
          </div>
        )}
        {!result && (
          <Button
            variant="secondary"
            onClick={() => visual.mutate({ meta })}
            disabled={visual.isPending}
          >
            {visual.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {visual.isPending
              ? "Analyzing images…"
              : "Review icon & screenshots"}
          </Button>
        )}
        {result && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Icon:</span> {result.iconVerdict}
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              {result.screenshotFindings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ol>
            <div>
              <p className="font-medium">Conversion recommendations:</p>
              <ul className="list-disc space-y-1 pl-5">
                {result.conversionTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
