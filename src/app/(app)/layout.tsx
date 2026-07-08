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
          <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </TooltipProvider>
    </VaultProvider>
  );
}
