"use client";

import { useState } from "react";

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
import { Switch } from "@/components/ui/switch";
import { useDailySummary } from "@/hooks/use-daily-summary";
import { useTracking, useUpdateTrackingConfig } from "@/hooks/use-tracking";
import {
  rankCheckFrequencyLabel,
  rankCheckHours,
  rankCheckTimesLabel,
} from "@/lib/rank-schedule";
import type { AutoResearchFrequency, TrackingSchedule } from "@/lib/types";

import { DailySummaryCard } from "./daily-summary-card";

const DEFAULT_AUTO_RESEARCH_HOUR = 6;
const DEFAULT_TIMEZONE = "Europe/Warsaw";

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** "Next run: ..." for the auto-research card; exported for tests. */
export function nextRunLabel(
  enabled: boolean,
  schedule: TrackingSchedule | undefined,
): string {
  if (!enabled) return "Auto-research is off.";
  if (!schedule?.nextAutoResearchAt) return "Next run: not scheduled yet.";
  return `Next run: ${new Date(schedule.nextAutoResearchAt).toLocaleString()}`;
}

function Row({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

// Isolated so it mounts with config already loaded — `useState(initial)` then
// captures the saved email without a set-state-in-effect sync.
function NotifyEmailField({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (value: string | null) => void;
}) {
  const [email, setEmail] = useState(initial);
  return (
    <>
      <Label htmlFor="notify-email">Report email</Label>
      <Input
        id="notify-email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => {
          const next = email.trim();
          if (next !== initial) onSave(next || null);
        }}
      />
    </>
  );
}

export function AutomationTab({ appId }: { appId: string }) {
  const tracking = useTracking(appId);
  const update = useUpdateTrackingConfig(appId);
  const config = tracking.data?.config;
  const schedule = tracking.data?.schedule;
  const checkHours = rankCheckHours(schedule);
  const summaryOn = useDailySummary().data?.enabled ?? false;

  if (tracking.isLoading || !config) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <DailySummaryCard />

      <Card>
        <CardHeader>
          <CardTitle>Daily rank tracking</CardTitle>
          <CardDescription>
            Automatically measure your tracked keyword positions every day at{" "}
            {rankCheckTimesLabel(checkHours)} ({schedule?.timezone ?? DEFAULT_TIMEZONE}),
            and store the history for the chart.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <Row
            title="Track rankings daily"
            description={`Record positions ${rankCheckFrequencyLabel(checkHours)} for all tracked keywords.`}
          >
            <Switch
              checked={config.rankTrackingEnabled}
              onCheckedChange={(v) =>
                update.mutate({ rankTrackingEnabled: v })
              }
            />
          </Row>
          <Row
            title="Email daily rank digest"
            description={
              summaryOn
                ? "Replaced by the daily summary for all apps while it is on."
                : "Send a summary email with positions + day-over-day changes."
            }
          >
            <Switch
              checked={config.emailRankDigest}
              onCheckedChange={(v) => update.mutate({ emailRankDigest: v })}
            />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-research</CardTitle>
          <CardDescription>
            Runs at {formatHour(schedule?.autoResearchHour ?? DEFAULT_AUTO_RESEARCH_HOUR)}{" "}
            ({schedule?.timezone ?? DEFAULT_TIMEZONE}). Each run fully researches
            your home market (reviews, AI analysis, keyword positions) and
            {summaryOn
              ? " puts the result in the daily summary"
              : " emails a report"}
            , then scores new keyword ideas in your other tracked
            markets. A daily run spreads the markets over the week, so every
            market is covered at least once a week.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <Row
            title="Enable auto-research"
            description="Run research automatically on a schedule."
          >
            <Switch
              checked={config.autoResearchEnabled}
              onCheckedChange={(v) =>
                update.mutate({ autoResearchEnabled: v })
              }
            />
          </Row>
          <Row title="Frequency" description="How often auto-research runs.">
            <Select
              value={config.autoResearchFrequency}
              onValueChange={(v) =>
                update.mutate({
                  autoResearchFrequency: v as AutoResearchFrequency,
                })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <p className="pt-3 text-xs text-muted-foreground">
            {nextRunLabel(config.autoResearchEnabled, schedule)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Where reports are sent. Leave empty to use your account email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <NotifyEmailField
            initial={config.notifyEmail ?? ""}
            onSave={(value) => update.mutate({ notifyEmail: value })}
          />
          <p className="text-xs text-muted-foreground">
            With an address set, a draft left unpublished for three days also
            gets one reminder email (at most once a week), so edits do not
            quietly go stale.
          </p>
          <div className="pt-2 text-xs text-muted-foreground">
            {config.lastRankCheckAt && (
              <p>
                Last rank check:{" "}
                {new Date(config.lastRankCheckAt).toLocaleString()}
              </p>
            )}
            {config.lastAutoResearchAt && (
              <p>
                Last auto-research:{" "}
                {new Date(config.lastAutoResearchAt).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
