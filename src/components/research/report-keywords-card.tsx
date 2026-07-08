"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useResearchKeywords } from "@/hooks/use-research";
import {
  formatKeywordPosition,
  parseCustomKeywords,
  type PositionTone,
} from "@/lib/research";
import type {
  ResearchAnalysis,
  ResearchAppMeta,
  ResearchKeywordPosition,
} from "@/lib/types";

import { STORE_LABELS } from "./shared";

const TONE_CLASS: Record<PositionTone, string> = {
  default: "",
  medium: "text-amber-600",
  muted: "text-muted-foreground",
  strong: "font-semibold text-emerald-600",
};

function PositionCell({ position }: { position: number | null | undefined }) {
  const formatted = formatKeywordPosition(position);
  return <span className={TONE_CLASS[formatted.tone]}>{formatted.label}</span>;
}

export function ReportKeywordsCard({
  analysis,
  country,
  meta,
  positions,
}: {
  analysis?: ResearchAnalysis;
  country: string;
  meta: ResearchAppMeta;
  positions: ResearchKeywordPosition[];
}) {
  const keywords = useResearchKeywords();
  const [customInput, setCustomInput] = useState("");
  const [customPositions, setCustomPositions] = useState<
    ResearchKeywordPosition[]
  >([]);

  const allPositions = [...positions, ...customPositions];

  function checkCustomKeywords() {
    const custom = parseCustomKeywords(customInput);
    if (!custom.length) return;
    keywords.mutate(
      {
        appstoreId: meta.store === "appstore" ? meta.id : undefined,
        country,
        keywords: custom,
        playstoreId: meta.store === "playstore" ? meta.id : undefined,
      },
      {
        onSuccess: (result) => {
          setCustomPositions((prev) => {
            const replaced = new Set(result.map((p) => p.keyword));
            return [...prev.filter((p) => !replaced.has(p.keyword)), ...result];
          });
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ASO keywords & positions ({country.toUpperCase()})</CardTitle>
        <CardDescription>
          Position = the app&apos;s rank in the store&apos;s top 50 search
          results. You
          can add your own keywords separated by commas or new lines.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. habit tracker, workout planner"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={checkCustomKeywords}
            disabled={keywords.isPending || !customInput.trim()}
          >
            {keywords.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {keywords.isPending ? "Checking…" : "Check"}
          </Button>
        </div>
        {allPositions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>{STORE_LABELS[meta.store]}</TableHead>
                <TableHead>Why</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allPositions.map((position) => {
                const reason = analysis?.asoKeywords.find(
                  (k) => k.keyword === position.keyword,
                )?.reason;
                return (
                  <TableRow key={position.keyword}>
                    <TableCell className="font-medium">
                      {position.keyword}
                    </TableCell>
                    <TableCell>
                      <PositionCell
                        position={
                          meta.store === "appstore"
                            ? position.appstore
                            : position.playstore
                        }
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {reason ?? "(custom)"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
