"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  CreditCard,
  FileText,
  Globe,
  Image,
  ImagePlus,
  Info,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Star,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useApp } from "@/hooks/use-apps";
import { api } from "@/lib/api";
import { useCreateVersion, useVersions } from "@/hooks/use-publishing";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, suffix: "/dashboard" },
  { label: "Information", icon: Info, suffix: "/information" },
  { label: "Publish", icon: Rocket, suffix: "/publish" },
  { label: "Purchases", icon: CreditCard, suffix: "/purchases" },
  { label: "Reviews", icon: Star, suffix: "/reviews" },
  { label: "Settings", icon: Settings, suffix: "/settings" },
] as const;

const VERSION_NAV_ITEMS = [
  { label: "Languages", icon: Globe, suffix: "/languages" },
  { label: "Listings", icon: FileText, suffix: "" },
  { label: "Previews & Screenshots", icon: Image, suffix: "/screenshots" },
  { label: "Store Graphics", icon: ImagePlus, suffix: "/graphics" },
  { label: "App Review", icon: ShieldCheck, suffix: "/review", iosOnly: true },
  { label: "Age Rating", icon: ShieldAlert, suffix: "/age-rating", iosOnly: true },
] as const;

const STATE_BAR_COLORS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "bg-yellow-400",
  READY_FOR_SALE: "bg-green-400",
  WAITING_FOR_REVIEW: "bg-blue-400",
  IN_REVIEW: "bg-blue-400",
  DEVELOPER_REJECTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  PENDING_DEVELOPER_RELEASE: "bg-purple-400",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const currentPath = usePathname();
  const router = useRouter();
  const app = useApp(appId);
  const versions = useVersions(appId);
  const createVersion = useCreateVersion(appId);
  const [newVersion, setNewVersion] = useState("");
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const queryClient = useQueryClient();

  const basePath = `/apps/${appId}`;

  const versionList = versions.data ?? [];
  const draftVersion = versionList.find((v) => v.isEditable);
  const isIos = app.data?.platform === "ios";

  const isGpDraftApp = !isIos && app.data?.status === "draft";

  // Detect version from URL
  const versionMatch = currentPath.match(/\/versions\/([^/]+)/);
  const urlVersionId = versionMatch?.[1] ?? null;
  const isVersionPage = currentPath.includes("/versions/");

  // Persist selected version across navigation
  const [rememberedVersionId, setRememberedVersionId] = useState<string | null>(null);

  // Sync URL version → remembered state
  useEffect(() => {
    if (urlVersionId) {
      setRememberedVersionId(urlVersionId);
    }
  }, [urlVersionId]);

  // Auto-select draft (or first) version when none remembered yet
  useEffect(() => {
    if (versionList.length === 0 || rememberedVersionId) return;
    const target = draftVersion ?? versionList[0];
    if (target) {
      setRememberedVersionId(target.id);
    }
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
      const syncTasks = [
        api.listings.sync(appId),
        api.assets.sync(appId),
        api.reviews.sync(appId),
        api.purchases.sync(appId),
      ];

      // Version sync is iOS/App Store only
      if (isIos) {
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
      queryClient.invalidateQueries({ queryKey: ["apps"] });

      if (errors.length > 0) {
        for (const msg of errors) {
          toast.error(msg);
        }
      } else {
        toast.success("Everything synced");
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [appId, isIos, queryClient]);

  const handlePushToStore = useCallback(async () => {
    setIsPushing(true);
    try {
      const pushTasks: Promise<unknown>[] = [api.listings.publish(appId)];

      if (isIos) {
        pushTasks.push(
          api.listings.publishCategories(appId),
          api.ageRating.publish(appId),
          api.privacyDeclaration.publish(appId),
        );
      }

      const results = await Promise.allSettled(pushTasks);
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => (r.reason as Error)?.message ?? String(r.reason));

      if (errors.length > 0) {
        for (const msg of errors) {
          toast.error(msg);
        }
      } else {
        toast.success("Pushed to store");
      }
    } catch {
      toast.error("Push failed");
    } finally {
      setIsPushing(false);
      queryClient.invalidateQueries({ queryKey: ["apps"] });
    }
  }, [appId, isIos, queryClient]);

  const lastSyncedAt = app.data?.lastSyncedAt;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left nav */}
      <div className="flex w-[200px] shrink-0 flex-col border-r border-border bg-[#1a1a1a]">
        <div className="flex h-14 items-center border-b border-border px-4">
          <p className="truncate text-sm font-bold tracking-tight text-foreground">
            {app.data?.name ?? "Loading..."}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-0.5">
            {NAV_ITEMS.filter((item) => !("iosOnly" in item && item.iosOnly) || isIos).map((item) => {
              const href = `${basePath}${item.suffix}`;
              const isActive =
                currentPath.startsWith(href) && !isVersionPage;
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-[#2a2a2a] hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Version select — App Store only */}
          {isIos && (
            <>
              <div className="mx-3 my-3 h-px bg-border" />
              <div className="space-y-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg py-2 pl-2 pr-3 text-sm font-medium transition-colors",
                        isVersionPage
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-[#2a2a2a] hover:text-foreground",
                      )}
                    >
                      {selectedVersion ? (
                        <div
                          className={cn(
                            "h-4 w-1 shrink-0 rounded-full",
                            STATE_BAR_COLORS[selectedVersion.state] ??
                              "bg-muted-foreground",
                          )}
                        />
                      ) : (
                        <div className="h-4 w-1 shrink-0 rounded-full bg-muted-foreground" />
                      )}
                      <span className="flex-1 truncate text-left">
                        {selectedVersion
                          ? `Version ${selectedVersion.versionString}`
                          : "Version"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="bottom"
                    align="start"
                    className="w-[176px]"
                  >
                    {versions.isLoading && (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {versionList.map((v) => (
                      <DropdownMenuItem
                        key={v.id}
                        className="gap-2.5"
                        onSelect={() =>
                          router.push(`${basePath}/versions/${v.id}`)
                        }
                      >
                        <div
                          className={cn(
                            "h-4 w-1 shrink-0 rounded-full",
                            STATE_BAR_COLORS[v.state] ??
                              "bg-muted-foreground",
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

                {showNewVersion && (
                  <div className="flex items-center gap-1.5 px-1">
                    <Input
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="1.0.0"
                      className="h-7 text-xs"
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
                      disabled={
                        createVersion.isPending || !newVersion.trim()
                      }
                    >
                      {createVersion.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                )}

                {/* Version sub-navigation */}
                {selectedVersionId && (
                  <div className="mt-1 space-y-0.5">
                    {VERSION_NAV_ITEMS.map((item) => {
                      const href = `${basePath}/versions/${selectedVersionId}${item.suffix}`;
                      const isActive =
                        item.suffix === ""
                          ? currentPath === `${basePath}/versions/${selectedVersionId}`
                          : currentPath.startsWith(href);
                      return (
                        <Link
                          key={item.label}
                          href={href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-[#2a2a2a] text-foreground"
                              : "text-muted-foreground hover:bg-[#2a2a2a] hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Content navigation — Google Play (no version selector) */}
          {!isIos && selectedVersionId && (
            <>
              <div className="mx-3 my-3 h-px bg-border" />
              <div className="space-y-0.5">
                {VERSION_NAV_ITEMS
                  .filter((item) => !("iosOnly" in item && item.iosOnly))
                  .map((item) => {
                    const href = `${basePath}/versions/${selectedVersionId}${item.suffix}`;
                    const isActive =
                      item.suffix === ""
                        ? currentPath === `${basePath}/versions/${selectedVersionId}`
                        : currentPath.startsWith(href);
                    return (
                      <Link
                        key={item.label}
                        href={href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-[#2a2a2a] hover:text-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </>
          )}
        </nav>

        <div className="border-t border-border px-2 py-3 space-y-2">
          {isGpDraftApp && (
            <Link
              href={`${basePath}/setup`}
              className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 transition-colors hover:bg-amber-500/10"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-tight text-amber-500">
                  Setup required
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  App not yet published on GP. Click for details.
                </p>
              </div>
            </Link>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2 text-muted-foreground"
            onClick={handlePushToStore}
            disabled={isPushing || isGpDraftApp}
          >
            {isPushing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isPushing ? "Pushing..." : isIos ? "Push to App Store" : "Push as Draft"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2 text-muted-foreground"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
            />
            {isSyncing ? "Syncing..." : "Sync All"}
          </Button>
          {lastSyncedAt && (
            <p className="text-center text-[10px] text-muted-foreground">
              Last synced: {new Date(lastSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
