"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Loader2, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/hooks/use-apps";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useListingList, useUpdateListing } from "@/hooks/use-listings";
import { type ListingFieldSpec, listingFieldsFor } from "@/lib/listing-limits";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

type FieldKey = ListingFieldSpec["key"];
type Form = Record<FieldKey, string>;

const EMPTY: Form = {
  fullDesc: "",
  keywords: "",
  promoText: "",
  shortDesc: "",
  title: "",
  videoUrl: "",
  whatsNew: "",
};

function toForm(listing: Listing | null): Form {
  if (!listing) return EMPTY;
  return {
    fullDesc: listing.fullDesc ?? "",
    keywords: listing.keywords ?? "",
    promoText: listing.promoText ?? "",
    shortDesc: listing.shortDesc ?? "",
    title: listing.title ?? "",
    videoUrl: listing.videoUrl ?? "",
    whatsNew: listing.whatsNew ?? "",
  };
}

/**
 * The store text of one app, per language, edited as a draft. This lives on
 * the APP, not on a store version, so it works for an app added from a link
 * (which has no version at all) exactly like for an API-connected one. The
 * store is only touched from Publish.
 */
export default function TextPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const app = useApp(appId);
  const listings = useListingList(appId);
  const update = useUpdateListing(appId);

  const platform = app.data?.platform ?? "ios";
  const isPublic = app.data?.store?.connectionMode === "public";
  const fields = listingFieldsFor(platform);

  const byLanguage = useMemo(() => {
    const map = new Map<string, { draft: Listing | null; remote: Listing | null }>();
    for (const row of listings.data ?? []) {
      const entry = map.get(row.language) ?? { draft: null, remote: null };
      if (row.source === "draft") entry.draft = row;
      else entry.remote = row;
      map.set(row.language, entry);
    }
    return map;
  }, [listings.data]);

  const languages = useMemo(() => [...byLanguage.keys()].sort(), [byLanguage]);
  const importCountry = app.data?.rawData?.publicCountry?.toLowerCase();
  const defaultLanguage =
    languages.find((l) => l.toLowerCase().split(/[-_]/)[0] === importCountry) ??
    languages[0] ??
    null;

  const [picked, setPicked] = useState<string | null>(null);
  const [newLanguage, setNewLanguage] = useState("");
  const language = picked ?? defaultLanguage;

  if (app.isLoading || listings.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const addLanguage = async () => {
    const code = newLanguage.trim();
    if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(code)) {
      toast.error("Use a store language code like en-US, pl or pt-BR.");
      return;
    }
    if (byLanguage.has(code)) {
      setPicked(code);
      return;
    }
    try {
      // An empty draft PUT is how a language is born; the backend seeds it
      // from the store copy when one exists.
      await update.mutateAsync({ data: {}, language: code });
      setPicked(code);
      setNewLanguage("");
      toast.success(`${code} added as a draft`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add language");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl tracking-tight">Text and keywords</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            What people read in the store, per language. Every edit saves as a
            draft here; nothing reaches the store until you publish.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/apps/${appId}/fixes`}>Proposed fixes</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/apps/${appId}/publish`}>Publish</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {languages.map((l) => {
          const entry = byLanguage.get(l);
          return (
            <button
              key={l}
              type="button"
              onClick={() => setPicked(l)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-sm",
                l === language
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
              {entry?.draft?.isDirty && (
                <span className="ml-1.5 text-amber-500" title="Unpublished draft">
                  *
                </span>
              )}
            </button>
          );
        })}
        <div className="flex items-center gap-1">
          <Input
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            placeholder="add: de-DE"
            className="h-8 w-28"
            onKeyDown={(e) => {
              if (e.key === "Enter") addLanguage();
            }}
          />
          <Button size="sm" variant="ghost" onClick={addLanguage} disabled={update.isPending}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {language ? (
        <LanguageEditor
          key={language}
          appId={appId}
          language={language}
          fields={fields}
          isPublic={isPublic}
          draft={byLanguage.get(language)?.draft ?? null}
          remote={byLanguage.get(language)?.remote ?? null}
        />
      ) : (
        <Card>
          <CardContent className="pt-6 text-muted-foreground text-sm">
            No language yet. Add one above to start writing.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LanguageEditor({
  appId,
  language,
  fields,
  isPublic,
  draft,
  remote,
}: {
  appId: string;
  language: string;
  fields: ListingFieldSpec[];
  isPublic: boolean;
  draft: Listing | null;
  remote: Listing | null;
}) {
  const update = useUpdateListing(appId);
  const [form, setForm] = useState<Form>(() => toForm(draft ?? remote));
  const storeForm = toForm(remote);

  const { status } = useAutoSave<Form>({
    data: form,
    onSave: async (data) => {
      // Only the fields this platform has, so an iOS PUT never carries a
      // Google Play promo video and vice versa.
      const patch: Partial<Record<FieldKey, string>> = {};
      for (const f of fields) {
        // An empty field the store never had is not a change - sending it
        // would make Publish list a blank "Keywords:" row as work to do.
        if (data[f.key] === "" && storeForm[f.key] === "") continue;
        patch[f.key] = data[f.key];
      }
      await update.mutateAsync({ data: patch, language });
    },
  });

  const set = (key: FieldKey, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {language}
          {draft?.isDirty && (
            <Badge variant="outline" className="ml-2 font-normal">
              unpublished draft
            </Badge>
          )}
        </CardTitle>
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          {status === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
          {status === "saved" && <Check className="h-3 w-3 text-emerald-500" />}
          {status === "saving" ? "Saving" : status === "saved" ? "Saved as draft" : status === "error" ? "Not saved" : "Auto-saves as you type"}
        </span>
      </CardHeader>
      <CardContent className="space-y-5">
        {fields.map((f) => {
          const value = form[f.key];
          const storeValue = storeForm[f.key];
          const over = value.length > f.maxLength;
          const differs = remote !== null && value !== storeValue;
          const unreadable = isPublic && f.hiddenInPublicListing;
          return (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                <span className="flex items-center gap-2 text-xs">
                  {differs && !unreadable && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => set(f.key, storeValue)}
                      title="Put back what the store has"
                    >
                      <RotateCcw className="h-3 w-3" /> store version
                    </button>
                  )}
                  <span className={cn("tabular-nums", over ? "text-red-500" : "text-muted-foreground")}>
                    {value.length}/{f.maxLength}
                  </span>
                </span>
              </div>
              {f.multiline ? (
                <Textarea
                  id={`f-${f.key}`}
                  value={value}
                  rows={f.rows ?? 6}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={over ? "border-red-500" : undefined}
                />
              ) : (
                <Input
                  id={`f-${f.key}`}
                  value={value}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={over ? "border-red-500" : undefined}
                />
              )}
              <p className="text-muted-foreground text-xs">
                {unreadable
                  ? "Apple does not show this field publicly, so we cannot read what is live. What you type here is your draft."
                  : f.hint}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
