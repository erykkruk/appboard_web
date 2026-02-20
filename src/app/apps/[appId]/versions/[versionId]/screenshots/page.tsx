"use client";

import { useParams } from "next/navigation";
import { Image, Loader2 } from "lucide-react";

import { useVersionDetail } from "@/hooks/use-publishing";
import { cn } from "@/lib/utils";

const STATE_COLORS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "bg-yellow-400",
  READY_FOR_SALE: "bg-green-400",
  WAITING_FOR_REVIEW: "bg-blue-400",
  IN_REVIEW: "bg-blue-400",
  DEVELOPER_REJECTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  PENDING_DEVELOPER_RELEASE: "bg-purple-400",
};

export default function VersionScreenshotsPage() {
  const params = useParams<{ appId: string; versionId: string }>();
  const detail = useVersionDetail(params.appId, params.versionId);

  if (detail.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Version not found
      </div>
    );
  }

  const { versionString, state } = detail.data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-8 w-1.5 rounded-full",
            STATE_COLORS[state] ?? "bg-muted-foreground",
          )}
        />
        <div>
          <h1 className="text-xl font-bold">
            Previews & Screenshots
          </h1>
          <p className="text-sm text-muted-foreground">
            Version {versionString}
          </p>
        </div>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-muted-foreground">
        <Image className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">No previews or screenshots yet</p>
        <p className="mt-1 text-xs">
          Screenshot management for this version will be available soon.
        </p>
      </div>
    </div>
  );
}
