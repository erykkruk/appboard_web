"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudCog,
  CreditCard,
  Lock,
  LogOut,
  MessageSquareText,
  Settings,
  ToggleLeft,
} from "lucide-react";

import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "General", icon: Settings, href: "/settings" },
  { label: "Features", icon: ToggleLeft, href: "/settings/features" },
  { label: "Prompts", icon: MessageSquareText, href: "/settings/prompts" },
  { label: "Monetization", icon: CreditCard, href: "/settings/monetization" },
  { label: "Privacy Templates", icon: Lock, href: "/settings/templates" },
  { label: "Google Play Setup", icon: CloudCog, href: "/settings/google-play-setup" },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPath = usePathname();

  return (
    <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
      {/* Below md this column becomes a horizontally scrollable tab strip on
          top of the content instead of a second sidebar. */}
      <div className="flex w-full shrink-0 flex-col border-b border-border bg-[#1a1a1a] md:w-[200px] md:border-b-0 md:border-r">
        <div className="hidden h-14 items-center border-b border-border px-4 md:flex">
          <p className="truncate text-sm font-bold tracking-tight text-foreground">
            Settings
          </p>
        </div>

        <nav className="px-2 py-3 md:flex-1 md:overflow-y-auto">
          <div className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5 md:overflow-x-visible">
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
                    "flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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

        <div className="border-t border-border px-2 py-3">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[#2a2a2a] hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
