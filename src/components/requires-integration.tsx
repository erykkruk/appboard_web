"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function storeApiLabel(storeType?: string): string {
  if (storeType === "google_play") return "Google Play";
  if (storeType === "app_store") return "App Store";
  return "store";
}

function connectHref(storeType?: string): string {
  return storeType ? `/onboarding?type=${storeType}` : "/onboarding";
}

/**
 * Shown on store-write surfaces (publish, purchases, review replies) of an
 * app that was added from a public store link - reading public data works,
 * writing to the store needs real API credentials.
 */
export function RequiresIntegrationBanner({
  storeType,
  className,
}: {
  storeType?: string;
  className?: string;
}) {
  return (
    <Alert className={className}>
      <KeyRound className="h-4 w-4" />
      <AlertTitle>Store integration required</AlertTitle>
      <AlertDescription className="gap-2">
        <p>
          This app was added from a public store link. Connect your{" "}
          {storeApiLabel(storeType)} API to publish changes.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-1 w-fit">
          <Link href={connectHref(storeType)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Connect store API
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** Compact amber card for the app layout rail (mirrors the GP-draft card). */
export function RequiresIntegrationRailCard({
  storeType,
}: {
  storeType?: string;
}) {
  return (
    <Link
      href={connectHref(storeType)}
      className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 transition-colors hover:bg-amber-500/10"
    >
      <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium leading-tight text-amber-500">
          Public data only
        </p>
        <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
          Connect the {storeApiLabel(storeType)} API to publish. Click to set
          up.
        </p>
      </div>
    </Link>
  );
}
