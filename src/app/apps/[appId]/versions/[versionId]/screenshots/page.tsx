"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import {
  useVersionDetail,
  useVersionScreenshots,
} from "@/hooks/use-publishing";
import { cn } from "@/lib/utils";
import type { VersionScreenshot } from "@/lib/types";

const STATE_COLORS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "bg-yellow-400",
  READY_FOR_SALE: "bg-green-400",
  WAITING_FOR_REVIEW: "bg-blue-400",
  IN_REVIEW: "bg-blue-400",
  DEVELOPER_REJECTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  PENDING_DEVELOPER_RELEASE: "bg-purple-400",
};

function groupScreenshots(screenshots: VersionScreenshot[]) {
  const byLanguage = new Map<string, Map<string, VersionScreenshot[]>>();

  for (const s of screenshots) {
    if (!byLanguage.has(s.language)) {
      byLanguage.set(s.language, new Map());
    }
    const byDevice = byLanguage.get(s.language)!;
    if (!byDevice.has(s.deviceType)) {
      byDevice.set(s.deviceType, []);
    }
    byDevice.get(s.deviceType)!.push(s);
  }

  return byLanguage;
}

export default function VersionScreenshotsPage() {
  const params = useParams<{ appId: string; versionId: string }>();
  const detail = useVersionDetail(params.appId, params.versionId);
  const screenshots = useVersionScreenshots(params.appId, params.versionId);

  const grouped = useMemo(
    () => groupScreenshots(screenshots.data ?? []),
    [screenshots.data],
  );

  if (detail.isLoading || screenshots.isLoading) {
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
  const totalCount = screenshots.data?.length ?? 0;

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
          <h1 className="text-xl font-bold">Previews & Screenshots</h1>
          <p className="text-sm text-muted-foreground">
            Version {versionString} — {totalCount} screenshot
            {totalCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-muted-foreground">
          <p className="text-sm font-medium">
            No iPhone screenshots found for this version.
          </p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([language, deviceMap]) => (
          <div key={language} className="space-y-4">
            <h2 className="text-lg font-semibold">{language}</h2>

            {Array.from(deviceMap.entries()).map(([deviceType, items]) => (
              <div key={deviceType} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {deviceType}{" "}
                  <span className="text-muted-foreground/60">
                    ({items.length})
                  </span>
                </p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {items.map((s, i) => (
                    <a
                      key={`${s.url}-${i}`}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <img
                        src={s.url}
                        alt={`${language} ${deviceType} screenshot ${i + 1}`}
                        className="h-[400px] w-auto rounded-lg border border-border object-contain transition-opacity hover:opacity-80"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
