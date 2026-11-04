"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bot,
  KeyRound,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RatingOverview } from "@/components/reviews/rating-overview";
import { StarRating } from "@/components/reviews/stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiUnlockCard } from "@/components/ai-unlock-card";
import { isLocalApp } from "@/lib/apps";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useDraftReply } from "@/hooks/use-ai";
import { useApp } from "@/hooks/use-apps";
import {
  useRatingsSummary,
  useRefreshRatings,
  useReplyToReview,
  useReviewStats,
  useReviews,
  useSyncReviews,
} from "@/hooks/use-reviews";
import { countryName, storeLabel } from "@/lib/ratings";
import type { Review, ReviewScope } from "@/lib/types";

function ReviewCard({
  review,
  appName,
  appId,
  canReply,
  storeType,
  showAppName = false,
}: {
  review: Review;
  appName: string;
  appId: string;
  canReply: boolean;
  storeType?: string;
  showAppName?: boolean;
}) {
  const [replyText, setReplyText] = useState(review.replyText ?? "");
  const [isReplying, setIsReplying] = useState(false);
  const replyMutation = useReplyToReview();
  const draftReply = useDraftReply();

  const handleReply = async () => {
    try {
      await replyMutation.mutateAsync({
        // In the group view the review can belong to another app record.
        appId: review.appId || appId,
        reviewId: review.id,
        text: replyText,
      });
      setIsReplying(false);
      toast.success("Reply sent");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Failed to send reply",
      );
    }
  };

  // Without a store integration the reply cannot be SENT from here, but it
  // can still be written: draft it, copy it, paste it in the console.
  const [copyDraft, setCopyDraft] = useState<string | null>(null);
  const handleDraftToCopy = async () => {
    try {
      const result = await draftReply.mutateAsync({
        reviewText: `${review.title ?? ""} ${review.body}`,
        rating: review.rating,
        appName,
      });
      setCopyDraft(result.result);
    } catch {
      toast.error("Failed to generate AI draft");
    }
  };
  const copyToClipboard = async () => {
    if (!copyDraft) return;
    try {
      await navigator.clipboard.writeText(copyDraft);
      toast.success("Copied - paste it in the store console");
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleAiDraft = async () => {
    try {
      const result = await draftReply.mutateAsync({
        reviewText: `${review.title ?? ""} ${review.body}`,
        rating: review.rating,
        appName,
      });
      setReplyText(result.result);
      setIsReplying(true);
    } catch {
      toast.error("Failed to generate AI draft");
    }
  };

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="pt-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size={14} />
              <Badge variant="outline" className="text-xs">
                {storeLabel(review.storeType)}
              </Badge>
              {review.country && (
                <Badge variant="secondary" className="text-xs">
                  {countryName(review.country)}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium">{review.authorName}</p>
            <div className="flex gap-3 text-xs text-muted-foreground">
              {showAppName && review.appName && <span>{review.appName}</span>}
              {review.appVersion && <span>v{review.appVersion}</span>}
              {review.device && <span>{review.device}</span>}
              <span>{new Date(review.reviewDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {review.title && (
          <p className="mb-1 text-sm font-medium">{review.title}</p>
        )}
        <p className="text-sm text-muted-foreground">{review.body}</p>

        {review.replyText && !isReplying && (
          <div className="mt-4 rounded-xl border bg-primary/5 p-3">
            <p className="mb-1 text-xs font-medium text-primary">
              Your Reply
            </p>
            <p className="text-sm">{review.replyText}</p>
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setReplyText(review.replyText ?? "");
                  setIsReplying(true);
                }}
              >
                Edit
              </Button>
            )}
          </div>
        )}

        {!canReply && !review.replyText && (
          <div className="mt-4 space-y-2">
            {copyDraft !== null ? (
              <>
                <Textarea
                  value={copyDraft}
                  onChange={(e) => setCopyDraft(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={copyToClipboard}>
                    Copy reply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDraftToCopy}
                    disabled={draftReply.isPending}
                  >
                    Try again
                  </Button>
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDraftToCopy}
                disabled={draftReply.isPending}
              >
                {draftReply.isPending ? "Drafting..." : "Draft a reply with AI"}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              <KeyRound className="mr-1 inline h-3 w-3" />
              Sending from here needs a store API integration - copy the reply
              into the console for now, or{" "}
              <Link
                href={storeType ? `/onboarding?type=${storeType}` : "/onboarding"}
                className="text-primary underline underline-offset-4"
              >
                connect the store API
              </Link>
              .
            </p>
          </div>
        )}

        {canReply && !review.replyText && !isReplying && (
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReplying(true)}
            >
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              Reply
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiDraft}
              disabled={draftReply.isPending}
            >
              {draftReply.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="mr-2 h-3.5 w-3.5" />
              )}
              AI Draft
            </Button>
          </div>
        )}

        {isReplying && (
          <div className="mt-4 space-y-3">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={!replyText.trim() || replyMutation.isPending}
              >
                {replyMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-3.5 w-3.5" />
                )}
                Send Reply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiDraft}
                disabled={draftReply.isPending}
              >
                {draftReply.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bot className="mr-2 h-3.5 w-3.5" />
                )}
                AI Draft
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReviewsManager() {
  const routeParams = useParams<{ appId: string }>();
  const appId = routeParams.appId;
  const app = useApp(appId);
  const [ratingFilter, setRatingFilter] = useState("");
  const [replyFilter, setReplyFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  // The whole product by default: the App Store and Google Play records of
  // one app group together. The backend falls back to the app alone when it
  // is in no group.
  const [scope, setScope] = useState<ReviewScope>("group");

  const groupRatings = useRatingsSummary(appId, "group");
  const appRatings = useRatingsSummary(appId, "app");
  const group = groupRatings.data?.group ?? null;
  const effectiveScope: ReviewScope = group ? scope : "app";
  const ratings = effectiveScope === "group" ? groupRatings : appRatings;
  const refreshRatings = useRefreshRatings(appId, effectiveScope);

  const reviews = useReviews(appId, {
    rating: ratingFilter || undefined,
    hasReply: replyFilter || undefined,
    storeType: storeFilter || undefined,
    country: countryFilter || undefined,
    scope: effectiveScope,
  });
  const stats = useReviewStats(appId, effectiveScope);
  const syncReviews = useSyncReviews(appId, effectiveScope);
  const storeTypes = ratings.data?.stores.map((s) => s.storeType) ?? [];
  const countries = reviews.data?.countries ?? [];
  const reviewList = reviews.data?.reviews;

  const handleSync = async () => {
    try {
      const result = await syncReviews.mutateAsync();
      for (const error of result.errors ?? []) toast.error(error.message);
      toast.success(`${result.synced} reviews synced`);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : "Sync failed",
      );
    }
  };

  const handleRefreshRatings = async () => {
    try {
      await refreshRatings.mutateAsync();
      toast.success("Refreshing store ratings for every country");
    } catch {
      toast.error("Could not start the ratings refresh");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
      <AiUnlockCard compact />
      {group && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Show</span>
          <Button
            variant={effectiveScope === "group" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("group")}
          >
            All apps of {group.name}
          </Button>
          <Button
            variant={effectiveScope === "app" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("app")}
          >
            This app only
          </Button>
        </div>
      )}

      {ratings.isLoading && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {ratings.isError && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          Failed to load store ratings.
          <Button variant="outline" size="sm" onClick={() => ratings.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {ratings.data && (
        <RatingOverview
          summary={ratings.data}
          onRefresh={handleRefreshRatings}
          isRefreshPending={refreshRatings.isPending}
        />
      )}

      {stats.data && (
        <div className="flex flex-wrap gap-6 text-sm">
          <span>
            <span className="text-muted-foreground">Reviews in AppBoard </span>
            <span className="font-bold tabular-nums">{stats.data.totalReviews}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Unreplied </span>
            <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs font-bold tabular-nums text-yellow-500">
              {stats.data.noReplyCount}
            </span>
          </span>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={ratingFilter || "all"} onValueChange={(v) => setRatingFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r} Stars
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={replyFilter || "all"} onValueChange={(v) => setReplyFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Replies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Has Reply</SelectItem>
            <SelectItem value="false">No Reply</SelectItem>
          </SelectContent>
        </Select>

        {storeTypes.length > 1 && (
          <Select value={storeFilter || "all"} onValueChange={(v) => setStoreFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-40" aria-label="Store">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {storeTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {storeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {countries.length > 0 && (
          <Select value={countryFilter || "all"} onValueChange={(v) => setCountryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-44" aria-label="Country">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {countryName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1" />

        {/* Nothing to pull for an app that is in no store yet. */}
        {!isLocalApp(app.data) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncReviews.isPending}
          >
            {syncReviews.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync
          </Button>
        )}
      </div>

      {reviews.isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      )}

      {reviews.isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-sm text-muted-foreground">
            Failed to load reviews.
          </p>
          <Button variant="outline" onClick={() => reviews.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {reviewList && reviewList.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <Star className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isLocalApp(app.data)
              ? "This app is not in a store yet. Reviews show up here the day it is live."
              : ratingFilter || replyFilter || storeFilter || countryFilter
                ? "No reviews match these filters."
                : "No reviews with text synced yet. Use Sync, or wait for the daily sync at 04:00."}
          </p>
        </div>
      )}

      {reviewList && reviewList.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {reviewList.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              appName={review.appName ?? app.data?.name ?? ""}
              appId={appId}
              canReply={
                review.canReply ?? app.data?.store?.connectionMode !== "public"
              }
              storeType={review.storeType ?? app.data?.store?.type}
              showAppName={effectiveScope === "group"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
