"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Circle,
  LayoutDashboard,
  Loader2,
  Plus,
  Rocket,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/hooks/use-apps";
import { useCreateVersion, useVersions } from "@/hooks/use-publishing";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, suffix: "/dashboard" },
  { label: "Publish", icon: Rocket, suffix: "/publish" },
  { label: "Reviews", icon: Star, suffix: "/reviews" },
] as const;

const STATE_COLORS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "text-yellow-400",
  READY_FOR_SALE: "text-green-400",
  WAITING_FOR_REVIEW: "text-blue-400",
  IN_REVIEW: "text-blue-400",
  DEVELOPER_REJECTED: "text-orange-400",
  REJECTED: "text-red-400",
  PENDING_DEVELOPER_RELEASE: "text-purple-400",
};

const STATE_LABELS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "Draft",
  READY_FOR_SALE: "Live",
  WAITING_FOR_REVIEW: "In Review",
  IN_REVIEW: "In Review",
  DEVELOPER_REJECTED: "Rejected",
  REJECTED: "Rejected",
  PENDING_DEVELOPER_RELEASE: "Pending Release",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const currentPath = usePathname();
  const app = useApp(appId);
  const versions = useVersions(appId);
  const createVersion = useCreateVersion(appId);
  const [newVersion, setNewVersion] = useState("");
  const [showNewVersion, setShowNewVersion] = useState(false);

  const basePath = `/apps/${appId}`;

  const versionList = versions.data ?? [];
  const draftVersion = versionList.find((v) => v.isEditable);
  const isIos = app.data?.platform === "ios";

  const handleCreateVersion = async () => {
    if (!newVersion.trim()) return;
    try {
      await createVersion.mutateAsync(newVersion.trim());
      toast.success(`Version ${newVersion.trim()} created`);
      setNewVersion("");
      setShowNewVersion(false);
    } catch {
      toast.error("Failed to create version");
    }
  };

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
            {NAV_ITEMS.map((item) => {
              const href = `${basePath}${item.suffix}`;
              const isActive = currentPath.startsWith(href);
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

          {/* Versions section — App Store only */}
          {isIos && (
            <>
              <div className="mx-3 my-3 h-px bg-border" />
              <div className="px-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Versions
                  </p>
                  {!draftVersion && !showNewVersion && (
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setShowNewVersion(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {showNewVersion && (
                  <div className="mb-2 flex items-center gap-1.5">
                    <Input
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="1.0.0"
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateVersion();
                        if (e.key === "Escape") setShowNewVersion(false);
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

                {versions.isLoading && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}

                <div className="space-y-0.5">
                  {versionList.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-md px-1 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Circle
                          className={cn(
                            "h-2 w-2 fill-current",
                            STATE_COLORS[v.state] ?? "text-muted-foreground",
                          )}
                        />
                        <span className="font-medium text-foreground">
                          {v.versionString}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px]",
                          STATE_COLORS[v.state] ?? "text-muted-foreground",
                        )}
                      >
                        {STATE_LABELS[v.state] ?? v.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
