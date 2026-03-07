"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Info, Settings } from "lucide-react";

import { useAppGroups } from "@/hooks/use-app-groups";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Information", icon: Info, suffix: "/information" },
  { label: "Settings", icon: Settings, suffix: "/settings" },
] as const;

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const currentPath = usePathname();
  const groups = useAppGroups();

  const group = groups.data?.find((g) => g.id === groupId);
  const basePath = `/groups/${groupId}`;

  const firstApp = group?.members[0]?.app;
  const iconUrl = group?.iconUrl ?? firstApp?.iconUrl;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left nav */}
      <div className="flex w-[200px] shrink-0 flex-col border-r border-border bg-[#1a1a1a]">
        <div className="flex h-14 items-center gap-3 border-b border-border px-4">
          {iconUrl && (
            <img
              src={iconUrl}
              alt={group?.name ?? ""}
              className="h-8 w-8 rounded-lg object-cover"
            />
          )}
          <p className="truncate text-sm font-bold tracking-tight text-foreground">
            {group?.name ?? "Loading..."}
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

          {/* Group members */}
          {group && group.members.length > 0 && (
            <>
              <div className="mx-3 my-3 h-px bg-border" />
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Apps
              </p>
              <div className="space-y-1">
                {group.members.map((member) => (
                  <Link
                    key={member.id}
                    href={`/apps/${member.appId}/information`}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-[#2a2a2a] hover:text-foreground"
                  >
                    {member.app.iconUrl ? (
                      <img
                        src={member.app.iconUrl}
                        alt={member.app.name}
                        className="h-5 w-5 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[8px] font-bold">
                        {member.app.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate text-xs">{member.app.name}</span>
                  </Link>
                ))}
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
