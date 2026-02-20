"use client";

import { useParams } from "next/navigation";
import {
  Bot,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Star,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useReplyToReview,
  useReviewStats,
  useReviews,
  useSyncReviews,
} from "@/hooks/use-reviews";
import type { Review } from "@/lib/types";
import { cn } from "@/lib/utils";

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            i <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted",
          )}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function RatingBar({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-right text-muted-foreground">{stars}</span>
      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-yellow-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function ReviewCard({
  review,
  appName,
  appId,
}: {
  review: Review;
  appName: string;
  appId: string;
}) {
  const [replyText, setReplyText] = useState(review.replyText ?? "");
  const [isReplying, setIsReplying] = useState(false);
  const replyMutation = useReplyToReview(appId);
  const draftReply = useDraftReply();

  const handleReply = async () => {
    try {
      await replyMutation.mutateAsync({
        reviewId: review.id,
        text: replyText,
      });
      setIsReplying(false);
      toast.success("Reply sent");
    } catch {
      toast.error("Failed to send reply");
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
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size={14} />
              <Badge variant="outline" className="text-xs">
                {review.storeType === "google_play"
                  ? "Google Play"
                  : "App Store"}
              </Badge>
            </div>
            <p className="text-sm font-medium">{review.authorName}</p>
            <div className="flex gap-3 text-xs text-muted-foreground">
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
          <div className="mt-4 rounded-lg border bg-muted/50 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Your Reply
            </p>
            <p className="text-sm">{review.replyText}</p>
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
          </div>
        )}

        {!review.replyText && !isReplying && (
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

  const reviews = useReviews(appId, {
    rating: ratingFilter || undefined,
    hasReply: replyFilter || undefined,
  });
  const stats = useReviewStats(appId);
  const syncReviews = useSyncReviews(appId);

  return (
    <div className="p-6">
      {stats.isLoading && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}

      {stats.data && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rating Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold">
                    {stats.data.averageRating.toFixed(1)}
                  </p>
                  <StarRating
                    rating={Math.round(stats.data.averageRating)}
                    size={14}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {stats.data.totalReviews} reviews
                  </p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((s) => (
                    <RatingBar
                      key={s}
                      stars={s}
                      count={stats.data.distribution[s] ?? 0}
                      total={stats.data.totalReviews}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Reviews</span>
                <span className="font-medium">{stats.data.totalReviews}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unreplied</span>
                <span className="font-medium text-yellow-500">
                  {stats.data.noReplyCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r} Stars
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={replyFilter} onValueChange={setReplyFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Replies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="true">Has Reply</SelectItem>
            <SelectItem value="false">No Reply</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => syncReviews.mutate()}
          disabled={syncReviews.isPending}
        >
          {syncReviews.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync
        </Button>
      </div>

      {reviews.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
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

      {reviews.data && reviews.data.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <Star className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No reviews found.</p>
        </div>
      )}

      {reviews.data && reviews.data.length > 0 && (
        <div className="space-y-4">
          {reviews.data.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              appName={app.data?.name ?? ""}
              appId={appId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
