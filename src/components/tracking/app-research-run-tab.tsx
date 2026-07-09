"use client";

import { Loader2, Play } from "lucide-react";
import { useState } from "react";

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
import { useTracking } from "@/hooks/use-tracking";
import { RESEARCH_COUNTRIES } from "@/lib/research";

export function AppResearchRunTab({ appId }: { appId: string }) {
  const run = useRunAppResearch(appId);
  const tracking = useTracking(appId);
  const [country, setCountry] = useState("us");
  const [deep, setDeep] = useState(false);

  function runResearch() {
    const keywords = (tracking.data?.keywords ?? [])
      .filter((k) => k.country === country)
      .map((k) => k.keyword);
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
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-32">
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
              {run.isPending ? "Running…" : "Run research"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {run.data && <AppResearchReport run={run.data} />}
    </div>
  );
}
