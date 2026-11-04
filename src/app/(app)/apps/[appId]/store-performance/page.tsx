"use client";

import { Settings2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { StorePerformanceView } from "@/components/store-performance/store-performance-view";
import { PlayReportsBucketDialog } from "@/components/stores/play-reports-bucket-dialog";
import { Button } from "@/components/ui/button";
import {
  useRefreshStorePerformance,
  useStorePerformance,
} from "@/hooks/use-store-performance";
import { defaultReportMonth } from "@/lib/store-performance";

/**
 * Store performance of a Google Play app: listing visitors, acquisitions and
 * conversion per traffic source, search term and country, from the Play
 * Console bulk reports of the app's Play connection.
 */
export default function StorePerformancePage() {
  const { appId } = useParams<{ appId: string }>();
  const report = useStorePerformance(appId);
  const refresh = useRefreshStorePerformance(appId);
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const [editingBucket, setEditingBucket] = useState(false);

  const data = report.data;
  const playReport = data?.supported ? data : null;
  const month = pickedMonth ?? (playReport ? defaultReportMonth(playReport.months) : null);

  const handleRefresh = async () => {
    try {
      await refresh.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read the Play reports");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-xl tracking-tight">Store performance</h1>
          <p className="text-sm text-muted-foreground">
            Who opened your store listing, where they came from and how many installed.
          </p>
        </div>
        {playReport && playReport.status !== "integration_required" && (
          <Button onClick={() => setEditingBucket(true)} size="sm" variant="ghost">
            <Settings2 className="mr-2 h-4 w-4" />
            Play reports bucket
          </Button>
        )}
      </div>

      <StorePerformanceView
        error={report.error}
        isLoading={report.isLoading}
        isRefreshing={refresh.isPending}
        month={month}
        onEditBucket={() => setEditingBucket(true)}
        onMonthChange={setPickedMonth}
        onRefresh={handleRefresh}
        report={data}
      />

      {playReport && (
        <PlayReportsBucketDialog
          currentBucket={playReport.bucket}
          onClose={() => setEditingBucket(false)}
          open={editingBucket}
          storeId={playReport.storeId}
        />
      )}
    </div>
  );
}
