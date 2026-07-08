"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Loader2,
  Microscope,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Store,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { VersionDialog } from "@/components/version-dialog";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useAddGroupMember,
  useAppGroups,
  useCreateAppGroup,
  useDeleteAppGroup,
  useRemoveGroupMember,
  useReorderGroupMembers,
  useReorderGroups,
  useUpdateAppGroup,
} from "@/hooks/use-app-groups";
import { useApps } from "@/hooks/use-apps";
import {
  useDisconnectStore,
  useStores,
  useSyncStore,
} from "@/hooks/use-stores";
import { useSession } from "@/lib/auth-client";
import type { App, AppGroup } from "@/lib/types";
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

function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appboard:favorites");
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback((appId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      localStorage.setItem("appboard:favorites", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (appId: string) => favorites.has(appId),
    [favorites],
  );

  return { favorites, toggle, isFavorite };
}

function useItemOrder(storageKey: string, ids: string[]) {
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setOrder(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, [storageKey]);

  const sortedIds = useMemo(() => {
    if (order.length === 0) return ids;

    const orderMap = new Map(order.map((id, idx) => [id, idx]));
    return [...ids].sort((a, b) => {
      const aIdx = orderMap.get(a) ?? Infinity;
      const bIdx = orderMap.get(b) ?? Infinity;
      return aIdx - bIdx;
    });
  }, [ids, order]);

  const reorder = useCallback(
    (activeId: string, overId: string) => {
      const oldIndex = sortedIds.indexOf(activeId);
      const newIndex = sortedIds.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const next = [...sortedIds];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, activeId);

      setOrder(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [sortedIds, storageKey],
  );

  return { sortedIds, reorder };
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

interface AppIconProps {
  app: App;
  isActive: boolean;
  color: string;
  onColorChange: (color: string) => void;
  size?: "sm" | "md";
  isFavorite: boolean;
  onToggleFavorite: () => void;
  groups: AppGroup[];
  appGroup: { id: string; name: string } | null;
  onAddToGroup: (groupId: string) => void;
  onRemoveFromGroup: (groupId: string) => void;
  onCreateGroup: () => void;
  badgeType?: "platform" | "star";
}

function AppIcon({
  app,
  isActive,
  color,
  onColorChange,
  size = "md",
  isFavorite,
  onToggleFavorite,
  groups,
  appGroup,
  onAddToGroup,
  onRemoveFromGroup,
  onCreateGroup,
  badgeType = "platform",
}: AppIconProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const PlatformIcon = app.platform === "ios" ? Apple : Store;
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const badgeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const badgeIconClass = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  const iconContent = app.iconUrl ? (
    <img
      src={app.iconUrl}
      alt={app.name}
      className="h-full w-full rounded-xl object-cover"
      draggable={false}
    />
  ) : (
    getInitials(app.name)
  );

  const availableGroups = appGroup ? [] : groups;

  return (
    <Tooltip delayDuration={0} open={menuOpen ? false : undefined}>
      <TooltipTrigger asChild>
        <div>
          <DropdownMenu open={menuOpen} onOpenChange={(open) => { if (!open) setMenuOpen(false); }}>
            <DropdownMenuTrigger asChild>
              <div
                className="relative"
                onGotPointerCapture={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
              >
                <Link
                  href={`/apps/${app.id}/dashboard`}
                  draggable={false}
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white transition-all select-none",
                    sizeClass,
                    app.iconUrl && "overflow-hidden",
                    isActive &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-[#111111]",
                  )}
                  style={app.iconUrl ? undefined : { backgroundColor: color }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuOpen(true);
                  }}
                >
                  {iconContent}
                </Link>
                <div className={cn("pointer-events-none absolute -bottom-1.5 -right-1.5 flex items-center justify-center rounded-full bg-[#111111]", badgeClass)}>
                  {badgeType === "star" ? (
                    <Star className={cn("fill-yellow-500 text-yellow-500", badgeIconClass)} />
                  ) : (
                    <PlatformIcon className={cn("text-muted-foreground", badgeIconClass)} />
                  )}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="w-52"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuLabel className="truncate font-medium">
                {app.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={() => { onToggleFavorite(); setMenuOpen(false); }}>
                <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-500 text-yellow-500")} />
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {appGroup ? (
                <DropdownMenuItem onSelect={() => { onRemoveFromGroup(appGroup.id); setMenuOpen(false); }}>
                  <X className="h-4 w-4" />
                  Remove from {appGroup.name}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderOpen className="h-4 w-4" />
                    Add to Group
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {availableGroups.length > 0 ? (
                      availableGroups.map((g) => (
                        <DropdownMenuItem
                          key={g.id}
                          onSelect={() => { onAddToGroup(g.id); setMenuOpen(false); }}
                        >
                          {g.name}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No groups yet</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => { onCreateGroup(); setMenuOpen(false); }}>
                      <Plus className="h-4 w-4" />
                      Create Group...
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Color
              </DropdownMenuLabel>
              <div className="grid grid-cols-4 gap-1.5 px-2 pb-1.5">
                {APP_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md transition-transform hover:scale-110",
                      color === c && "ring-2 ring-white ring-offset-1 ring-offset-background",
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      onColorChange(c);
                      setMenuOpen(false);
                    }}
                  >
                    {color === c && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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
}

function SortableAppIcon(props: Omit<AppIconProps, "badgeType"> & { size?: "sm" | "md" }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "z-50 opacity-80")}
      {...attributes}
      {...listeners}
    >
      <AppIcon {...props} />
    </div>
  );
}

function SortableWrapper({ id, children }: { id: string; children: ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "z-50 opacity-80")}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function SortableGroupItem({ id, children }: { id: string; children: (handleProps: Record<string, unknown>) => ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "z-50 opacity-80")}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

function useStoreFilter(storeIds: string[]) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

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

function useCollapsedGroups() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appboard:collapsed-groups");
      if (stored) setCollapsed(new Set(JSON.parse(stored)));
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback((groupId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      localStorage.setItem("appboard:collapsed-groups", JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

function GroupHeader({
  group,
  isCollapsed,
  onToggle,
  hasActiveApp,
  isFavorite,
  onToggleFavorite,
  badgeType = "chevron",
  dragHandleProps,
}: {
  group: AppGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  hasActiveApp: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  badgeType?: "chevron" | "star";
  dragHandleProps?: Record<string, unknown>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const firstApp = group.members[0]?.app;
  const iconUrl = group.iconUrl ?? firstApp?.iconUrl;

  return (
    <div {...dragHandleProps}>
    <Tooltip delayDuration={0} open={menuOpen ? false : undefined}>
      <TooltipTrigger asChild>
        <div>
          <DropdownMenu open={menuOpen} onOpenChange={(open) => { if (!open) setMenuOpen(false); }}>
            <DropdownMenuTrigger asChild>
              <div
                className="relative"
                onGotPointerCapture={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
              >
                <Link
                  href={`/groups/${group.id}/information`}
                  draggable={false}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuOpen(true);
                  }}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white transition-all select-none overflow-hidden",
                    hasActiveApp && !isCollapsed &&
                      "ring-2 ring-primary/50 ring-offset-1 ring-offset-[#111111]",
                  )}
                  style={iconUrl ? undefined : { backgroundColor: getDefaultColor(group.id) }}
                >
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt={group.name}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    getInitials(group.name)
                  )}
                </Link>
                <div className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#111111]">
                  {badgeType === "star" ? (
                    <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
                  ) : isCollapsed ? (
                    <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="w-52"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuLabel className="truncate font-medium">
                {group.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { onToggle(); setMenuOpen(false); }}>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {isCollapsed ? "Expand" : "Collapse"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { onToggleFavorite(); setMenuOpen(false); }}>
                <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-500 text-yellow-500")} />
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p className="font-medium">{group.name}</p>
        <p className="text-xs text-muted-foreground">
          {group.members.length} app{group.members.length !== 1 ? "s" : ""}
        </p>
      </TooltipContent>
    </Tooltip>
    </div>
  );
}

function ManageGroupsDialog({
  open,
  onOpenChange,
  groups,
  allApps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: AppGroup[];
  allApps: App[];
}) {
  const createGroup = useCreateAppGroup();
  const updateGroup = useUpdateAppGroup();
  const deleteGroup = useDeleteAppGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const [newGroupName, setNewGroupName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);

  // Set of all app IDs that are already in a group
  const groupedAppIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of groups) {
      for (const m of g.members) {
        ids.add(m.appId);
      }
    }
    return ids;
  }, [groups]);

  // Available apps for adding to a group (not already in any group)
  const availableApps = useMemo(() => {
    if (!addingToGroupId) return [];
    const group = groups.find((g) => g.id === addingToGroupId);
    if (!group) return [];

    const groupPlatforms = new Set(group.members.map((m) => m.app.platform));
    return allApps.filter(
      (app) => !groupedAppIds.has(app.id) && !groupPlatforms.has(app.platform),
    );
  }, [addingToGroupId, groups, allApps, groupedAppIds]);

  const handleCreate = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await createGroup.mutateAsync({ name });
      setNewGroupName("");
      toast.success("Group created");
    } catch {
      toast.error("Failed to create group");
    }
  };

  const handleRename = async (groupId: string) => {
    const name = editName.trim();
    if (!name) return;
    try {
      await updateGroup.mutateAsync({ groupId, data: { name } });
      setEditingId(null);
      toast.success("Group renamed");
    } catch {
      toast.error("Failed to rename group");
    }
  };

  const handleDelete = async (groupId: string) => {
    try {
      await deleteGroup.mutateAsync(groupId);
      toast.success("Group deleted");
    } catch {
      toast.error("Failed to delete group");
    }
  };

  const handleAddMember = async (groupId: string, appId: string) => {
    try {
      await addMember.mutateAsync({ groupId, appId });
      toast.success("App added to group");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add app";
      toast.error(msg);
    }
  };

  const handleRemoveMember = async (groupId: string, appId: string) => {
    try {
      await removeMember.mutateAsync({ groupId, appId });
      toast.success("App removed from group");
    } catch {
      toast.error("Failed to remove app");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>App Groups</DialogTitle>
          <DialogDescription>
            Group your iOS and Android apps together.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border p-3 space-y-2"
            >
              {/* Group header */}
              <div className="flex items-center justify-between">
                {editingId === group.id ? (
                  <form
                    className="flex flex-1 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRename(group.id);
                    }}
                  >
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button type="submit" size="sm" variant="ghost" className="h-8 px-2">
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <p className="text-sm font-medium">{group.name}</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(group.id);
                          setEditName(group.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Members */}
              {group.members.length > 0 && (
                <div className="space-y-1.5">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        {member.app.iconUrl ? (
                          <img
                            src={member.app.iconUrl}
                            alt={member.app.name}
                            className="h-6 w-6 rounded-md object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                            style={{ backgroundColor: getDefaultColor(member.appId) }}
                          >
                            {getInitials(member.app.name)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium">{member.app.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {member.app.platform === "ios" ? "iOS" : "Android"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveMember(group.id, member.appId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add app button */}
              {addingToGroupId === group.id ? (
                <div className="space-y-1.5">
                  {availableApps.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">
                      No available apps to add.
                    </p>
                  ) : (
                    availableApps.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-muted/50"
                        onClick={() => {
                          handleAddMember(group.id, app.id);
                          setAddingToGroupId(null);
                        }}
                      >
                        {app.iconUrl ? (
                          <img
                            src={app.iconUrl}
                            alt={app.name}
                            className="h-6 w-6 rounded-md object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
                            style={{ backgroundColor: getDefaultColor(app.id) }}
                          >
                            {getInitials(app.name)}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium">{app.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {app.platform === "ios" ? "iOS" : "Android"}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-full text-xs"
                    onClick={() => setAddingToGroupId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs text-muted-foreground"
                  onClick={() => setAddingToGroupId(group.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add App
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Create new group */}
        <form
          className="flex items-center gap-2 pt-2 border-t"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name..."
            className="h-9 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newGroupName.trim() || createGroup.isPending}
          >
            {createGroup.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AppSidebar() {
  const currentPath = usePathname();
  const stores = useStores();
  const apps = useApps();
  const appGroupsQuery = useAppGroups();
  const syncStore = useSyncStore();
  const disconnectStore = useDisconnectStore();
  const createGroupMutation = useCreateAppGroup();
  const addMemberMutation = useAddGroupMember();
  const removeMemberMutation = useRemoveGroupMember();
  const reorderGroupsMutation = useReorderGroups();
  const reorderMembersMutation = useReorderGroupMembers();
  const [manageOpen, setManageOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [createGroupForApp, setCreateGroupForApp] = useState<string | null>(null);
  const [newGroupNameInput, setNewGroupNameInput] = useState("");
  const { getColor, setColor } = useAppColors();
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites();
  const { collapsed, toggle: toggleCollapsed } = useCollapsedGroups();
  const { data: session } = useSession();

  const storesList = stores.data ?? [];
  const appsList = apps.data ?? [];
  const groups = appGroupsQuery.data ?? [];

  const storeFilter = useStoreFilter(storesList.map((s) => s.id));
  const filteredApps = useMemo(
    () =>
      storeFilter.enabled.size === 0
        ? appsList
        : appsList.filter((a) => storeFilter.enabled.has(a.storeId)),
    [appsList, storeFilter.enabled],
  );

  // Favorite apps — from full appsList (visible regardless of store filter)
  const favoriteApps = useMemo(
    () => appsList.filter((a) => favorites.has(a.id)),
    [appsList, favorites],
  );

  // Favorite groups
  const favoriteGroups = useMemo(
    () => groups.filter((g) => favorites.has(g.id)),
    [groups, favorites],
  );

  // Combined favorite IDs for ordering (apps + groups)
  const favoriteItemIds = useMemo(
    () => [...favoriteApps.map((a) => a.id), ...favoriteGroups.map((g) => g.id)],
    [favoriteApps, favoriteGroups],
  );

  const { sortedIds: sortedFavoriteIds, reorder: reorderFavorites } =
    useItemOrder("appboard:favorites-order", favoriteItemIds);

  // Build a map of appId -> App for quick lookup (excluding favorites)
  const appsMap = useMemo(() => {
    const map = new Map<string, App>();
    for (const app of filteredApps) {
      if (!favorites.has(app.id)) {
        map.set(app.id, app);
      }
    }
    return map;
  }, [filteredApps, favorites]);

  // Map appId -> group info for context menu
  const appGroupMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const g of groups) {
      for (const m of g.members) {
        map.set(m.appId, { id: g.id, name: g.name });
      }
    }
    return map;
  }, [groups]);

  // Set of all grouped app IDs (from currently visible/filtered apps)
  const groupedAppIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of groups) {
      for (const m of g.members) {
        if (appsMap.has(m.appId)) {
          ids.add(m.appId);
        }
      }
    }
    return ids;
  }, [groups, appsMap]);

  // Ungrouped apps (filtered apps that are not in any group, excluding favorites)
  const ungroupedApps = useMemo(
    () => filteredApps.filter((a) => !groupedAppIds.has(a.id) && !favorites.has(a.id)),
    [filteredApps, groupedAppIds, favorites],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleFavoriteDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderFavorites(active.id as string, over.id as string);
    }
  };

  const handleMainDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderMain(active.id as string, over.id as string);
  };

  const handleMemberDragEnd = (groupId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const appIds = group.members.map((m) => m.appId);
    const oldIndex = appIds.indexOf(active.id as string);
    const newIndex = appIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...appIds];
    next.splice(oldIndex, 1);
    next.splice(newIndex, 0, active.id as string);
    reorderMembersMutation.mutate({ groupId, appIds: next });
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

  const handleAddToGroup = async (groupId: string, appId: string) => {
    try {
      await addMemberMutation.mutateAsync({ groupId, appId });
      toast.success("App added to group");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add app";
      toast.error(msg);
    }
  };

  const handleRemoveFromGroup = async (groupId: string, appId: string) => {
    try {
      await removeMemberMutation.mutateAsync({ groupId, appId });
      toast.success("App removed from group");
    } catch {
      toast.error("Failed to remove app");
    }
  };

  const handleCreateGroupForApp = async () => {
    const name = newGroupNameInput.trim();
    if (!name || !createGroupForApp) return;
    try {
      const group = await createGroupMutation.mutateAsync({ name });
      await addMemberMutation.mutateAsync({ groupId: group.id, appId: createGroupForApp });
      toast.success("Group created and app added");
      setCreateGroupForApp(null);
      setNewGroupNameInput("");
    } catch {
      toast.error("Failed to create group");
    }
  };

  const buildAppIconProps = useCallback(
    (app: App, overrides?: Partial<AppIconProps>): AppIconProps => ({
      app,
      isActive: currentPath.startsWith(`/apps/${app.id}`),
      color: getColor(app.id),
      onColorChange: (c: string) => setColor(app.id, c),
      isFavorite: isFavorite(app.id),
      onToggleFavorite: () => toggleFavorite(app.id),
      groups,
      appGroup: appGroupMap.get(app.id) ?? null,
      onAddToGroup: (groupId: string) => handleAddToGroup(groupId, app.id),
      onRemoveFromGroup: (groupId: string) => handleRemoveFromGroup(groupId, app.id),
      onCreateGroup: () => {
        setCreateGroupForApp(app.id);
        setNewGroupNameInput("");
      },
      ...overrides,
    }),
    [currentPath, getColor, setColor, isFavorite, toggleFavorite, groups, appGroupMap],
  );

  // Groups that have at least one visible (filtered) member (excluding favorite groups)
  const visibleGroups = useMemo(
    () =>
      groups.filter((g) =>
        !favorites.has(g.id) && g.members.some((m) => appsMap.has(m.appId)),
      ),
    [groups, appsMap],
  );

  // Combined list of non-favorite groups + ungrouped apps for unified drag
  const mainItemIds = useMemo(
    () => [
      ...visibleGroups.map((g) => g.id),
      ...ungroupedApps.map((a) => a.id),
    ],
    [visibleGroups, ungroupedApps],
  );

  const { sortedIds: sortedMainIds, reorder: reorderMain } =
    useItemOrder("appboard:main-order", mainItemIds);

  const groupIdSet = useMemo(
    () => new Set(visibleGroups.map((g) => g.id)),
    [visibleGroups],
  );

  return (
    <aside className="flex w-[72px] shrink-0 flex-col items-center border-r border-border bg-[#111111] py-3">
      {/* Top buttons: Store selector + Groups */}
      <div className="flex flex-col items-center gap-1.5 mb-3">
        {storesList.length > 0 ? (
          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a2a2a] text-muted-foreground transition-colors hover:bg-[#3a3a3a] hover:text-foreground"
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
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
              >
                <Plus className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Connect a store
            </TooltipContent>
          </Tooltip>
        )}

        {/* Groups button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a2a2a] text-muted-foreground transition-colors hover:bg-[#3a3a3a] hover:text-foreground"
              onClick={() => setGroupsOpen(true)}
            >
              <FolderOpen className="h-5 w-5" />
              {groups.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#3a3a3a] px-0.5 text-[9px] font-bold text-muted-foreground">
                  {groups.length}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            App Groups
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Divider */}
      <div className="mx-auto mb-2 h-px w-8 bg-border" />

      {/* App icons: favorites, then grouped, then ungrouped */}
      <div className="flex flex-1 flex-col items-center gap-2.5 overflow-y-auto px-2.5 pt-1">
        {apps.isLoading && (
          <Loader2 className="mt-4 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Favorites section — drag & drop sortable, mixed apps + groups */}
        {sortedFavoriteIds.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFavoriteDragEnd}
          >
            <SortableContext
              items={sortedFavoriteIds}
              strategy={verticalListSortingStrategy}
            >
              {sortedFavoriteIds.map((id) => {
                const app = appsList.find((a) => a.id === id);
                if (app) {
                  return (
                    <SortableWrapper key={id} id={id}>
                      <AppIcon
                        {...buildAppIconProps(app, { badgeType: "star" })}
                      />
                    </SortableWrapper>
                  );
                }
                const group = favoriteGroups.find((g) => g.id === id);
                if (group) {
                  const isGroupCollapsed = collapsed.has(group.id);
                  const groupApps = group.members
                    .map((m) => appsList.find((a) => a.id === m.appId))
                    .filter((a): a is App => !!a);
                  const hasActiveApp = groupApps.some((a) =>
                    currentPath.startsWith(`/apps/${a.id}`),
                  );
                  return (
                    <SortableGroupItem key={id} id={id}>
                      {(handleProps) => (
                        <div className="flex flex-col items-center gap-1.5">
                          <GroupHeader
                            group={group}
                            isCollapsed={isGroupCollapsed}
                            onToggle={() => toggleCollapsed(group.id)}
                            hasActiveApp={hasActiveApp}
                            isFavorite
                            onToggleFavorite={() => toggleFavorite(group.id)}
                            badgeType="star"
                            dragHandleProps={handleProps}
                          />
                          {!isGroupCollapsed && groupApps.length > 0 && (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleMemberDragEnd(group.id)}
                            >
                              <SortableContext
                                items={groupApps.map((a) => a.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {groupApps.map((a) => (
                                  <SortableAppIcon
                                    key={a.id}
                                    {...buildAppIconProps(a, { size: "sm" })}
                                  />
                                ))}
                              </SortableContext>
                            </DndContext>
                          )}
                        </div>
                      )}
                    </SortableGroupItem>
                  );
                }
                return null;
              })}
            </SortableContext>
          </DndContext>
        )}
        {sortedFavoriteIds.length > 0 && <div className="h-px w-6 bg-border/50" />}

        {/* Groups + ungrouped apps — unified drag & drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleMainDragEnd}
        >
          <SortableContext
            items={sortedMainIds}
            strategy={verticalListSortingStrategy}
          >
            {sortedMainIds.map((id) => {
              // Is it a group?
              if (groupIdSet.has(id)) {
                const group = visibleGroups.find((g) => g.id === id);
                if (!group) return null;
                const isGroupCollapsed = collapsed.has(group.id);
                const groupApps = group.members
                  .map((m) => appsMap.get(m.appId))
                  .filter((a): a is App => !!a);
                const hasActiveApp = groupApps.some((a) =>
                  currentPath.startsWith(`/apps/${a.id}`),
                );

                return (
                  <SortableGroupItem key={group.id} id={group.id}>
                    {(handleProps) => (
                      <div className="flex flex-col items-center gap-1.5">
                        <GroupHeader
                          group={group}
                          isCollapsed={isGroupCollapsed}
                          onToggle={() => toggleCollapsed(group.id)}
                          hasActiveApp={hasActiveApp}
                          isFavorite={isFavorite(group.id)}
                          onToggleFavorite={() => toggleFavorite(group.id)}
                          dragHandleProps={handleProps}
                        />
                        {!isGroupCollapsed && groupApps.length > 0 && (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleMemberDragEnd(group.id)}
                          >
                            <SortableContext
                              items={groupApps.map((a) => a.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {groupApps.map((app) => (
                                <SortableAppIcon
                                  key={app.id}
                                  {...buildAppIconProps(app, { size: "sm" })}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        )}
                        <div className="h-px w-6 bg-border/50" />
                      </div>
                    )}
                  </SortableGroupItem>
                );
              }

              // It's an ungrouped app
              const app = ungroupedApps.find((a) => a.id === id);
              if (!app) return null;
              return (
                <SortableAppIcon
                  key={app.id}
                  {...buildAppIconProps(app)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* Bottom: Research + Settings + Version */}
      <div className="mt-2 flex flex-col items-center gap-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/research"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                currentPath.startsWith("/research")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-[#2a2a2a] hover:text-foreground",
              )}
            >
              <Microscope className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Research
          </TooltipContent>
        </Tooltip>
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
        <VersionDialog />
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
            <Link href="/onboarding" onClick={() => setManageOpen(false)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Another Store
            </Link>
          </Button>
        </DialogContent>
      </Dialog>

      {/* Manage groups dialog */}
      <ManageGroupsDialog
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        groups={groups}
        allApps={appsList}
      />

      {/* Create group for app dialog */}
      <Dialog
        open={createGroupForApp !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateGroupForApp(null);
            setNewGroupNameInput("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Create a new group and add the app to it.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateGroupForApp();
            }}
          >
            <Input
              value={newGroupNameInput}
              onChange={(e) => setNewGroupNameInput(e.target.value)}
              placeholder="Group name..."
              className="h-9 text-sm"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newGroupNameInput.trim() || createGroupMutation.isPending}
            >
              {createGroupMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Create
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
