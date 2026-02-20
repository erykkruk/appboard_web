"use client";

import Link from "next/link";
import { ExternalLink, Plus, Smartphone, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApps } from "@/hooks/use-apps";
import { useStores } from "@/hooks/use-stores";

export default function DashboardPage() {
  const stores = useStores();
  const apps = useApps();

  const hasStores = (stores.data ?? []).length > 0;
  const hasApps = (apps.data ?? []).length > 0;

  if (stores.isLoading) return null;

  if (!hasStores) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-lg border-dashed">
          <CardHeader className="items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#2a2a2a]">
              <Store className="h-10 w-10 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">No store connected</CardTitle>
            <CardDescription className="max-w-sm text-base">
              Connect your Google Play or App Store account to start managing
              your apps.
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

  if (!hasApps) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <Smartphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-semibold">No apps found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sync your stores to discover apps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="text-center">
        <Smartphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold">Select an app</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose an app from the sidebar to get started.
        </p>
      </div>
    </div>
  );
}
