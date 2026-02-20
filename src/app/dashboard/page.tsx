"use client";

import Link from "next/link";
import {
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Smartphone,
  Store,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApps } from "@/hooks/use-apps";
import {
  useDisconnectStore,
  useStores,
  useSyncStore,
} from "@/hooks/use-stores";

function formatDate(date: string | null) {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-lg border-dashed">
        <CardHeader className="items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Store className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">No store connected</CardTitle>
          <CardDescription className="max-w-sm text-base">
            Connect your Google Play or App Store account to start managing your
            apps, listings, reviews, and assets from one place.
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

function ManageStoresDialog({
  storesList,
  onSync,
  onDisconnect,
  isSyncing,
}: {
  storesList: { id: string; name: string; type: string; lastSyncedAt: string | null }[];
  onSync: (id: string) => void;
  onDisconnect: (id: string) => void;
  isSyncing: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2 className="mr-2 h-4 w-4" />
          Manage Stores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connected Stores</DialogTitle>
          <DialogDescription>
            Manage your connected store accounts. You can sync or disconnect them.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {storesList.map((store) => (
            <div
              key={store.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold">
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
                  onClick={() => onSync(store.id)}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDisconnect(store.id)}
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
  );
}

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const stores = useStores();
  const apps = useApps();
  const syncStore = useSyncStore();
  const disconnectStore = useDisconnectStore();

  const filteredApps = (apps.data ?? []).filter((app) =>
    `${app.name} ${app.bundleId}`.toLowerCase().includes(search.toLowerCase()),
  );

  const hasStores = (stores.data ?? []).length > 0;
  const isLoading = stores.isLoading || apps.isLoading;
  const isError = stores.isError && apps.isError;

  const handleSync = async (storeId: string) => {
    try {
      await syncStore.mutateAsync(storeId);
      toast.success("Store synced successfully");
    } catch {
      toast.error("Failed to sync store");
    }
  };

  const handleDisconnect = async (storeId: string) => {
    try {
      await disconnectStore.mutateAsync(storeId);
      toast.success("Store disconnected");
    } catch {
      toast.error("Failed to disconnect store");
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Your Apps"
        action={
          hasStores ? (
            <ManageStoresDialog
              storesList={stores.data ?? []}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
              isSyncing={syncStore.isPending}
            />
          ) : undefined
        }
      />
      <div className="flex flex-1 flex-col p-6">
        {isLoading && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {isError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Smartphone className="h-8 w-8 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-medium">Cannot connect to backend</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Make sure the backend server is running on port 3001.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                stores.refetch();
                apps.refetch();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && !hasStores && <EmptyState />}

        {!isLoading && !isError && hasStores && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                  <Store className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Connected Stores
                    </p>
                    <p className="text-2xl font-bold">
                      {stores.data?.length ?? 0}
                    </p>
                  </div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Apps</p>
                    <p className="text-2xl font-bold">
                      {apps.data?.length ?? 0}
                    </p>
                  </div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="text-sm font-bold">
                      {formatDate(
                        stores.data
                          ?.map((s) => s.lastSyncedAt)
                          .filter(Boolean)
                          .sort()
                          .reverse()[0] ?? null,
                      )}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredApps.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No apps found matching your search.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredApps.map((app) => (
                <Card
                  key={app.id}
                  className="cursor-pointer transition-colors hover:border-primary"
                >
                  <Link
                    href={`/apps/${app.id}`}
                    className="block"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                          {app.iconUrl ? (
                            <img
                              src={app.iconUrl}
                              alt={app.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Smartphone className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base">
                            {app.name}
                          </CardTitle>
                          <CardDescription className="truncate text-xs">
                            {app.bundleId}
                          </CardDescription>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge
                              variant={
                                app.platform === "android"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {app.platform === "android"
                                ? "Android"
                                : "iOS"}
                            </Badge>
                            {app.store && (
                              <span className="text-xs text-muted-foreground">
                                {app.store.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
