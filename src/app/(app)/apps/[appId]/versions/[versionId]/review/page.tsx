"use client";

import { useParams } from "next/navigation";
import { AlertCircle, Info, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useDeleteReviewAttachment,
  useReviewDetail,
  useUpdateReviewDetail,
  useUploadReviewAttachment,
  useVersionDetail,
} from "@/hooks/use-publishing";
import { useAutoSave } from "@/hooks/use-auto-save";
import type { AppReviewDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

const EDITABLE_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
]);

const NOTES_MAX_LENGTH = 4000;

const ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".rtf", ".pages",
  ".xls", ".xlsx", ".numbers",
  ".zip", ".rar",
  ".plist", ".crash",
  ".jpg", ".png",
  ".mp4", ".avi",
];

const ALLOWED_ACCEPT = ALLOWED_EXTENSIONS.join(",");

interface FormData {
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;
  demoAccountName: string;
  demoAccountPassword: string;
  demoAccountRequired: boolean;
  notes: string;
}

function buildFormData(detail: AppReviewDetail | null): FormData {
  return {
    contactFirstName: detail?.contactFirstName ?? "",
    contactLastName: detail?.contactLastName ?? "",
    contactPhone: detail?.contactPhone ?? "",
    contactEmail: detail?.contactEmail ?? "",
    demoAccountName: detail?.demoAccountName ?? "",
    demoAccountPassword: detail?.demoAccountPassword ?? "",
    demoAccountRequired: detail?.demoAccountRequired ?? false,
    notes: detail?.notes ?? "",
  };
}

