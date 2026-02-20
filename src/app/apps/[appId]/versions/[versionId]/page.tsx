"use client";

import { useParams } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVersionDetail } from "@/hooks/use-publishing";
import { cn } from "@/lib/utils";
import type { VersionLocalization } from "@/lib/types";

const STATE_COLORS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "bg-yellow-400",
  READY_FOR_SALE: "bg-green-400",
  WAITING_FOR_REVIEW: "bg-blue-400",
  IN_REVIEW: "bg-blue-400",
  DEVELOPER_REJECTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  PENDING_DEVELOPER_RELEASE: "bg-purple-400",
};

const STATE_LABELS: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "Prepare for Submission",
  READY_FOR_SALE: "Ready for Sale",
  WAITING_FOR_REVIEW: "Waiting for Review",
  IN_REVIEW: "In Review",
  DEVELOPER_REJECTED: "Developer Rejected",
  REJECTED: "Rejected",
  PENDING_DEVELOPER_RELEASE: "Pending Developer Release",
};

function LocalizationCard({ loc }: { loc: VersionLocalization }) {
  return (
    <Card className="bg-[#1a1a1a] border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-muted-foreground" />
          {loc.language}
          {loc.title && (
            <span className="text-muted-foreground font-normal">
              — {loc.title}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loc.subtitle && (
          <Field label="Subtitle" value={loc.subtitle} />
        )}
        {loc.description && (
          <Field label="Description" value={loc.description} multiline />
        )}
        {loc.keywords && (
          <Field label="Keywords" value={loc.keywords} />
        )}
        {loc.whatsNew && (
          <Field label="What's New" value={loc.whatsNew} multiline />
        )}
        {loc.promotionalText && (
          <Field label="Promotional Text" value={loc.promotionalText} />
        )}
        {loc.marketingUrl && (
          <Field label="Marketing URL" value={loc.marketingUrl} />
        )}
        {loc.supportUrl && (
          <Field label="Support URL" value={loc.supportUrl} />
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          "text-foreground",
          multiline && "whitespace-pre-wrap text-xs leading-relaxed",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function VersionDetailPage() {
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

  const { versionString, state, localizations } = detail.data;

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
          <h1 className="text-xl font-bold">Version {versionString}</h1>
          <p className="text-sm text-muted-foreground">
            {STATE_LABELS[state] ?? state}
          </p>
        </div>
      </div>

      {/* Localizations */}
      {localizations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No localizations found for this version.
        </p>
      ) : (
        <div className="space-y-4">
          {localizations.map((loc) => (
            <LocalizationCard key={loc.language} loc={loc} />
          ))}
        </div>
      )}
    </div>
  );
}
