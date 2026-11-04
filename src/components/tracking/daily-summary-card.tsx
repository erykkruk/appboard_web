"use client";

import { Mail } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useDailySummary,
  useSendTestDailySummary,
  useUpdateDailySummary,
} from "@/hooks/use-daily-summary";
import type { DailySummarySettings } from "@/lib/types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** "07:30 (Europe/Warsaw)"; exported for tests. */
export function summaryTimeLabel(schedule: DailySummarySettings["schedule"]): string {
  return `${pad(schedule.hour)}:${pad(schedule.minute)} (${schedule.timezone})`;
}

/** What the app count line says; exported for tests. */
export function coverageLabel(trackedApps: number): string {
  if (trackedApps === 0) {
    return "No app has rank tracking or auto-research on yet, so there is nothing to summarize.";
  }
  return `Covers ${trackedApps} ${trackedApps === 1 ? "app" : "apps"} with rank tracking or auto-research.`;
}

// Mounted once the settings are loaded, so `useState(initial)` captures the
// saved address without syncing state in an effect.
function SummaryEmailField({
  fallback,
  initial,
  onSave,
}: {
  fallback: string | null;
  initial: string;
  onSave: (value: string | null) => void;
}) {
  const [email, setEmail] = useState(initial);
  return (
    <div className="space-y-2">
      <Label htmlFor="daily-summary-email">Summary email</Label>
      <Input
        id="daily-summary-email"
        type="email"
        placeholder={fallback ?? "you@example.com"}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => {
          const next = email.trim();
          if (next !== initial) onSave(next || null);
        }}
      />
      <p className="text-xs text-muted-foreground">
        Leave empty to use the report email of your apps, or your account email.
      </p>
    </div>
  );
}

export interface DailySummaryCardViewProps {
  isLoading: boolean;
  isSendingTest: boolean;
  onSaveEmail: (email: string | null) => void;
  onSendTest: () => void;
  onToggle: (enabled: boolean) => void;
  settings: DailySummarySettings | undefined;
}

/** Presentational card; `DailySummaryCard` wires it to the API. */
export function DailySummaryCardView({
  isLoading,
  isSendingTest,
  onSaveEmail,
  onSendTest,
  onToggle,
  settings,
}: DailySummaryCardViewProps) {
  if (isLoading || !settings) {
    return <Skeleton className="h-48 w-full" data-testid="daily-summary-loading" />;
  }
  const noApps = settings.trackedApps === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily summary for all apps</CardTitle>
        <CardDescription>
          One email at {summaryTimeLabel(settings.schedule)} for every app in
          this workspace: rankings, biggest gains and drops, starred keywords,
          strongest markets and the latest auto-research. While it is on, the
          per-app rank digests and research reports are not sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Send the daily summary</p>
            <p className="text-sm text-muted-foreground">
              {settings.enabled
                ? "On: one morning email instead of one per app and check."
                : "Off: every app sends its own emails, as configured below."}
            </p>
          </div>
          <Switch
            aria-label="Send the daily summary"
            checked={settings.enabled}
            onCheckedChange={onToggle}
          />
        </div>
        <SummaryEmailField
          key={settings.email ?? ""}
          fallback={settings.effectiveEmail}
          initial={settings.email ?? ""}
          onSave={onSaveEmail}
        />
        <p className="text-sm text-muted-foreground">{coverageLabel(settings.trackedApps)}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={noApps || isSendingTest || !settings.effectiveEmail}
            onClick={onSendTest}
          >
            <Mail className="mr-2 h-4 w-4" />
            {isSendingTest ? "Sending..." : "Send a test summary now"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {settings.effectiveEmail
              ? `Goes to ${settings.effectiveEmail}.`
              : "No email address to send to yet."}
          </span>
        </div>
        {settings.lastSentAt && (
          <p className="text-xs text-muted-foreground">
            Last sent: {new Date(settings.lastSentAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function DailySummaryCard() {
  const summary = useDailySummary();
  const update = useUpdateDailySummary();
  const sendTest = useSendTestDailySummary();
  // A server older than 0.23.0 has no daily summary: show nothing rather
  // than a skeleton that never resolves.
  if (summary.isError) return null;
  return (
    <DailySummaryCardView
      isLoading={summary.isLoading}
      isSendingTest={sendTest.isPending}
      settings={summary.data}
      onToggle={(enabled) => update.mutate({ enabled })}
      onSaveEmail={(email) => update.mutate({ email })}
      onSendTest={() => sendTest.mutate()}
    />
  );
}
