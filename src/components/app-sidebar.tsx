"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Apple,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApps } from "@/hooks/use-apps";
import {
  useDisconnectStore,
  useStores,
  useSyncStore,
} from "@/hooks/use-stores";
import { cn } from "@/lib/utils";

const STORE_ICONS: Record<string, typeof Apple> = {
  app_store: Apple,
  google_play: Store,
};

const APP_COLORS = [
  "#e11d48", // rose
  "#db2777", // pink
  "#c026d3", // fuchsia
  "#9333ea", // purple
  "#7c3aed", // violet
  "#4f46e5", // indigo
  "#2563eb", // blue
  "#0284c7", // sky
  "#0891b2", // cyan
  "#0d9488", // teal
  "#059669", // emerald
  "#16a34a", // green
  "#65a30d", // lime
  "#ca8a04", // yellow
  "#ea580c", // orange
  "#dc2626", // red
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDefaultColor(appId: string): string {
  return APP_COLORS[hashString(appId) % APP_COLORS.length];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function useAppColors() {
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appboard:app-colors");
      if (stored) setColors(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const setColor = useCallback((appId: string, color: string) => {
    setColors((prev) => {
      const next = { ...prev, [appId]: color };
      localStorage.setItem("appboard:app-colors", JSON.stringify(next));
      return next;
    });
  }, []);

  const getColor = useCallback(
    (appId: string) => colors[appId] || getDefaultColor(appId),
    [colors],
  );

  return { getColor, setColor };
}

function formatDate(date: string | null) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AppIcon({
  app,
  isActive,
  color,
  onColorChange,
}: {
  app: { id: string; name: string; iconUrl?: string | null; platform: string };
  isActive: boolean;
  color: string;
  onColorChange: (color: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const iconContent = app.iconUrl ? (
    <img
      src={app.iconUrl}
      alt={app.name}
      className="h-full w-full rounded-xl object-cover"
    />
  ) : (
    getInitials(app.name)
  );

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <div
          className="relative"
          onPointerDown={(e) => {
            // Prevent Popover from toggling on left-click — only right-click opens it
            if (e.button === 0) e.stopPropagation();
          }}
        >
          <Link
            href={`/apps/${app.id}/dashboard`}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white transition-all select-none",
              app.iconUrl && "overflow-hidden",
              isActive
                ? "ring-2 ring-primary ring-offset-2 ring-offset-[#111111]"
                : "opacity-60 hover:opacity-100",
            )}
            style={app.iconUrl ? undefined : { backgroundColor: color }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuOpen(true);
            }}
          >
            {iconContent}
          </Link>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-auto p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
          Choose color
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {APP_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-transform hover:scale-110",
                color === c && "ring-2 ring-white ring-offset-1 ring-offset-background",
              )}
              style={{ backgroundColor: c }}
              onClick={() => {
                onColorChange(c);
                setMenuOpen(false);
              }}
            >
              {color === c && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppSidebar() {
  const currentPath = usePathname();
  const stores = useStores();
  const apps = useApps();
  const syncStore = useSyncStore();
  const disconnectStore = useDisconnectStore();
  const [manageOpen, setManageOpen] = useState(false);
  const { getColor, setColor } = useAppColors();

  const storesList = stores.data ?? [];
  const appsList = apps.data ?? [];

  const handleSync = async (storeId: string) => {
    try {
      await syncStore.mutateAsync(storeId);
      toast.success("Store synced");
    } catch {
      toast.error("Failed to sync store");
    }
  };

  const handleDisconnect = async (storeId: string) => {
    try {
      await disconnectStore.mutateAsync(storeId);
      toast.success("Store disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <aside className="flex w-[72px] shrink-0 flex-col items-center border-r border-border bg-[#111111] py-3">
      {/* Store selector at top */}
      {storesList.length > 0 ? (
        <DropdownMenu>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a2a2a] text-muted-foreground transition-colors hover:bg-[#3a3a3a] hover:text-foreground"
                >
                  {(() => {
                    const Icon = STORE_ICONS[storesList[0].type] ?? Store;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {storesList[0].name}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-56">
            {storesList.map((store) => {
              const Icon = STORE_ICONS[store.type] ?? Store;
              return (
                <DropdownMenuItem key={store.id} className="gap-3">
                  <Icon className="h-4 w-4" />
                  <div>
                    <p className="font-medium">{store.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {store.type === "app_store" ? "App Store" : "Google Play"}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full"
                onClick={() => setManageOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Manage Stores
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/onboarding">
                <Plus className="mr-2 h-4 w-4" />
                Add Store
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/onboarding"
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Connect a store
          </TooltipContent>
        </Tooltip>
      )}

      {/* Divider */}
      <div className="mx-auto mb-2 h-px w-8 bg-border" />

      {/* App icons */}
      <div className="flex flex-1 flex-col items-center gap-2.5 overflow-y-auto px-1">
        {apps.isLoading && (
          <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {appsList.map((app) => {
          const isActive = currentPath.startsWith(`/apps/${app.id}`);
          return (
            <Tooltip key={app.id} delayDuration={0}>
              <TooltipTrigger asChild>
                <div>
                  <AppIcon
                    app={app}
                    isActive={isActive}
                    color={getColor(app.id)}
                    onColorChange={(c) => setColor(app.id, c)}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p className="font-medium">{app.name}</p>
                <p className="text-xs text-muted-foreground">
                  {app.platform === "ios" ? "App Store" : "Google Play"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Bottom: Settings */}
      <div className="mt-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                currentPath === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-[#2a2a2a] hover:text-foreground",
              )}
            >
              <Settings className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Settings
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Manage stores dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connected Stores</DialogTitle>
            <DialogDescription>
              Manage your connected store accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {storesList.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2a2a2a] text-xs font-bold text-muted-foreground">
                    {store.type === "google_play" ? "GP" : "AS"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{store.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Synced: {formatDate(store.lastSyncedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSync(store.id)}
                    disabled={syncStore.isPending}
                  >
                    {syncStore.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDisconnect(store.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button asChild className="w-full">
            <Link href="/onboarding">
              <Plus className="mr-2 h-4 w-4" />
              Add Another Store
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
