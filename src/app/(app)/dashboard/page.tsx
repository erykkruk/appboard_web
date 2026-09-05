"use client";

import Link from "next/link";
import {
  Apple,
  ArrowRight,
  KeyRound,
  Link2,
  type LucideIcon,
  PlugZap,
  Plus,
  Search,
  Smartphone,
  Store,
  Wand2,
} from "lucide-react";
import { useState } from "react";

import { AddAppDialog } from "@/components/add-app-dialog";
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
import type { App, StoreConnectionMode } from "@/lib/types";

const PLATFORM_LABELS: Record<string, { label: string; icon: typeof Apple }> = {
  android: { label: "Google Play", icon: Store },
  ios: { label: "App Store", icon: Apple },
};

// Where the app's data comes from: a public store link (read-only) or a real
// store API connection that can also publish back.
const CONNECTION_MODE_LABELS: Record<
  StoreConnectionMode,
  { icon: LucideIcon; label: string }
> = {
  api: { icon: PlugZap, label: "Connected" },
  public: { icon: Link2, label: "From link" },
};

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

function formatSyncedAt(iso: string | null): string {
  if (!iso) return "Never synced";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Never synced";
  const elapsed = Date.now() - then;
  if (elapsed < HOUR_MS) {
    return `Synced ${Math.max(1, Math.floor(elapsed / MINUTE_MS))}m ago`;
  }
  if (elapsed < DAY_MS) return `Synced ${Math.floor(elapsed / HOUR_MS)}h ago`;
  if (elapsed < MONTH_MS) return `Synced ${Math.floor(elapsed / DAY_MS)}d ago`;
  return `Synced ${new Date(then).toLocaleDateString()}`;
}

/**
 * One first-run entry point. It either navigates (`href`) or opens a dialog
 * in place (`onClick`), so the tile renders as a link or a button accordingly.
 */
function FirstRunTile({
  cta,
  description,
  href,
  icon: Icon,
  onClick,
  title,
}: {
  cta: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  onClick?: () => void;
  title: string;
}) {
  const card = (
    <Card className="h-full gap-3 border-dashed py-5 transition-colors hover:border-primary/60 hover:bg-muted/40">
      <CardHeader className="gap-2 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {card}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full w-full text-left"
    >
      {card}
    </button>
  );
}

function AppCard({ app }: { app: App }) {
  const platform = PLATFORM_LABELS[app.platform];
  const connectionMode = app.store?.connectionMode;
  const source = connectionMode ? CONNECTION_MODE_LABELS[connectionMode] : null;

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
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {source && (
                <Badge
                  variant="outline"
                  className="gap-1 font-normal text-muted-foreground"
                >
                  <source.icon className="h-3 w-3" />
                  {source.label}
                </Badge>
              )}
              <span className="truncate text-xs text-muted-foreground">
                {[app.store?.name, formatSyncedAt(app.lastSyncedAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const stores = useStores();
  const apps = useApps();
  const [showAddApp, setShowAddApp] = useState(false);

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
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Start here</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Three things you can do right now. None of them needs store API
            credentials.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FirstRunTile
            icon={Link2}
            title="Add your app from a store link"
            description="Paste an App Store or Google Play link. You get the listing text, screenshots, ratings and reviews in your workspace in seconds."
            cta="Paste a link"
            href="/start"
          />
          <FirstRunTile
            icon={Search}
            title="Check keyword difficulty"
            description="Score any keyword against the live store: how often it is searched, how hard it is to rank for, and which apps hold the top spots today."
            cta="Open keyword check"
            href="/keyword-check"
          />
          <FirstRunTile
            icon={Wand2}
            title="Open screenshot editor"
            description="Lay out store screenshots from templates in your browser - device frames, headlines, backgrounds - and export them as ready PNG files."
            cta="Open editor"
            href="/editor"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Publishing from AppBoard?{" "}
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
          >
            <KeyRound className="h-3 w-3" />
            Connect store API
          </Link>{" "}
          to push listings and screenshots back to the store.
        </p>

        <AddAppDialog open={showAddApp} onOpenChange={setShowAddApp} />
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
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">All Apps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {appsList.length} app{appsList.length !== 1 ? "s" : ""} across your
            connected stores.
          </p>
        </div>
        {/* Adding an app used to live in the sidebar. With the sidebar gone
            this was the only way in, so it belongs on the screen that lists
            them. It opens the flow, not a bare dialog. */}
        <Button asChild>
          <Link href="/start">
            <Plus className="mr-1.5 h-4 w-4" />
            Add app
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {appsList.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}
