"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetPlayReportsBucket } from "@/hooks/use-store-performance";
import {
  PLAY_BULK_REPORTS_PERMISSION,
  PLAY_REPORTS_BUCKET_HINT,
} from "@/lib/store-performance";

/**
 * Paste the Play Console bulk-report bucket of a Google Play connection.
 * The server accepts the bare name or the full gs:// URI and normalizes it.
 */
export function PlayReportsBucketDialog({
  currentBucket,
  onClose,
  open,
  storeId,
}: {
  currentBucket: string | null;
  onClose: () => void;
  open: boolean;
  storeId: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Play reports bucket</DialogTitle>
          <DialogDescription>
            Store performance reads the monthly reports Google Play writes to
            your developer account&apos;s Cloud Storage bucket.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per opening, so the field starts from the saved bucket every time. */}
        {open && (
          <BucketForm currentBucket={currentBucket} onClose={onClose} storeId={storeId} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BucketForm({
  currentBucket,
  onClose,
  storeId,
}: {
  currentBucket: string | null;
  onClose: () => void;
  storeId: string;
}) {
  const [value, setValue] = useState(currentBucket ?? "");
  const setBucket = useSetPlayReportsBucket();

  const save = async (bucket: string | null) => {
    try {
      const saved = await setBucket.mutateAsync({ bucket, storeId });
      toast.success(
        saved.playReportsBucket
          ? `Play reports bucket saved: ${saved.playReportsBucket}`
          : "Play reports bucket removed",
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the bucket");
    }
  };

  return (
    <>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>In {PLAY_REPORTS_BUCKET_HINT}.</li>
        <li>Paste it below (gs://pubsite_prod_... or just the bucket name).</li>
        <li>
          In Play Console &gt; Users and permissions, give the service account of
          this connection the account permission &quot;
          {PLAY_BULK_REPORTS_PERMISSION}&quot;.
        </li>
      </ol>
      <div className="space-y-2">
        <Label htmlFor="play-reports-bucket">Cloud Storage URI</Label>
        <Input
          id="play-reports-bucket"
          placeholder="gs://pubsite_prod_1234567890"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) save(value);
          }}
        />
      </div>
      <DialogFooter>
        {currentBucket && (
          <Button
            className="mr-auto"
            disabled={setBucket.isPending}
            onClick={() => save(null)}
            variant="ghost"
          >
            Remove
          </Button>
        )}
        <Button disabled={setBucket.isPending} onClick={onClose} variant="outline">
          Cancel
        </Button>
        <Button
          disabled={setBucket.isPending || !value.trim()}
          onClick={() => save(value)}
        >
          {setBucket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
