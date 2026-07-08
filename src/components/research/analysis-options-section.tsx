"use client";

import { Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { RESEARCH_COUNTRIES } from "@/lib/research";

export function AnalysisOptionsSection({
  country,
  deep,
  onCountryChange,
  onDeepChange,
  onRun,
  progress,
  running,
  selectedCount,
}: {
  country: string;
  deep: boolean;
  onCountryChange: (country: string) => void;
  onDeepChange: (deep: boolean) => void;
  onRun: () => void;
  progress: string | null;
  running: boolean;
  selectedCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Analysis options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="research-country">Market</Label>
            <Select value={country} onValueChange={onCountryChange}>
              <SelectTrigger id="research-country" className="w-32">
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
          <div className="flex items-center gap-2">
            <Switch
              id="research-deep"
              checked={deep}
              onCheckedChange={onDeepChange}
            />
            <Label htmlFor="research-deep" className="cursor-pointer">
              Deep analysis
            </Label>
            <span className="text-xs text-muted-foreground">
              Fetches the full review set (Play up to 1500, iOS ~500) and reads
              all of it in batches. Slower, but the feature report is complete.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onRun} disabled={running || selectedCount === 0}>
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {running ? "Working…" : `Analyze selected (${selectedCount})`}
          </Button>
          {progress && (
            <span className="text-sm text-muted-foreground">{progress}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
