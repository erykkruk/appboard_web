"use client";

import { useParams } from "next/navigation";
import { ExternalLink, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { useApp } from "@/hooks/use-apps";
import { useAssets, useUploadAsset, useDeleteAsset } from "@/hooks/use-assets";
import { useVersionDetail } from "@/hooks/use-publishing";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/types";
import { APP_STORE_LANGUAGES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATE_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-400",
  PREPARE_FOR_SUBMISSION: "bg-yellow-400",
  READY_FOR_SALE: "bg-green-400",
  WAITING_FOR_REVIEW: "bg-blue-400",
  IN_REVIEW: "bg-blue-400",
  DEVELOPER_REJECTED: "bg-orange-400",
  REJECTED: "bg-red-400",
  PENDING_DEVELOPER_RELEASE: "bg-purple-400",
};

function SingleAssetSection({
  title,
  description,
  sizeHint,
  asset,
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
  disabled,
}: {
  title: string;
  description: string;
  sizeHint: string;
  asset: Asset | undefined;
  onUpload: (file: File) => void;
  onDelete: () => void;
  isUploading: boolean;
  isDeleting: boolean;
  disabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    onUpload(file);
  };

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground/60">{sizeHint}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
      />
      {asset ? (
        <div className="flex items-end gap-4">
          <img
            src={asset.url}
            alt={title}
            className="max-h-[200px] max-w-[400px] rounded-lg border border-border object-contain"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || disabled}
            >
              {isUploading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Replace
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex h-[120px] w-[240px] items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-30" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || disabled}
          >
            {isUploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            Upload
          </Button>
        </div>
      )}
    </div>
  );
}

export default function StoreGraphicsPage() {
  const params = useParams<{ appId: string; versionId: string }>();
  const appData = useApp(params.appId);
  const detail = useVersionDetail(params.appId, params.versionId);

  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  // Languages from version localizations
  const versionLanguages = useMemo(
    () =>
      (detail.data?.localizations ?? [])
        .map((l) => l.language)
        .sort(),
    [detail.data?.localizations],
  );

  const activeLang = selectedLanguage || versionLanguages[0] || "";
  const hasLanguage = !!activeLang;

  // Assets
  const featureGraphicAssets = useAssets(params.appId, {
    assetType: "featureGraphic",
    language: activeLang,
  });
  const tvBannerAssets = useAssets(params.appId, {
    assetType: "tvBanner",
    language: activeLang,
  });
  const uploadAsset = useUploadAsset(params.appId);
  const deleteAsset = useDeleteAsset(params.appId);

  const featureGraphic = (featureGraphicAssets.data ?? [])[0];
  const tvBanner = (tvBannerAssets.data ?? [])[0];

  const handleUpload = useCallback(
    (assetType: string, file: File) => {
      if (!activeLang) return;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", assetType);
      formData.append("deviceType", "universal");
      formData.append("language", activeLang);
      uploadAsset.mutate(formData);
    },
    [activeLang, uploadAsset],
  );

  const notLocalizedLanguages = useMemo(
    () =>
      APP_STORE_LANGUAGES.filter(
        (lang) => !versionLanguages.includes(lang.locale),
      ),
    [versionLanguages],
  );

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
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-8 w-1.5 rounded-full",
              STATE_COLORS[state] ?? "bg-muted-foreground",
            )}
          />
          <div>
            <h1 className="text-xl font-bold">Store Graphics</h1>
            <p className="text-sm text-muted-foreground">
              Version {versionString}
            </p>
          </div>
        </div>

        {/* Language selector */}
        <Select value={activeLang} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {versionLanguages.length > 0 && (
              <SelectGroup>
                <SelectLabel>Localized</SelectLabel>
                {versionLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {versionLanguages.length > 0 &&
              notLocalizedLanguages.length > 0 && <SelectSeparator />}
            {notLocalizedLanguages.length > 0 && (
              <SelectGroup>
                <SelectLabel>Not Localized</SelectLabel>
                {notLocalizedLanguages.map((lang) => (
                  <SelectItem key={lang.locale} value={lang.locale}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Feature Graphic */}
      <SingleAssetSection
        title="Feature Graphic"
        description="Displayed at the top of your store listing on Google Play"
        sizeHint="1024 × 500px PNG or JPEG"
        asset={featureGraphic}
        onUpload={(file) => handleUpload("featureGraphic", file)}
        onDelete={() => featureGraphic && deleteAsset.mutate(featureGraphic.id)}
        isUploading={uploadAsset.isPending}
        isDeleting={deleteAsset.isPending}
        disabled={!hasLanguage}
      />

      {/* Video / Promo URL — managed in Play Console */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Video URL</p>
            <p className="text-xs text-muted-foreground">
              Promo videos can only be managed directly in Google Play Console
            </p>
          </div>
          {appData.data?.externalId && (
            <a
              href={`https://play.google.com/console/developers/app/${appData.data.externalId}/store-listing`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open in Play Console
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* TV Banner (optional, mainly for TV apps) */}
      <SingleAssetSection
        title="TV Banner"
        description="Required for TV apps — displayed on Android TV home screen"
        sizeHint="1280 × 720px PNG or JPEG"
        asset={tvBanner}
        onUpload={(file) => handleUpload("tvBanner", file)}
        onDelete={() => tvBanner && deleteAsset.mutate(tvBanner.id)}
        isUploading={uploadAsset.isPending}
        isDeleting={deleteAsset.isPending}
        disabled={!hasLanguage}
      />
    </div>
  );
}
