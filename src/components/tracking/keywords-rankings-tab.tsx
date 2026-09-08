"use client";

import { Loader2, Plus, RefreshCw, X } from "lucide-react";
import { useMemo, useState } from "react";

import { BoardChanges } from "@/components/tracking/board-changes";
import { BoardKpis } from "@/components/tracking/board-kpis";
import { BoardMetadata } from "@/components/tracking/board-metadata";
import { BoardMovement } from "@/components/tracking/board-movement";
import { BoardRuns } from "@/components/tracking/board-runs";
import { KeywordBoardTable } from "@/components/tracking/keyword-board-table";
import { KeywordTimeline } from "@/components/tracking/keyword-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/hooks/use-apps";
import {
  useAddKeywords,
  useRemoveKeyword,
  useRunRankCheck,
  useTracking,
  useTrackingBoard,
} from "@/hooks/use-tracking";
import { RESEARCH_COUNTRIES } from "@/lib/research";
import { MAX_TRACKED_KEYWORDS_PER_LANGUAGE } from "@/lib/types";

export function KeywordsRankingsTab({ appId }: { appId: string }) {
  const tracking = useTracking(appId);
  const addKeywords = useAddKeywords(appId);
  const removeKeyword = useRemoveKeyword(appId);
  const rankCheck = useRunRankCheck(appId);

  const app = useApp(appId);
  const [pickedCountry, setPickedCountry] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pickedBoardCountry, setPickedBoardCountry] = useState<string | null>(
    null,
  );

  const keywords = useMemo(
    () => tracking.data?.keywords ?? [],
    [tracking.data?.keywords],
  );

  const countriesUsed = useMemo(
    () => [...new Set(keywords.map((k) => k.country))].sort(),
    [keywords],
  );

  // The market you imported from is where your keywords live; opening on
  // "US" with "0/20" made an app tracked in PL look untracked.
  const homeCountry =
    app.data?.rawData?.publicCountry?.toLowerCase() ?? countriesUsed[0] ?? "us";
  const country = pickedCountry ?? homeCountry;

  // Effective board filter: keep the user's choice if it still has keywords,
  // otherwise the home market, otherwise the first market with keywords.
  const boardCountry =
    pickedBoardCountry && countriesUsed.includes(pickedBoardCountry)
      ? pickedBoardCountry
      : countriesUsed.includes(homeCountry)
        ? homeCountry
        : (countriesUsed[0] ?? "us");

  const board = useTrackingBoard(appId, boardCountry);

  const perCountryCount = keywords.filter((k) => k.country === country).length;

  function submitKeywords() {
    const parsed = [
      ...new Set(
        input
          .split(/[,\n]/)
          .map((k) => k.trim())
          .filter(Boolean),
      ),
    ];
    if (!parsed.length) return;
    addKeywords.mutate(
      { country, keywords: parsed },
      { onSuccess: () => setInput("") },
    );
  }

  if (tracking.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Add keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Tracked keywords</CardTitle>
          <CardDescription>
            Track up to {MAX_TRACKED_KEYWORDS_PER_LANGUAGE} keywords per market.
            Positions are measured daily at 00:00 and 12:00 (and whenever you hit
            “Check now”).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Market</Label>
              <Select value={country} onValueChange={setPickedCountry}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESEARCH_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1" style={{ minWidth: 240 }}>
              <Label>
                Keywords ({perCountryCount}/{MAX_TRACKED_KEYWORDS_PER_LANGUAGE})
              </Label>
              <Input
                placeholder="habit tracker, todo list, planner"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitKeywords();
                }}
              />
            </div>
            <Button
              onClick={submitKeywords}
              disabled={addKeywords.isPending || !input.trim()}
            >
              {addKeywords.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>

          {countriesUsed.map((c) => (
            <div key={c} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {c.toUpperCase()}
              </p>
              <div className="flex flex-wrap gap-2">
                {keywords
                  .filter((k) => k.country === c)
                  .map((k) => (
                    <Badge
                      key={k.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {k.keyword}
                      <button
                        type="button"
                        className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                        onClick={() => removeKeyword.mutate(k.id)}
                        aria-label={`Remove ${k.keyword}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            </div>
          ))}
          {!keywords.length && (
            <p className="text-sm text-muted-foreground">
              No tracked keywords yet — add some above or use “Add” from a research
              report.
            </p>
          )}
        </CardContent>
      </Card>

      {/* The tracker itself */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Tracker</CardTitle>
            <CardDescription>
              {tracking.data?.config.lastRankCheckAt
                ? `Last checked ${new Date(tracking.data.config.lastRankCheckAt).toLocaleString()}`
                : "Not checked yet"}
              {board.data?.stats.lastScoredAt
                ? ` · scores from ${board.data.stats.lastScoredAt}`
                : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {countriesUsed.length > 1 && (
              <Select
                value={boardCountry}
                onValueChange={setPickedBoardCountry}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countriesUsed.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="secondary"
              onClick={() => rankCheck.mutate()}
              disabled={rankCheck.isPending || !keywords.length}
            >
              {rankCheck.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Check now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {board.isLoading || !board.data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <BoardKpis stats={board.data.stats} />
              <Tabs defaultValue="keywords">
                <TabsList>
                  <TabsTrigger value="keywords">Keywords</TabsTrigger>
                  <TabsTrigger value="timeline">Positions over time</TabsTrigger>
                  <TabsTrigger value="movement">
                    Movement
                    {board.data.movement.length
                      ? ` (${board.data.movement.length})`
                      : ""}
                  </TabsTrigger>
                  <TabsTrigger value="metadata">Metadata vs ranking</TabsTrigger>
                  <TabsTrigger value="changes">Your changes</TabsTrigger>
                  <TabsTrigger value="runs">Measurements</TabsTrigger>
                </TabsList>

                <TabsContent className="pt-4" value="keywords">
                  <KeywordBoardTable keywords={board.data.keywords} />
                </TabsContent>
                <TabsContent className="pt-4" value="timeline">
                  <KeywordTimeline
                    changes={board.data.changes}
                    keywords={board.data.keywords}
                  />
                </TabsContent>
                <TabsContent className="pt-4" value="movement">
                  <BoardMovement movement={board.data.movement} />
                </TabsContent>
                <TabsContent className="pt-4" value="metadata">
                  <BoardMetadata
                    gap={board.data.metadataGap}
                    onTrack={(keyword) =>
                      addKeywords.mutate({
                        country: boardCountry,
                        keywords: [keyword],
                      })
                    }
                    tracking={addKeywords.isPending}
                    untracked={board.data.metadataUntracked}
                  />
                </TabsContent>
                <TabsContent className="pt-4" value="changes">
                  <BoardChanges changes={board.data.changes} />
                </TabsContent>
                <TabsContent className="pt-4" value="runs">
                  <BoardRuns runs={board.data.runs} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
