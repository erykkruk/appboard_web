"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { LayoutDashboard, Rocket, Star } from "lucide-react";

import { useApp } from "@/hooks/use-apps";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, suffix: "/dashboard" },
  { label: "Publish", icon: Rocket, suffix: "/publish" },
  { label: "Reviews", icon: Star, suffix: "/reviews" },
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
    <div className="flex flex-1 overflow-hidden">
      {/* Left nav — like Slack's Home/DMs/Activity */}
      <div className="flex w-[200px] shrink-0 flex-col border-r border-border bg-[#1a1a1a]">
        <div className="flex h-14 items-center border-b border-border px-4">
          <p className="truncate text-sm font-bold tracking-tight text-foreground">
            {app.data?.name ?? "Loading..."}
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
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
        </nav>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
