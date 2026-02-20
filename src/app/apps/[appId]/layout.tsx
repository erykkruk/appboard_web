"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Clock, FileText, Image, LayoutDashboard, Smartphone, Star } from "lucide-react";
import { use } from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/hooks/use-apps";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", icon: LayoutDashboard, suffix: "", exact: true },
  { label: "Listings", icon: FileText, suffix: "/listings", exact: false },
  { label: "Assets", icon: Image, suffix: "/assets", exact: false },
  { label: "Reviews", icon: Star, suffix: "/reviews", exact: false },
  { label: "History", icon: Clock, suffix: "/history", exact: false },
] as const;

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const currentPath = usePathname();
  const app = useApp(appId);

  const basePath = `/apps/${appId}`;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={app.data?.name ?? "App"}
        action={
          app.data && (
            <Badge
              variant={
                app.data.platform === "android" ? "default" : "secondary"
              }
            >
              {app.data.platform === "android"
                ? "Google Play"
                : "App Store"}
            </Badge>
          )
        }
      />

      {app.isLoading && (
        <div className="p-6">
          <Skeleton className="mb-4 h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {app.isError && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Failed to load app. Please try again.
          </p>
        </div>
      )}

      {app.data && (
        <>
          <div className="flex items-center gap-4 border-b px-6 pt-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
              {app.data.iconUrl ? (
                <img
                  src={app.data.iconUrl}
                  alt={app.data.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Smartphone className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{app.data.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {app.data.bundleId}
              </p>
            </div>
          </div>

          <nav className="flex border-b px-6">
            {TABS.map((tab) => {
              const href = `${basePath}${tab.suffix}`;
              const isActive = tab.exact
                ? currentPath === href || currentPath === `${href}/`
                : currentPath.startsWith(href);
              return (
                <Link
                  key={tab.label}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
