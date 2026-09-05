"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { MobileGate } from "@/components/mobile-gate";
import { PushPreviewDialog } from "@/components/push-preview-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApp } from "@/hooks/use-apps";
import { useFeatureFilter } from "@/hooks/use-features";
import { useCreateVersion, useVersions } from "@/hooks/use-publishing";
import { api } from "@/lib/api";
import { APP_NAV, VERSION_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const STATE_BAR_COLORS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "bg-yellow-400",
  READY_FOR_SALE: "bg-green-400",
  WAITING_FOR_REVIEW: "bg-blue-400",
  IN_REVIEW: "bg-blue-400",
  DEVELOPER_REJECTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  PENDING_DEVELOPER_RELEASE: "bg-purple-400",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileGate>
      <AppWorkspace>{children}</AppWorkspace>
    </MobileGate>
  );
}

function NavPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium text-sm transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * The app's own navigation, as one horizontal context bar instead of a second
 * vertical rail. Everything the rail carried survives here: section links, the
 * iOS version selector and its sub-navigation, push and sync.
 */
function AppWorkspace({ children }: { children: React.ReactNode }) {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const currentPath = usePathname();
  const router = useRouter();
  const app = useApp(appId);
  const isFeatureAllowed = useFeatureFilter();
  const versions = useVersions(appId);

  const createVersion = useCreateVersion(appId);
  const [newVersion, setNewVersion] = useState("");
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPushPreview, setShowPushPreview] = useState(false);
  const queryClient = useQueryClient();

  const basePath = `/apps/${appId}`;
  const versionList = versions.data ?? [];
  const draftVersion = versionList.find((v) => v.isEditable);
  const isIos = app.data?.platform === "ios";
  const isGpDraftApp = !isIos && app.data?.status === "draft";
  const isPublicApp = app.data?.store?.connectionMode === "public";

  const versionMatch = currentPath.match(/\/versions\/([^/]+)/);
  const urlVersionId = versionMatch?.[1] ?? null;
  const isVersionPage = currentPath.includes("/versions/");

  const [rememberedVersionId, setRememberedVersionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (urlVersionId) setRememberedVersionId(urlVersionId);
  }, [urlVersionId]);

  useEffect(() => {
    if (versionList.length === 0 || rememberedVersionId) return;
    const target = draftVersion ?? versionList[0];
    if (target) setRememberedVersionId(target.id);
  }, [versionList, rememberedVersionId, draftVersion]);

  const selectedVersionId = rememberedVersionId;
  const selectedVersion = versionList.find((v) => v.id === selectedVersionId);

  const handleCreateVersion = async () => {
    if (!newVersion.trim()) return;
    try {
      const result = await createVersion.mutateAsync(newVersion.trim());
      const langCount = result?.copiedLanguages?.length ?? 0;
      const langMsg = langCount > 0 ? ` with ${langCount} languages` : "";
      toast.success(`Version ${newVersion.trim()} created${langMsg}`);
      setNewVersion("");
      setShowNewVersion(false);
    } catch {
      toast.error("Failed to create version");
    }
  };

  const handleSyncAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      const syncTasks: Promise<unknown>[] = [
        api.listings.sync(appId),
        api.assets.sync(appId),
        api.reviews.sync(appId),
      ];
      if (!isPublicApp) syncTasks.push(api.purchases.sync(appId));
      if (isIos && !isPublicApp) {
        syncTasks.push(api.publishing.syncVersions(appId));
      }

      const results = await Promise.allSettled(syncTasks);
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => (r.reason as Error)?.message ?? String(r.reason));

      queryClient.invalidateQueries({ queryKey: ["listings", appId] });
      queryClient.invalidateQueries({ queryKey: ["assets", appId] });
      queryClient.invalidateQueries({ queryKey: ["reviews", appId] });
      queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
      queryClient.invalidateQueries({ queryKey: ["publishing", appId] });
      queryClient.invalidateQueries({ queryKey: ["app-audit", appId] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });

      if (errors.length > 0) {
        for (const msg of errors) toast.error(msg);
      } else {
        toast.success("Everything synced");
      }
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : "Sync failed",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [appId, isIos, isPublicApp, queryClient]);

  const lastSyncedAt = app.data?.lastSyncedAt;
  const sectionItems = APP_NAV.filter(
    (item) => !item.iosOnly || isIos,
  ).filter((item) => isFeatureAllowed(item.featureKey));
  const versionItems = VERSION_NAV.filter(
    (item) => !item.iosOnly || isIos,
  ).filter((item) => isFeatureAllowed(item.featureKey));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-border border-b bg-background">
        <div className="flex h-11 items-center gap-1 overflow-x-auto px-4">
          {sectionItems.map((item) => {
            const href = `${basePath}${item.suffix ?? ""}`;
            return (
              <NavPill
                key={item.label}
                href={href}
                active={currentPath.startsWith(href) && !isVersionPage}
              >
                {item.label}
              </NavPill>
            );
          })}

          {isIos && (
            <>
              <span className="mx-1 h-5 w-px shrink-0 bg-border" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isVersionPage ? "secondary" : "ghost"}
                    size="sm"
                    className="shrink-0 gap-2"
                  >
                    <span
                      className={cn(
                        "h-3.5 w-1 shrink-0 rounded-full",
                        selectedVersion
                          ? (STATE_BAR_COLORS[selectedVersion.state] ??
                            "bg-muted-foreground")
                          : "bg-muted-foreground",
                      )}
                    />
                    {selectedVersion
                      ? `Version ${selectedVersion.versionString}`
                      : "Version"}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  {versions.isLoading && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {versionList.map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      className="gap-2.5"
                      onSelect={() => router.push(`${basePath}/versions/${v.id}`)}
                    >
                      <span
                        className={cn(
                          "h-4 w-1 shrink-0 rounded-full",
                          STATE_BAR_COLORS[v.state] ?? "bg-muted-foreground",
                        )}
                      />
                      <span className="truncate">{v.versionString}</span>
                    </DropdownMenuItem>
                  ))}
                  {!draftVersion && versionList.length > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  {!draftVersion && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setShowNewVersion(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>New Version</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {showNewVersion && (
            <div className="flex shrink-0 items-center gap-1.5">
              <Input
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="1.0.0"
                className="h-7 w-24 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateVersion();
                  if (e.key === "Escape") {
                    setShowNewVersion(false);
                    setNewVersion("");
                  }
                }}
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleCreateVersion}
                disabled={createVersion.isPending || !newVersion.trim()}
              >
                {createVersion.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </div>
          )}

          <div className="flex-1" />

          {isGpDraftApp && (
            <Link
              href={`${basePath}/setup`}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-500"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Setup required
            </Link>
          )}

          {isPublicApp && (
            <Link
              href="/onboarding"
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-500"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Public data only - connect the store API
            </Link>
          )}

          {isPublicApp ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span className="shrink-0">
                  <Button variant="outline" size="sm" disabled className="gap-2">
                    <Upload className="h-3.5 w-3.5" />
                    {isIos ? "Push to App Store" : "Push as Draft"}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Requires store API integration
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => setShowPushPreview(true)}
              disabled={isGpDraftApp}
            >
              <Upload className="h-3.5 w-3.5" />
              {isIos ? "Push to App Store" : "Push as Draft"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync All"}
          </Button>
          {lastSyncedAt && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              Synced {new Date(lastSyncedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Version sub-navigation. Shown whenever a version exists, exactly
            like the old rail did - hiding it behind "you are already on a
            version page" made Store Graphics and App Review unreachable. */}
        {selectedVersionId && (
          <div className="flex h-10 items-center gap-1 overflow-x-auto border-border border-t px-4">
            {versionItems.map((item) => {
              const suffix = item.suffix ?? "";
              const href = `${basePath}/versions/${selectedVersionId}${suffix}`;
              const active =
                suffix === ""
                  ? currentPath === `${basePath}/versions/${selectedVersionId}`
                  : currentPath.startsWith(href);
              return (
                <NavPill key={item.label} href={href} active={active}>
                  {item.label}
                </NavPill>
              );
            })}
          </div>
        )}
      </div>

      <PushPreviewDialog
        appId={appId}
        isIos={isIos}
        open={showPushPreview}
        onOpenChange={setShowPushPreview}
        onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["apps"] });
          queryClient.invalidateQueries({ queryKey: ["listings", appId] });
          queryClient.invalidateQueries({ queryKey: ["purchases", appId] });
          queryClient.invalidateQueries({ queryKey: ["publishing", appId] });
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
