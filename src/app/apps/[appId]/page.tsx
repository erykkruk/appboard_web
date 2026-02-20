"use client";

import { useParams } from "next/navigation";
import { Globe, Package, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/hooks/use-apps";
import { useListings } from "@/hooks/use-listings";
import { useReviewStats } from "@/hooks/use-reviews";

export default function AppOverview() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const app = useApp(appId);
  const listings = useListings(appId);
  const stats = useReviewStats(appId);

  if (!app.data) return null;

  return (
    <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" />
            App Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{app.data.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bundle ID</span>
            <span className="font-mono text-xs">{app.data.bundleId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform</span>
            <Badge
              variant={
                app.data.platform === "android" ? "default" : "secondary"
              }
            >
              {app.data.platform === "android"
                ? "Google Play"
                : "App Store"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Listings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Languages</span>
            <span className="font-medium">
              {listings.data?.length ?? "..."}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Reviews
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Average Rating</span>
            <span className="font-medium">
              {stats.data?.averageRating?.toFixed(1) ?? "..."}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Reviews</span>
            <span className="font-medium">
              {stats.data?.totalReviews ?? "..."}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