function getChangedFields(
  original: FormData,
  current: FormData,
): Partial<FormData> | null {
  const changes: Record<string, string | boolean> = {};
  for (const key of Object.keys(current) as (keyof FormData)[]) {
    if (current[key] !== original[key]) {
      changes[key] = current[key];
    }
  }
  return Object.keys(changes).length > 0 ? (changes as Partial<FormData>) : null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReviewPage() {
  const params = useParams<{ appId: string; versionId: string }>();
  const versionDetail = useVersionDetail(params.appId, params.versionId);
  const reviewDetail = useReviewDetail(params.appId, params.versionId);
  const updateReview = useUpdateReviewDetail(params.appId, params.versionId);
  const uploadAttachment = useUploadReviewAttachment(params.appId, params.versionId);
  const deleteAttachment = useDeleteReviewAttachment(params.appId, params.versionId);

  const [formData, setFormData] = useState<FormData>(buildFormData(null));
  const [originalData, setOriginalData] = useState<FormData>(buildFormData(null));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form from server
  useEffect(() => {
    if (reviewDetail.data !== undefined) {
      const data = buildFormData(reviewDetail.data);
      setFormData(data);
      setOriginalData(data);
    }
  }, [reviewDetail.data]);

  const state = versionDetail.data?.state ?? "";
  const isEditable = EDITABLE_STATES.has(state);

  const changedFields = useMemo(
    () => getChangedFields(originalData, formData),
    [originalData, formData],
  );

  const notesOverLimit = formData.notes.length > NOTES_MAX_LENGTH;

  const handleFieldChange = useCallback(
    (key: keyof FormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  useAutoSave({
    data: formData,
    onSave: async (data) => {
      if (data.notes.length > NOTES_MAX_LENGTH) return;
      const changes = getChangedFields(originalData, data);
      if (!changes) return;
      await updateReview.mutateAsync(changes);
      setOriginalData({ ...data });
    },
    enabled: isEditable,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }

    try {
      await uploadAttachment.mutateAsync(file);
      toast.success("Attachment uploaded");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload attachment";
      toast.error(message);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    try {
      await deleteAttachment.mutateAsync(attachmentId);
      toast.success("Attachment deleted");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete attachment";
      toast.error(message);
    }
  };

  if (versionDetail.isLoading || reviewDetail.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!versionDetail.data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Version not found
      </div>
    );
  }

  const attachments = reviewDetail.data?.attachments ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">App Review Information</h1>
      </div>

      <div className="max-w-5xl space-y-8">
        {/* Sign-In Information + Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sign-In Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Sign-In Information
            </h2>

            <div className="flex items-center gap-3">
              <Switch
                id="demoAccountRequired"
                checked={formData.demoAccountRequired}
                onCheckedChange={(checked) =>
                  handleFieldChange("demoAccountRequired", checked)
                }
                disabled={!isEditable}
              />
              <Label htmlFor="demoAccountRequired" className="text-sm">
                Sign-in required
              </Label>
            </div>

            {formData.demoAccountRequired && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="demoAccountName" className="text-sm">
                    Username
                  </Label>
                  <Input
                    id="demoAccountName"
                    value={formData.demoAccountName}
                    onChange={(e) =>
                      handleFieldChange("demoAccountName", e.target.value)
                    }
                    placeholder="Demo account username"
                    disabled={!isEditable}
                    className="bg-[#1a1a1a] border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demoAccountPassword" className="text-sm">
                    Password
                  </Label>
                  <Input
                    id="demoAccountPassword"
                    value={formData.demoAccountPassword}
                    onChange={(e) =>
                      handleFieldChange("demoAccountPassword", e.target.value)
                    }
                    placeholder="Demo account password"
                    disabled={!isEditable}
                    className="bg-[#1a1a1a] border-border"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Contact Information
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contactFirstName" className="text-sm">
                  First name
                </Label>
                <Input
                  id="contactFirstName"
                  value={formData.contactFirstName}
                  onChange={(e) =>
                    handleFieldChange("contactFirstName", e.target.value)
                  }
                  placeholder="First name"
                  disabled={!isEditable}
                  className="bg-[#1a1a1a] border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactLastName" className="text-sm">
                  Last name
                </Label>
                <Input
                  id="contactLastName"
                  value={formData.contactLastName}
                  onChange={(e) =>
                    handleFieldChange("contactLastName", e.target.value)
                  }
                  placeholder="Last name"
                  disabled={!isEditable}
                  className="bg-[#1a1a1a] border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone" className="text-sm">
                  Phone
                </Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    handleFieldChange("contactPhone", e.target.value)
                  }
                  placeholder="+1 (555) 000-0000"
                  disabled={!isEditable}
                  className="bg-[#1a1a1a] border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail" className="text-sm">
                  Email
                </Label>
                <Input
                  id="contactEmail"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    handleFieldChange("contactEmail", e.target.value)
                  }
                  placeholder="email@example.com"
                  disabled={!isEditable}
                  className="bg-[#1a1a1a] border-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Notes
            </Label>
            <span
              className={cn(
                "text-xs tabular-nums",
                notesOverLimit
                  ? "text-destructive font-medium"
                  : "text-muted-foreground",
              )}
            >
              {formData.notes.length}/{NOTES_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleFieldChange("notes", e.target.value)}
            rows={6}
            placeholder="Additional information for the reviewer..."
            disabled={!isEditable}
            className={cn(
              "resize-none bg-[#1a1a1a] border-border",
              notesOverLimit && "border-destructive",
            )}
          />
          {notesOverLimit && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Exceeds maximum of {NOTES_MAX_LENGTH} characters
            </p>
          )}
        </div>

        {/* Attachments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">
                Attachments
              </h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    Attach documentation, demo videos, and other items to help
                    prevent delays during review. Allowed file types:{" "}
                    {ALLOWED_EXTENSIONS.join(", ")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {isEditable && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_ACCEPT}
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadAttachment.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadAttachment.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                  )}
                  Upload
                </Button>
              </>
            )}
          </div>

          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attachments. Upload files to include with your review submission.
            </p>
          ) : (
            <div className="space-y-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-[#1a1a1a] px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm truncate">{att.fileName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({formatFileSize(att.fileSize)})
                    </span>
                  </div>
                  {isEditable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      disabled={deleteAttachment.isPending}
                      onClick={() => handleDelete(att.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
