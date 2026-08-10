"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { SelfHostedCommunityPopup } from "@/components/community-popup";
import { PostHogIdentify } from "@/components/posthog-identify";
import { VaultProvider } from "@/components/vault/vault-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <VaultProvider>
      <PostHogIdentify />
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          {/* Content column scrolls whenever a page exceeds the viewport height.
              Nested layouts (apps/[appId], settings) fill this exactly and keep
              their own inner scroll, so they never double-scroll. */}
          {/* pt-14 clears the fixed mobile top bar rendered by AppSidebar. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-14 md:pt-0">
            {children}
          </div>
        </div>
        <SelfHostedCommunityPopup />
      </TooltipProvider>
    </VaultProvider>
  );
}
