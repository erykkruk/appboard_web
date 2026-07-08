"use client";

import { useParams } from "next/navigation";
import { Apple, Download, MessageSquare, Package, Star, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/hooks/use-apps";
import { usePublishingOverview } from "@/hooks/use-publishing";
import { useReviewStats } from "@/hooks/use-reviews";

const VERSION_STATE_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PREPARE_FOR_SUBMISSION: { label: "Prepare for Submission", variant: "outline" },
  WAITING_FOR_REVIEW: { label: "Waiting for Review", variant: "secondary" },
  IN_REVIEW: { label: "In Review", variant: "secondary" },
  READY_FOR_SALE: { label: "Ready for Sale", variant: "default" },
  DEVELOPER_REJECTED: { label: "Developer Rejected", variant: "destructive" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  PENDING_DEVELOPER_RELEASE: { label: "Pending Developer Release", variant: "secondary" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= Math.round(rating)
              ? "fill-yellow-500 text-yellow-500"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function AppDashboardPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const app = useApp(appId);
  const overview = usePublishingOverview(appId);
  const reviewStats = useReviewStats(appId);

  if (app.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!app.data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">App not found.</p>
      </div>
    );
  }

  if (overview.isError || reviewStats.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-destructive">Failed to load data. Please try again.</p>
      </div>
    );
  }

  const data = app.data;
  const isIos = data.platform === "ios";
  const version = overview.data?.version;
  const stats = reviewStats.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* App header */}
      <div className="flex items-center gap-4">
        {data.iconUrl ? (
          <img
            src={data.iconUrl}
            alt={data.name}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2a2a2a] text-2xl font-bold text-muted-foreground">
            {data.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">{data.bundleId}</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          {isIos ? (
            <Apple className="h-3.5 w-3.5" />
          ) : (
            <Store className="h-3.5 w-3.5" />
          )}
          {isIos ? "App Store" : "Google Play"}
        </Badge>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Version */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="h-4 w-4" />
              Current Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : version ? (
              <div className="space-y-1">
                <p className="text-2xl font-semibold tracking-tight">
                  {version.versionString}
                </p>
                <Badge
                  variant={
                    VERSION_STATE_LABELS[version.state]?.variant ?? "outline"
                  }
                  className="text-xs"
                >
                  {VERSION_STATE_LABELS[version.state]?.label ?? version.state}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No version info</p>
            )}
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewStats.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : stats ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold tracking-tight">
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <StarRating rating={stats.averageRating} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalReviews} total
                  {stats.noReplyCount > 0 && (
                    <span className="text-amber-500">
                      {" "}&middot; {stats.noReplyCount} unanswered
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rating distribution */}
      {stats && stats.totalReviews > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.distribution[rating] ?? 0;
              const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="w-4 text-right text-xs font-medium text-muted-foreground">
                    {rating}
                  </span>
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-yellow-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending changes summary */}
      {overview.data?.hasPendingChanges && (
        <Card className="border-amber-500/20">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Download className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Pending changes</p>
              <p className="text-xs text-muted-foreground">
                {overview.data.listings.count} listing change(s),{" "}
                {overview.data.assets.count} asset change(s) ready to publish.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
