"use client";

import Link from "next/link";
import { Apple, ExternalLink, Plus, Smartphone, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApps } from "@/hooks/use-apps";
import { useStores } from "@/hooks/use-stores";
import type { App } from "@/lib/types";

const PLATFORM_LABELS: Record<string, { label: string; icon: typeof Apple }> = {
  android: { label: "Google Play", icon: Store },
  ios: { label: "App Store", icon: Apple },
};

function AppCard({ app }: { app: App }) {
  const platform = PLATFORM_LABELS[app.platform];

  return (
    <Link href={`/apps/${app.id}/dashboard`}>
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardContent className="flex items-start gap-4 p-4">
          {app.iconUrl ? (
            <img
              src={app.iconUrl}
              alt={app.name}
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#2a2a2a] text-lg font-bold text-muted-foreground">
              {app.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{app.name}</p>
              {platform && (
                <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                  <platform.icon className="h-3 w-3" />
                  {platform.label}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {app.bundleId}
            </p>
            {app.store && (
              <p className="mt-1 text-xs text-muted-foreground">
                Store: {app.store.name}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const stores = useStores();
  const apps = useApps();

  const hasStores = (stores.data ?? []).length > 0;
  const appsList = apps.data ?? [];

  if (stores.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasStores) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-lg border-dashed">
          <CardHeader className="items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#2a2a2a]">
              <Store className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">No store connected</CardTitle>
            <CardDescription className="max-w-sm text-base">
              Connect your Google Play or App Store account to start managing
              your apps.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button asChild size="lg">
              <Link href="/onboarding">
                <Plus className="mr-2 h-4 w-4" />
                Connect a Store
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You will need API credentials.{" "}
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
              >
                See setup guide
                <ExternalLink className="h-3 w-3" />
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (apps.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (appsList.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <Smartphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-semibold">No apps found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sync your stores to discover apps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">All Apps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {appsList.length} app{appsList.length !== 1 ? "s" : ""} across your
          connected stores.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {appsList.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}
