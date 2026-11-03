"use client";

import { Loader2, Play } from "lucide-react";
import { useMemo, useState } from "react";

import { AppResearchReport } from "@/components/tracking/app-research-report";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRunAppResearch } from "@/hooks/use-app-research";
import { useApp } from "@/hooks/use-apps";
import { useTracking, useTrackingMarkets } from "@/hooks/use-tracking";
import { pickDefaultMarket, sortMarketsForDashboard } from "@/lib/rank-dashboard";
import { MAX_KEYWORDS_PER_CHECK, RESEARCH_COUNTRIES } from "@/lib/research";

const FALLBACK_COUNTRY = "us";

export function AppResearchRunTab({ appId }: { appId: string }) {
  const run = useRunAppResearch(appId);
  const tracking = useTracking(appId);
  const app = useApp(appId);
  const markets = useTrackingMarkets(appId);
  const [picked, setPicked] = useState<string | null>(null);
  const [deep, setDeep] = useState(false);

  // Markets you track come first (strongest first), then the rest, so the
  // default is the market whose keywords the run will actually check.
  const trackedMarkets = useMemo(
    () =>
      sortMarketsForDashboard(markets.data?.markets ?? []).map((m) => m.country),
    [markets.data?.markets],
  );
  const options = useMemo(
    () => [
      ...trackedMarkets,
      ...RESEARCH_COUNTRIES.filter((c) => !trackedMarkets.includes(c)),
    ],
    [trackedMarkets],
  );
  const country =
    picked ??
    pickDefaultMarket(
      markets.data?.markets ?? [],
      app.data?.rawData?.publicCountry ?? null,
    ) ??
    FALLBACK_COUNTRY;
  const keywords = (tracking.data?.keywords ?? [])
    .filter((k) => k.country === country)
    .map((k) => k.keyword);
  const checked = Math.min(keywords.length, MAX_KEYWORDS_PER_CHECK);

  function runResearch() {
    run.mutate({ country, deep, keywords });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run research on this app</CardTitle>
          <CardDescription>
            Scrapes store reviews + metadata, runs AI analysis and checks your
            tracked keyword positions, then saves it to History.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Market</Label>
              <Select value={country} onValueChange={setPicked}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.toUpperCase()}
                      {trackedMarkets.includes(c) ? " (tracked)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch id="deep" checked={deep} onCheckedChange={setDeep} />
              <Label htmlFor="deep">Deep (more reviews)</Label>
            </div>
            <Button onClick={runResearch} disabled={run.isPending}>
              {run.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {run.isPending ? "Running..." : "Run research"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {keywords.length === 0
              ? "No keywords tracked in this market: the run checks reviews and metadata only."
              : `Checks positions for ${checked} of the ${keywords.length} keywords you track in ${country.toUpperCase()}.`}
          </p>
        </CardContent>
      </Card>

      {run.data && <AppResearchReport run={run.data} />}
    </div>
  );
}
