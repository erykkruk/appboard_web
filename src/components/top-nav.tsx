"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  LayoutDashboard,
  Microscope,
  Plus,
  Settings,
  Sparkles,
  Store,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { HelpMenu } from "@/components/help-menu";
import { VersionDialog } from "@/components/version-dialog";
import { useApps } from "@/hooks/use-apps";
import { useFeatureFilter } from "@/hooks/use-features";
import { useAppSelection } from "@/lib/app-selection-context";
import { cn } from "@/lib/utils";

/** From this many apps on, the switcher gets a search box. */
const SEARCH_FROM = 5;

/** Hydration flag store: it never changes, so nothing ever needs notifying. */
const NO_SUBSCRIBE = () => () => {};

function platformLabel(platform?: string): string {
  return platform === "ios" ? "App Store" : "Google Play";
}

/**
 * The single global navigation bar. Replaces the left rail: an app switcher
 * that doubles as the multi-select, workspace destinations, and the account
 * menu. Section navigation for one app lives in the app layout's context bar,
 * so there is never more than one vertical of chrome.
 */
export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const apps = useApps();
  const isFeatureAllowed = useFeatureFilter();
  const selection = useAppSelection();
  const [search, setSearch] = useState("");
  // The selection lives in sessionStorage, which the server cannot read.
  // Rendering it before hydration produces a server/client tree mismatch and
  // React discards the whole subtree, so selection-derived UI waits for the
  // client. useSyncExternalStore gives the server/client split directly, with
  // no effect and no extra render pass.
  const mounted = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => true,
    () => false,
  );

  const appList = useMemo(() => apps.data ?? [], [apps.data]);
  const activeAppId = pathname.match(/^\/apps\/([^/]+)/)?.[1] ?? null;
  const activeApp = appList.find((a) => a.id === activeAppId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appList;
    return appList.filter((a) => a.name.toLowerCase().includes(q));
  }, [appList, search]);

  const selectedCount = mounted ? selection.selectedIds.size : 0;

  return (
    <header className="sticky top-0 z-40 shrink-0 border-border border-b bg-background">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/dashboard" className="font-bold text-sm tracking-tight">
          AppBoard
        </Link>

        {/* App switcher: click a name to navigate, a checkbox to multi-select. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {activeApp ? (
                <>
                  {activeApp.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeApp.iconUrl}
                      alt=""
                      className="h-4 w-4 rounded"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className="max-w-[180px] truncate">{activeApp.name}</span>
                </>
              ) : (
                <span>All apps</span>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[340px]">
            {appList.length >= SEARCH_FROM && (
              <div className="p-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search apps"
                  className="h-8"
                />
              </div>
            )}
            {filtered.map((app) => {
              const isSelected = mounted && selection.selectedIds.has(app.id);
              return (
                <DropdownMenuItem
                  key={app.id}
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    // Switching apps keeps you on the same kind of screen.
                    const suffix = activeAppId
                      ? pathname.slice(`/apps/${activeAppId}`.length)
                      : "/dashboard";
                    router.push(`/apps/${app.id}${suffix || "/dashboard"}`);
                  }}
                >
                  <button
                    type="button"
                    aria-label={
                      isSelected ? `Deselect ${app.name}` : `Select ${app.name}`
                    }
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      selection.toggle(app.id);
                    }}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                  <span className="min-w-0 flex-1 truncate">{app.name}</span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {platformLabel(app.platform)}
                  </span>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push("/dashboard")}>
              All apps
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/start")}>
              <Plus className="h-3.5 w-3.5" />
              Add app - paste a store link
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/start#new")}>
              <Sparkles className="h-3.5 w-3.5" />
              Add something new - not in a store yet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {selectedCount > 0 && (
          <>
            <Badge variant="secondary" className="gap-2">
              {selectedCount} selected
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => selection.clear()}
              >
                clear
              </button>
            </Badge>
            <Button size="sm" variant="outline" asChild>
              <Link href="/bulk">Apply to {selectedCount} apps</Link>
            </Button>
          </>
        )}

        <div className="flex-1" />

        <Button variant="ghost" size="sm" asChild>
          <Link href="/home">
            <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
            Overview
          </Link>
        </Button>
        {isFeatureAllowed("RESEARCH") && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/research">
              <Microscope className="mr-1.5 h-3.5 w-3.5" />
              Research
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/onboarding">
            <Store className="mr-1.5 h-3.5 w-3.5" />
            Stores
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Settings
          </Link>
        </Button>
        {/* Both lived at the bottom of the old sidebar; dropping them would
            have quietly removed help and the changelog from the product. */}
        <HelpMenu />
        <VersionDialog />
      </div>
    </header>
  );
}
