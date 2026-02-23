"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, MessageSquareText, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "General", icon: Settings, href: "/settings" },
  { label: "Prompts", icon: MessageSquareText, href: "/settings/prompts" },
  { label: "Privacy Templates", icon: Lock, href: "/settings/templates" },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPath = usePathname();

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex w-[200px] shrink-0 flex-col border-r border-border bg-[#1a1a1a]">
        <div className="flex h-14 items-center border-b border-border px-4">
          <p className="truncate text-sm font-bold tracking-tight text-foreground">
            Settings
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/settings"
                  ? currentPath === "/settings"
                  : currentPath.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
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
        </nav>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
