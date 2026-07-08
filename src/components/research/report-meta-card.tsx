"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ResearchAppMeta } from "@/lib/types";

import { formatResearchDate, STORE_LABELS } from "./shared";

export function ReportMetaCard({ meta }: { meta: ResearchAppMeta }) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center gap-4">
          {meta.icon && (
            <img src={meta.icon} alt="" className="h-14 w-14 rounded-xl" />
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{meta.title}</p>
            <p className="truncate text-sm text-muted-foreground">
              {meta.developer}
              {meta.genre ? ` · ${meta.genre}` : ""}
            </p>
            <Badge variant="secondary">{STORE_LABELS[meta.store]}</Badge>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Rating</dt>
          <dd>
            ★ {meta.rating?.toFixed(2) ?? "?"} (
            {meta.ratingsCount?.toLocaleString("en-US") ?? "?"} ratings)
          </dd>
          <dt className="text-muted-foreground">Downloads</dt>
          <dd>
            {meta.store === "playstore"
              ? `${meta.downloads ?? "?"}${
                  meta.minInstalls
                    ? ` (min. ${meta.minInstalls.toLocaleString("en-US")})`
                    : ""
                }`
              : "Not published by Apple"}
          </dd>
          <dt className="text-muted-foreground">Version</dt>
          <dd>
            v{meta.version ?? "?"}
            {meta.lastUpdate
              ? ` · updated ${formatResearchDate(meta.lastUpdate)}`
              : ""}
          </dd>
          {meta.released && (
            <>
              <dt className="text-muted-foreground">Released</dt>
              <dd>{formatResearchDate(meta.released)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Monetization</dt>
          <dd className="flex flex-wrap gap-1">
            <Badge variant="outline">
              {meta.free ? "Free" : (meta.price ?? "Paid")}
            </Badge>
            {meta.offersIAP && (
              <Badge variant="outline">
                IAP{meta.iapRange ? ` ${meta.iapRange}` : ""}
              </Badge>
            )}
            {meta.adSupported && <Badge variant="outline">Ads</Badge>}
            {meta.store === "appstore" && (
              <span className="text-xs text-muted-foreground">
                (iOS API has no IAP/ads data)
              </span>
            )}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}
