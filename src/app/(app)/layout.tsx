"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { VaultProvider } from "@/components/vault/vault-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <VaultProvider>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          {/* Content column scrolls whenever a page exceeds the viewport height.
              Nested layouts (apps/[appId], settings) fill this exactly and keep
              their own inner scroll, so they never double-scroll. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </div>
        </div>
      </TooltipProvider>
    </VaultProvider>
  );
}
