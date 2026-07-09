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
import { useTracking, useUpdateTrackingConfig } from "@/hooks/use-tracking";
import type { AutoResearchFrequency } from "@/lib/types";

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

  if (tracking.isLoading || !config) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daily rank tracking</CardTitle>
          <CardDescription>
            Automatically measure your tracked keyword positions every day at
            00:00 and 12:00 (Europe/Warsaw), and store the history for the chart.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <Row
            title="Track rankings daily"
            description="Record positions twice a day for all tracked keywords."
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
            description="Send a summary email with positions + day-over-day changes."
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
            Periodically re-run research on this app and email a report (reviews
            analysis, top complaints, keyword positions).
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
