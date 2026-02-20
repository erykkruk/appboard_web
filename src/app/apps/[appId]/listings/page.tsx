"use client";

import { useParams } from "next/navigation";
import { Globe, Loader2, RefreshCw, Save, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CharacterCounter } from "@/components/character-counter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/hooks/use-apps";
import {
  useListing,
  useListings,
  usePublishListings,
  useSyncListings,
  useUpdateListing,
} from "@/hooks/use-listings";
import type { Listing } from "@/lib/types";

const FIELD_LIMITS: Record<
  string,
  { label: string; max: number; multiline: boolean; platforms?: string[] }
> = {
  title: { label: "Title / Name", max: 50, multiline: false },
  shortDesc: {
    label: "Short Description / Subtitle",
    max: 80,
    multiline: false,
  },
  fullDesc: {
    label: "Full Description",
    max: 4000,
    multiline: true,
  },
  whatsNew: { label: "What's New", max: 500, multiline: true },
  keywords: {
    label: "Keywords",
    max: 100,
    multiline: false,
    platforms: ["app_store"],
  },
  promoText: {
    label: "Promotional Text",
    max: 170,
    multiline: false,
    platforms: ["app_store"],
  },
};

type ListingField = keyof typeof FIELD_LIMITS;

export default function ListingsEditor() {
  const routeParams = useParams<{ appId: string }>();
  const appId = routeParams.appId;
  const app = useApp(appId);
  const listings = useListings(appId);
  const [selectedLang, setSelectedLang] = useState<string>("");
  const listing = useListing(appId, selectedLang);
  const updateListing = useUpdateListing(appId);
  const publishListings = usePublishListings(appId);
  const syncListings = useSyncListings(appId);

  const [draft, setDraft] = useState<Partial<Listing>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (listings.data?.length && !selectedLang) {
      setSelectedLang(listings.data[0].language);
    }
  }, [listings.data, selectedLang]);

  useEffect(() => {
    if (listing.data) {
      setDraft(listing.data);
      setIsDirty(false);
    }
  }, [listing.data]);

  const handleFieldChange = useCallback(
    (field: ListingField, value: string) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
    },
    [],
  );

  const handleSave = async () => {
    if (!selectedLang) return;
    try {
      await updateListing.mutateAsync({
        language: selectedLang,
        data: draft,
      });
      setIsDirty(false);
      toast.success("Listing saved");
    } catch {
      toast.error("Failed to save listing");
    }
  };

  const handlePublish = async () => {
    try {
      await publishListings.mutateAsync();
      toast.success("Listings published to store");
    } catch {
      toast.error("Failed to publish listings");
    }
  };

  const handleSync = async () => {
    try {
      await syncListings.mutateAsync();
      toast.success("Listings synced from store");
    } catch {
      toast.error("Failed to sync listings");
    }
  };

  const platform = app.data?.platform;
  const languages = listings.data?.map((l) => l.language) ?? [];

  if (listings.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (listings.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-sm text-muted-foreground">
          Failed to load listings.
        </p>
        <Button variant="outline" onClick={() => listings.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (languages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12">
        <Globe className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No listings found. Sync from store to get started.
        </p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={handleSync}
          disabled={syncListings.isPending}
        >
          {syncListings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync from Store
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={selectedLang} onValueChange={setSelectedLang}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {isDirty && (
          <Badge variant="outline" className="text-yellow-500">
            Modified
          </Badge>
        )}
        {!isDirty && listing.data && (
          <Badge variant="outline" className="text-green-500">
            Up to date
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncListings.isPending}
        >
          {syncListings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || updateListing.isPending}
        >
          {updateListing.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Draft
        </Button>
        <Button
          size="sm"
          onClick={handlePublish}
          disabled={publishListings.isPending}
        >
          {publishListings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Publish
        </Button>
      </div>

      {listing.isLoading && <Skeleton className="h-96 w-full" />}

      {listing.data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Listing — {selectedLang}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(FIELD_LIMITS).map(([field, config]) => {
              if (
                config.platforms &&
                platform &&
                !config.platforms.includes(platform)
              ) {
                return null;
              }
              const value = (draft[field as ListingField] as string) ?? "";
              return (
                <div key={field}>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      className="text-sm font-medium"
                      htmlFor={`field-${field}`}
                    >
                      {config.label}
                    </label>
                    <CharacterCounter current={value.length} max={config.max} />
                  </div>
                  {config.multiline ? (
                    <Textarea
                      id={`field-${field}`}
                      value={value}
                      onChange={(e) =>
                        handleFieldChange(field as ListingField, e.target.value)
                      }
                      className="min-h-[120px]"
                    />
                  ) : (
                    <Input
                      id={`field-${field}`}
                      value={value}
                      onChange={(e) =>
                        handleFieldChange(field as ListingField, e.target.value)
                      }
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
