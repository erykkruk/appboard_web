"use client";

import packageJson from "../../package.json";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { useSession } from "@/lib/auth-client";
import type { App } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORE_ICONS: Record<string, typeof Apple> = {
  app_store: Apple,
  google_play: Store,
};

const APP_COLORS = [
  "#e11d48", "#db2777", "#c026d3", "#9333ea", "#7c3aed", "#4f46e5",
  "#2563eb", "#0284c7", "#0891b2", "#0d9488", "#059669", "#16a34a",
  "#65a30d", "#ca8a04", "#ea580c", "#dc2626",
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

function useAppOrder(apps: App[]) {
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appboard:app-order");
      if (stored) setOrder(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const sortedApps = useMemo(() => {
    if (order.length === 0) return apps;

    const orderMap = new Map(order.map((id, idx) => [id, idx]));
    return [...apps].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? Infinity;
      const bIdx = orderMap.get(b.id) ?? Infinity;
      return aIdx - bIdx;
    });
  }, [apps, order]);

  const reorder = useCallback(
    (activeId: string, overId: string) => {
      const ids = sortedApps.map((a) => a.id);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const next = [...ids];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, activeId);

      setOrder(next);
      localStorage.setItem("appboard:app-order", JSON.stringify(next));
    },
    [sortedApps],
  );

  return { sortedApps, reorder };
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

function SortableAppIcon({
  app,
  isActive,
  color,
  onColorChange,
}: {
  app: App;
  isActive: boolean;
  color: string;
  onColorChange: (color: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <div ref={setNodeRef} style={style} {...attributes}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div>
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <div
                  className="relative"
                  onPointerDown={(e) => {
                    if (e.button === 0) e.stopPropagation();
                  }}
                >
                  <Link
                    href={`/apps/${app.id}/dashboard`}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white transition-all select-none",
                      app.iconUrl && "overflow-hidden",
                      isDragging && "z-50 opacity-80 shadow-lg ring-2 ring-primary",
                      !isDragging && isActive
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-[#111111]"
                        : !isDragging && "opacity-60 hover:opacity-100",
                    )}
                    style={app.iconUrl ? undefined : { backgroundColor: color }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuOpen(true);
                    }}
                    {...listeners}
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
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <p className="font-medium">{app.name}</p>
          <p className="text-xs text-muted-foreground">
            {app.platform === "ios" ? "App Store" : "Google Play"}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function useStoreFilter(storeIds: string[]) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("appboard:store-filter");
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setEnabled(new Set(parsed));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // When stores load for the first time and nothing is saved, enable all
  useEffect(() => {
    if (!loaded || storeIds.length === 0) return;
    setEnabled((prev) => {
      if (prev.size > 0) return prev;
      return new Set(storeIds);
    });
  }, [loaded, storeIds]);

  const toggle = useCallback((storeId: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        // Don't allow deselecting all — keep at least one
        if (next.size <= 1) return prev;
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      localStorage.setItem("appboard:store-filter", JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { enabled, toggle };
}

export function AppSidebar() {
  const currentPath = usePathname();
  const stores = useStores();
  const apps = useApps();
  const syncStore = useSyncStore();
  const disconnectStore = useDisconnectStore();
  const [manageOpen, setManageOpen] = useState(false);
  const { getColor, setColor } = useAppColors();
  const { data: session } = useSession();

  const storesList = stores.data ?? [];
  const appsList = apps.data ?? [];

  const storeFilter = useStoreFilter(storesList.map((s) => s.id));
  const filteredApps = useMemo(
    () =>
      storeFilter.enabled.size === 0
        ? appsList
        : appsList.filter((a) => storeFilter.enabled.has(a.storeId)),
    [appsList, storeFilter.enabled],
  );
  const { sortedApps, reorder } = useAppOrder(filteredApps);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorder(active.id as string, over.id as string);
    }
  };

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
                  className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a2a2a] text-muted-foreground transition-colors hover:bg-[#3a3a3a] hover:text-foreground"
                >
                  <Store className="h-5 w-5" />
                  {storesList.length > 1 && (
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold",
                        storeFilter.enabled.size < storesList.length
                          ? "bg-primary text-primary-foreground"
                          : "bg-[#3a3a3a] text-muted-foreground",
                      )}
                    >
                      {storeFilter.enabled.size}/{storesList.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Stores ({storeFilter.enabled.size}/{storesList.length})
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-56">
            {storesList.map((store) => {
              const Icon = STORE_ICONS[store.type] ?? Store;
              const isChecked = storeFilter.enabled.has(store.id);
              return (
                <DropdownMenuItem
                  key={store.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    storeFilter.toggle(store.id);
                  }}
                  className="gap-3"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isChecked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {isChecked && <Check className="h-3 w-3" />}
                  </div>
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{store.name}</p>
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

      {/* App icons — drag & drop sortable */}
      <div className="flex flex-1 flex-col items-center gap-2.5 overflow-y-auto px-1 pt-1">
        {apps.isLoading && (
          <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedApps.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedApps.map((app) => {
              const isActive = currentPath.startsWith(`/apps/${app.id}`);
              return (
                <SortableAppIcon
                  key={app.id}
                  app={app}
                  isActive={isActive}
                  color={getColor(app.id)}
                  onColorChange={(c) => setColor(app.id, c)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* Bottom: Settings + Version */}
      <div className="mt-2 flex flex-col items-center gap-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/settings"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                currentPath.startsWith("/settings")
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
        <span className="text-[10px] text-muted-foreground/50">v{packageJson.version}</span>
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
