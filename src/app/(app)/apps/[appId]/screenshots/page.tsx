"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ScreenshotEditorEntry } from "@/components/screenshot-editor";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/hooks/use-apps";
import { useAssets } from "@/hooks/use-assets";
import { useVersions } from "@/hooks/use-publishing";
import { isLocalApp } from "@/lib/apps";
import { getDisplayTypeLabel } from "@/lib/screenshot-editor";

/**
 * Store display targets, in the order the stores show them. Labels come from
 * the shared helper so this screen can never drift from the editor's own
 * naming.
 */
const IOS_DEVICES = [
  "APP_IPHONE_67",
  "APP_IPHONE_65",
  "APP_IPHONE_55",
  "APP_IPAD_PRO_129",
];
const ANDROID_DEVICES = ["phone", "sevenInch", "tenInch"];

/**
 * Screenshots and the editor, scoped to the APP rather than to a store
 * version. An app added from a link has no version at all, but it does have
 * synced screenshots - this is the screen that lets you work on them.
 */
export default function AppScreenshotsPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const autoOpen = useSearchParams().get("open") === "1";
  const app = useApp(appId);
  const assets = useAssets(appId, { assetType: "screenshot" });
  const versions = useVersions(appId);

  const isIos = app.data?.platform === "ios";
  const devices = isIos ? IOS_DEVICES : ANDROID_DEVICES;

  const languages = useMemo(() => {
    const found = new Set((assets.data ?? []).map((a) => a.language));
    return found.size > 0 ? [...found].sort() : ["en-US"];
  }, [assets.data]);

  const [language, setLanguage] = useState<string | null>(null);
  const [device, setDevice] = useState<string | null>(null);
  /** Which store screenshot the editor should open on; null keeps it closed. */
  const [seed, setSeed] = useState<{ externalId: string; url: string } | null>(
    null,
  );

  const activeLanguage = language ?? languages[0];
  const forLanguage = useMemo(
    () =>
      (assets.data ?? [])
        .filter((a) => a.language === activeLanguage)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [activeLanguage, assets.data],
  );
  const activeDevice = device ?? devices[0];
  // Uploading back to the store needs an editable version; the editor itself
  // does not, so we only pass the version when one actually exists.
  const editableVersion = (versions.data ?? []).find((v) => v.isEditable);
  // "?open=1" (from the fix queue) starts on the first screenshot of the
  // language; a gallery click starts on that exact one.
  const activeSeed =
    seed ??
    (autoOpen && forLanguage[0]
      ? { externalId: forLanguage[0].externalId ?? forLanguage[0].id, url: forLanguage[0].url }
      : null);

  if (app.isLoading || assets.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-bold text-xl tracking-tight">Screenshots</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {assets.data?.length
            ? `${assets.data.length} screenshots synced from the store. Open the editor to turn them into store-ready graphics.`
            : isLocalApp(app.data)
              ? "No store screenshots yet - this app is not published. Start a scene from your own images and export it when you are ready."
              : "No screenshots synced yet. Run Sync All, or start a scene from your own images."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={activeLanguage}
          onValueChange={(v) => setLanguage(v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeDevice} onValueChange={(v) => setDevice(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d} value={d}>
                {getDisplayTypeLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* The files themselves. A link import stores them under deviceType
          "phone", not a store display type, so the gallery is keyed by
          language only - the device selector below targets the editor. */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-sm">
              In the store · {activeLanguage}
            </h2>
            <span className="text-muted-foreground text-xs">
              {forLanguage.length} screenshot{forLanguage.length === 1 ? "" : "s"}
            </span>
          </div>
          {forLanguage.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing synced for this language yet.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {forLanguage.map((asset, index) => (
                <figure key={asset.id} className="group shrink-0">
                  <button
                    type="button"
                    className="relative block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Open in the editor"
                    onClick={() =>
                      setSeed({ externalId: asset.externalId ?? asset.id, url: asset.url })
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={`Screenshot ${index + 1}`}
                      className="h-[300px] w-auto rounded-lg border border-border object-contain transition group-hover:opacity-80"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute inset-x-2 bottom-2 rounded-md bg-background/90 py-1 text-center font-medium text-xs opacity-0 transition group-hover:opacity-100">
                      Open in the editor
                    </span>
                  </button>
                  <figcaption className="mt-1 text-center text-muted-foreground text-[11px]">
                    {index + 1}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!editableVersion && (
        <Card>
          <CardContent className="pt-6 text-muted-foreground text-sm">
            This app has no editable store version, so exporting straight to the
            store is off. Everything else works: design the scenes here and
            export the files, or connect the store API to push them.
          </CardContent>
        </Card>
      )}

      <ScreenshotEditorEntry
        // Remount on a new seed so picking another thumbnail reopens fresh.
        key={activeSeed?.externalId ?? "closed"}
        appId={appId}
        versionId={editableVersion?.id}
        language={activeLanguage}
        displayType={activeDevice}
        autoOpen={activeSeed !== null}
        seedScreenshot={activeSeed}
      />
    </div>
  );
}
