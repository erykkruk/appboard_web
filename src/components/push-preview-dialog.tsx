"use client";

import { useCallback, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe,
  Image,
  Loader2,
  Lock,
  ShieldAlert,
  SkipForward,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePushPreview } from "@/hooks/use-publishing";
import { api } from "@/lib/api";

const FIELD_LABELS: Record<string, string> = {
  fullDesc: "Full Description",
  keywords: "Keywords",
  marketingUrl: "Marketing URL",
  privacyUrl: "Privacy URL",
  promoText: "Promotional Text",
  shortDesc: "Short Description",
  supportUrl: "Support URL",
  title: "Title",
  whatsNew: "What's New",
};

type SectionStatus = "idle" | "pushing" | "done" | "error";

type PushSection = "listings" | "purchases" | "categories" | "ageRating" | "privacy";

const SECTION_ORDER: PushSection[] = ["listings", "purchases", "categories", "ageRating", "privacy"];

interface PushPreviewDialogProps {
  appId: string;
  isIos: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function PushPreviewDialog({
  appId,
  isIos,
  open,
  onOpenChange,
  onComplete,
}: PushPreviewDialogProps) {
  const preview = usePushPreview(appId, open);
  const data = preview.data;
  const isLoading = preview.isLoading;

  const [statuses, setStatuses] = useState<Record<PushSection, SectionStatus>>({
    listings: "idle",
    purchases: "idle",
    categories: "idle",
    ageRating: "idle",
    privacy: "idle",
  });
  const [isPushingAll, setIsPushingAll] = useState(false);

  const hasListingChanges = (data?.listings.count ?? 0) > 0;
  const hasAssetChanges = (data?.assets.count ?? 0) > 0;
  const hasCategories = data?.categories != null;
  const hasAgeRating = data?.ageRating?.configured === true;
  const hasPrivacy = data?.privacy?.configured === true;
  const hasPurchases = (data?.purchases?.purchaseCount ?? 0) > 0;

  const sectionHasData: Record<PushSection, boolean> = {
    listings: hasListingChanges || hasAssetChanges,
    purchases: hasPurchases,
    categories: isIos && hasCategories,
    ageRating: isIos && hasAgeRating,
    privacy: isIos && hasPrivacy,
  };

  const hasPendingChanges = Object.values(sectionHasData).some(Boolean);

  const isAnyPushing = Object.values(statuses).some((s) => s === "pushing");
  const allDone = hasPendingChanges && SECTION_ORDER
    .filter((s) => sectionHasData[s])
    .every((s) => statuses[s] === "done" || statuses[s] === "error");

  const pushSection = useCallback(async (section: PushSection) => {
    setStatuses((prev) => ({ ...prev, [section]: "pushing" }));
    try {
      switch (section) {
        case "listings":
          await api.listings.publish(appId);
          break;
        case "purchases":
          await api.purchases.publish(appId);
          break;
        case "categories":
          await api.listings.publishCategories(appId);
          break;
        case "ageRating":
          await api.ageRating.publish(appId);
          break;
        case "privacy":
          await api.privacyDeclaration.publish(appId);
          break;
      }
      setStatuses((prev) => ({ ...prev, [section]: "done" }));
    } catch {
      setStatuses((prev) => ({ ...prev, [section]: "error" }));
    }
  }, [appId]);

  const pushAll = useCallback(async () => {
    setIsPushingAll(true);
    const sections = SECTION_ORDER.filter((s) => sectionHasData[s] && statuses[s] === "idle");
    for (const section of sections) {
      await pushSection(section);
    }
    setIsPushingAll(false);
  }, [sectionHasData, statuses, pushSection]);

  const resetAndClose = useCallback(() => {
    setStatuses({
      listings: "idle",
      purchases: "idle",
      categories: "idle",
      ageRating: "idle",
      privacy: "idle",
    });
    setIsPushingAll(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDone = useCallback(() => {
    onComplete();
    resetAndClose();
  }, [onComplete, resetAndClose]);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && isAnyPushing) return;
        if (!value) {
          resetAndClose();
        } else {
          onOpenChange(value);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isIos ? "Push to App Store" : "Push as Draft"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !hasPendingChanges ? (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm font-medium">No pending changes</p>
            <p className="text-xs">Everything is up to date with the store.</p>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {/* Listings */}
            <Section
              icon={<Globe className="h-4 w-4" />}
              title="Listings"
              badge={hasListingChanges ? data!.listings.count : undefined}
              skipped={!sectionHasData.listings}
              status={statuses.listings}
              onPush={() => pushSection("listings")}
              canPush={sectionHasData.listings && statuses.listings === "idle" && !isPushingAll}
            >
              {hasListingChanges && (
                <ul className="space-y-1">
                  {data!.listings.changes.map((change) => (
                    <li key={change.language} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {change.language}
                      </span>
                      {" — "}
                      {change.fields
                        .map((f) => FIELD_LABELS[f] ?? f)
                        .join(", ")}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Assets */}
            <Section
              icon={<Image className="h-4 w-4" />}
              title="Assets"
              badge={hasAssetChanges ? data!.assets.count : undefined}
              skipped={!hasAssetChanges}
              status="idle"
            >
              {hasAssetChanges && (
                <p className="text-xs text-muted-foreground">
                  {data!.assets.added > 0 && (
                    <span className="text-green-400">
                      +{data!.assets.added} added
                    </span>
                  )}
                  {data!.assets.added > 0 && data!.assets.removed > 0 && ", "}
                  {data!.assets.removed > 0 && (
                    <span className="text-red-400">
                      -{data!.assets.removed} removed
                    </span>
                  )}
                </p>
              )}
            </Section>

            {/* Purchases */}
            <Section
              icon={<CreditCard className="h-4 w-4" />}
              title="Purchases"
              badge={hasPurchases ? data!.purchases.purchaseCount : undefined}
              skipped={!hasPurchases}
              status={statuses.purchases}
              onPush={() => pushSection("purchases")}
              canPush={sectionHasData.purchases && statuses.purchases === "idle" && !isPushingAll}
            >
              {hasPurchases && (
                <p className="text-xs text-muted-foreground">
                  {data!.purchases.purchaseCount} product{data!.purchases.purchaseCount !== 1 ? "s" : ""}
                  {data!.purchases.groupCount > 0 &&
                    ` · ${data!.purchases.groupCount} group${data!.purchases.groupCount !== 1 ? "s" : ""}`}
                  {data!.purchases.localizationCount > 0 &&
                    ` · ${data!.purchases.localizationCount} localization${data!.purchases.localizationCount !== 1 ? "s" : ""}`}
                  {data!.purchases.priceCount > 0 &&
                    ` · ${data!.purchases.priceCount} price${data!.purchases.priceCount !== 1 ? "s" : ""}`}
                </p>
              )}
            </Section>

            {/* Categories (iOS only) */}
            {isIos && (
              <Section
                icon={<FileText className="h-4 w-4" />}
                title="Categories"
                skipped={!hasCategories}
                status={statuses.categories}
                onPush={() => pushSection("categories")}
                canPush={sectionHasData.categories && statuses.categories === "idle" && !isPushingAll}
              >
                {hasCategories && (
                  <p className="text-xs text-muted-foreground">
                    {data!.categories!.primaryCategory}
                    {data!.categories!.secondaryCategory &&
                      ` / ${data!.categories!.secondaryCategory}`}
                  </p>
                )}
              </Section>
            )}

            {/* Age Rating (iOS only) */}
            {isIos && (
              <Section
                icon={<ShieldAlert className="h-4 w-4" />}
                title="Age Rating"
                skipped={!hasAgeRating}
                status={statuses.ageRating}
                onPush={() => pushSection("ageRating")}
                canPush={sectionHasData.ageRating && statuses.ageRating === "idle" && !isPushingAll}
              >
                {hasAgeRating && (
                  <p className="text-xs text-muted-foreground">
                    {data!.ageRating.appleRating ?? "Configured"}
                    {data!.ageRating.presetId &&
                      data!.ageRating.presetId !== "custom" &&
                      ` (${data!.ageRating.presetId})`}
                  </p>
                )}
              </Section>
            )}

            {/* Privacy Declaration (iOS only) */}
            {isIos && (
              <Section
                icon={<Lock className="h-4 w-4" />}
                title="Privacy Declaration"
                skipped={!hasPrivacy}
                status={statuses.privacy}
                onPush={() => pushSection("privacy")}
                canPush={sectionHasData.privacy && statuses.privacy === "idle" && !isPushingAll}
              >
                {hasPrivacy && (
                  <p className="text-xs text-muted-foreground">
                    {data!.privacy.dataCollectionCount ?? 0} data types
                    {data!.privacy.trackingEnabled && " · Tracking enabled"}
                  </p>
                )}
              </Section>
            )}
          </div>
        )}

        <DialogFooter>
          {allDone ? (
            <Button onClick={handleDone}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={isAnyPushing}
                onClick={resetAndClose}
              >
                Cancel
              </Button>
              <Button
                onClick={pushAll}
                disabled={isAnyPushing || isLoading || !hasPendingChanges}
              >
                {isAnyPushing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Pushing...
                  </>
                ) : (
                  isIos ? "Push All" : "Push All as Draft"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon,
  title,
  badge,
  skipped,
  status,
  onPush,
  canPush,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: number;
  skipped?: boolean;
  status: SectionStatus;
  onPush?: () => void;
  canPush?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium">{title}</span>

        {status === "pushing" && (
          <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-primary" />
        )}
        {status === "done" && (
          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-green-400" />
        )}
        {status === "error" && (
          <AlertCircle className="ml-auto h-3.5 w-3.5 text-red-400" />
        )}

        {status === "idle" && badge !== undefined && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {badge}
          </Badge>
        )}
        {status === "idle" && skipped && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            <SkipForward className="h-3 w-3" />
            Will be skipped
          </span>
        )}

        {canPush && onPush && (
          <button
            type="button"
            onClick={onPush}
            className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={`Push ${title}`}
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}
