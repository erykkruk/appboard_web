"use client";

import { useParams } from "next/navigation";

import { AutomationTab } from "@/components/tracking/automation-tab";

/**
 * Emails and reminders for one app. The controls already existed as the
 * "Automation" tab buried under Research; this gives them their own entry in
 * the app's navigation so the last step of the flow is one click away.
 */
export default function RemindersPage() {
  const params = useParams<{ appId: string }>();
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div>
        <h1 className="font-bold text-xl tracking-tight">Reminders</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Nightly position checks, the weekly rank digest and automatic
          research - so you do not have to come back here every day.
        </p>
      </div>
      <AutomationTab appId={params.appId} />
    </div>
  );
}
