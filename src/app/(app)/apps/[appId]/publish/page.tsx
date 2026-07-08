"use client";

import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Image,
  Info,
  Loader2,
  Plus,
  Rocket,
  Send,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PublishReport } from "@/components/publishing/publish-report";
import { useApp } from "@/hooks/use-apps";
import {
  useCreateVersion,
  usePublish,
  usePublishingOverview,
  useSubmitForReview,
} from "@/hooks/use-publishing";
import type { PublishReportItem } from "@/lib/types";

const VERSION_STATE_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PREPARE_FOR_SUBMISSION: {
    label: "Prepare for Submission",
    variant: "outline",
  },
  WAITING_FOR_REVIEW: { label: "Waiting for Review", variant: "secondary" },
  IN_REVIEW: { label: "In Review", variant: "secondary" },
  READY_FOR_SALE: { label: "Ready for Sale", variant: "default" },
  DEVELOPER_REJECTED: {
    label: "Developer Rejected",
    variant: "destructive",
  },
  REJECTED: { label: "Rejected", variant: "destructive" },
  PENDING_DEVELOPER_RELEASE: {
    label: "Pending Developer Release",
    variant: "secondary",
  },
};

const GP_CONSOLE_BASE = "https://play.google.com/console";

function getGpConsolePublishingUrl(packageName?: string) {
  if (!packageName) return GP_CONSOLE_BASE;
  return `${GP_CONSOLE_BASE}/developers/app/${packageName}/publishing-overview`;
}

