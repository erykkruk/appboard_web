"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from "@/components/top-nav";
import { SelfHostedCommunityPopup } from "@/components/community-popup";
import { PostHogIdentify } from "@/components/posthog-identify";
import { VaultProvider } from "@/components/vault/vault-provider";
import { AppSelectionProvider } from "@/lib/app-selection-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <VaultProvider>
      <PostHogIdentify />
      <AppSelectionProvider>
        <TooltipProvider>
          <div className="flex h-screen flex-col overflow-hidden">
            <TopNav />
            {/* Content column scrolls whenever a page exceeds the viewport
                height. Nested layouts (apps/[appId], settings) fill this exactly
                and keep their own inner scroll, so they never double-scroll. */}
            {/* pb-24 keeps the floating community bar from sitting on top of
                whatever a page puts last, which is usually its primary button. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-24">
              {children}
            </div>
          </div>
          <SelfHostedCommunityPopup />
        </TooltipProvider>
      </AppSelectionProvider>
    </VaultProvider>
  );
}