export default function PublishPage() {
  const routeParams = useParams<{ appId: string }>();
  const appId = routeParams.appId;
  const app = useApp(appId);
  const overview = usePublishingOverview(appId);
  const publish = usePublish(appId);
  const submitForReview = useSubmitForReview(appId);
  const createVersion = useCreateVersion(appId);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [newVersionString, setNewVersionString] = useState("");
  const [publishReport, setPublishReport] = useState<PublishReportItem[]>([]);

  const isIos = app.data?.platform === "ios";

  const handlePublish = async () => {
    try {
      const result = await publish.mutateAsync(false);
      const report = result.report ?? [];
      setPublishReport(report);

      const total =
        (result.listings?.published ?? 0) +
        (result.assets?.published ?? 0) +
        (result.versionLocalizations?.published ?? 0);
      const failed = report.filter((r) => r.status === "failed").length;

      if (failed > 0) {
        const published = report.length - failed;
        toast.warning(
          `Published ${published} change(s), ${failed} failed — see the report below`,
        );
      } else {
        toast.success(`Published ${total} change(s) to the store`);
      }
    } catch {
      setPublishReport([]);
      toast.error("Failed to publish changes");
    }
  };

  const handleCreateVersion = async () => {
    const version =
      newVersionString.trim() ||
      data?.version?.suggestedVersion ||
      "";
    if (!version) return;
    try {
      const result = await createVersion.mutateAsync(version);
      const langCount = result?.copiedLanguages?.length ?? 0;
      const langMsg = langCount > 0 ? ` with ${langCount} languages` : "";
      toast.success(`Version ${version} created${langMsg}`);
      setNewVersionString("");
    } catch {
      toast.error("Failed to create new version");
    }
  };

  const handleSubmitForReview = async () => {
    try {
      await submitForReview.mutateAsync();
      toast.success(
        isIos
          ? "App submitted for Apple review"
          : "Changes sent for Google review",
      );
      setShowReviewDialog(false);
    } catch {
      toast.error("Failed to submit for review");
    }
  };

  if (overview.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          Failed to load publishing overview.
        </p>
      </div>
    );
  }

  const data = overview.data;
  const storeName = isIos ? "App Store" : "Google Play";
  const gpConsoleUrl = getGpConsolePublishingUrl(app.data?.externalId);

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
      {/* Managed Publishing — Google Play only */}
      {!isIos && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Managed Publishing</span>
              <a
                href={gpConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Console
                </Button>
              </a>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Managed Publishing controls when your changes go live on Google Play.
              This setting can only be configured in the Google Play Console.
            </p>
            <div className="grid gap-3">
              <a
                href={gpConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Manual</p>
                  <p className="text-xs text-muted-foreground">
                    Changes are staged after review. You publish them manually in the Console.
                  </p>
                </div>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
              <a
                href={gpConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Automatic</p>
                  <p className="text-xs text-muted-foreground">
                    Changes go live automatically after Google&apos;s review process completes.
                  </p>
                </div>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
              <a
                href={gpConsoleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Scheduled</p>
                  <p className="text-xs text-muted-foreground">
                    Changes are published at a date you set in the Console.
                  </p>
                </div>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <p className="text-xs text-muted-foreground">
                AppBoard pushes your changes to Google Play automatically when you save.
                Use the <span className="font-medium text-foreground">Managed Publishing</span>{" "}
                setting in Google Play Console to control when those changes go live.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* App Store Version — iOS only */}
      {isIos && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>App Store Version</span>
              {data?.version && (
                <Badge
                  variant={
                    VERSION_STATE_LABELS[data.version.state]?.variant ??
                    "outline"
                  }
                >
                  {VERSION_STATE_LABELS[data.version.state]?.label ??
                    data.version.state}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.version?.isEditable ? (
              <p className="text-2xl font-semibold tracking-tight">
                {data.version.versionString}
              </p>
            ) : data?.version ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-sm text-muted-foreground">
                    Version {data.version.versionString} is{" "}
                    <span className="font-medium text-foreground">
                      {VERSION_STATE_LABELS[data.version.state]?.label ??
                        data.version.state}
                    </span>
                    . Create a new version to make changes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. 1.2.1"
                    value={
                      newVersionString ||
                      data.version.suggestedVersion ||
                      ""
                    }
                    onChange={(e) => setNewVersionString(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateVersion}
                    disabled={
                      createVersion.isPending ||
                      !(
                        newVersionString.trim() ||
                        data.version.suggestedVersion
                      )
                    }
                  >
                    {createVersion.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create Version
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No version found. Create one to start publishing.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="e.g. 1.0.0"
                    value={newVersionString}
                    onChange={(e) => setNewVersionString(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateVersion}
                    disabled={
                      createVersion.isPending || !newVersionString.trim()
                    }
                  >
                    {createVersion.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Create Version
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </div>

        <div className="space-y-6">
      {/* Pending Listing Changes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Pending Listing Changes
            {data?.listings.count ? (
              <Badge variant="secondary">{data.listings.count}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.listings.changes.length ? (
            <ul className="space-y-2">
              {data.listings.changes.map((change) => (
                <li
                  key={change.language}
                  className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2"
                >
                  <Badge variant="outline" className="font-mono text-xs">
                    {change.language}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {change.fields.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No pending listing changes.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Asset Changes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-4 w-4" />
            Pending Asset Changes
            {data?.assets.count ? (
              <Badge variant="secondary">{data.assets.count}</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.assets.count ? (
            <div className="flex gap-4 text-sm">
              {data.assets.added > 0 && (
                <span className="text-green-500">
                  +{data.assets.added} new
                </span>
              )}
              {data.assets.removed > 0 && (
                <span className="text-red-500">
                  -{data.assets.removed} removed
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No pending asset changes.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Publish Actions */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          onClick={handlePublish}
          disabled={
            !data?.hasPendingChanges ||
            publish.isPending ||
            (isIos && !data?.version?.isEditable)
          }
          className="w-full"
        >
          {publish.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : data?.hasPendingChanges ? (
            <Rocket className="mr-2 h-4 w-4" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          {data?.hasPendingChanges
            ? isIos
              ? `Publish to ${storeName}`
              : `Publish to ${storeName} (as Draft)`
            : "All changes published"}
        </Button>

        <AlertDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
        >
          <AlertDialogTrigger asChild>
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              disabled={
                submitForReview.isPending ||
                (isIos && !data?.version?.isEditable)
              }
            >
              {submitForReview.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isIos ? "Submit for Apple Review" : "Send Changes for Review"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {isIos ? "Submit for Apple Review?" : "Send Changes for Google Review?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-left">
                {isIos ? (
                  <>
                    <span className="block">
                      This will submit your app version for Apple&apos;s review
                      process. Once submitted:
                    </span>
                    <span className="block font-medium text-foreground">
                      - You will NOT be able to edit listings or assets until the
                      review is complete.
                    </span>
                    <span className="block font-medium text-foreground">
                      - The review process typically takes 24-48 hours but can
                      take longer.
                    </span>
                    <span className="block font-medium text-foreground">
                      - Make sure all changes are published before submitting.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block">
                      This will send all pending changes on Google Play for
                      Google&apos;s review. Once sent:
                    </span>
                    <span className="block font-medium text-foreground">
                      - Changes will enter Google&apos;s review queue.
                    </span>
                    <span className="block font-medium text-foreground">
                      - Review typically takes a few hours but can take longer.
                    </span>
                    <span className="block font-medium text-foreground">
                      - If Managed Publishing is enabled, approved changes will
                      wait for you to publish them manually in the Console.
                    </span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmitForReview}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isIos ? "Yes, Submit for Review" : "Yes, Send for Review"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Publish Report — per-item results from the last publish */}
      {publishReport.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-4 w-4" />
              Publish Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PublishReport report={publishReport} />
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
}
