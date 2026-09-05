"use client";

import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FlowSteps } from "@/components/flow-steps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/hooks/use-apps";
import { useListingList, useUpdateListing } from "@/hooks/use-listings";

/** Below this there is not enough text for the audit rules to say anything. */
const MIN_DESCRIPTION_CHARS = 40;

/**
 * Step 2 of the flow: what we pulled from the store, ready to edit. Saving
 * writes a draft - nothing is sent to the store here - and then the audit
 * (step 3) runs against it.
 */
export default function AppStartPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const router = useRouter();
  const app = useApp(appId);
  const listings = useListingList(appId);
  const updateListing = useUpdateListing(appId);

  const source = useMemo(() => {
    const all = listings.data ?? [];
    if (all.length === 0) return null;
    const draft = all.find((l) => l.source === "draft");
    if (draft) return draft;
    // Show the market the app was imported from. Falling back to the first
    // row alphabetically means a Polish import opens on the English listing,
    // and you would edit the wrong language without noticing.
    const country = app.data?.rawData?.publicCountry?.toLowerCase();
    if (country) {
      const local = all.find(
        (l) => l.language.toLowerCase().split(/[-_]/)[0] === country,
      );
      if (local) return local;
    }
    return all[0];
  }, [app.data?.rawData?.publicCountry, listings.data]);

  // Derived, not copied into state on an effect: the fields simply show the
  // store text until you type, and your edits from then on. No prefill race,
  // and nothing to clobber when the listing finishes loading.
  const [edited, setEdited] = useState<{
    description: string;
    title: string;
  } | null>(null);
  const title = edited?.title ?? source?.title ?? "";
  const description = edited?.description ?? source?.fullDesc ?? "";
  const edit = (patch: { description?: string; title?: string }) =>
    setEdited({ description, title, ...patch });

  const goToAudit = () => router.push(`/apps/${appId}/dashboard?flow=1`);

  const saveAndContinue = async () => {
    if (!source) return goToAudit();
    if (description.trim().length < MIN_DESCRIPTION_CHARS) {
      toast.error("Add a few more sentences - there is too little text to audit.");
      return;
    }
    const unchanged =
      title === (source.title ?? "") && description === (source.fullDesc ?? "");
    if (unchanged) return goToAudit();

    try {
      await updateListing.mutateAsync({
        data: { fullDesc: description, title },
        language: source.language,
      });
      toast.success("Saved as a draft. Nothing was sent to the store.");
      goToAudit();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message ? err.message : "Could not save",
      );
    }
  };

  if (app.isLoading || listings.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <FlowSteps current="text" />
      <h1 className="font-bold text-2xl tracking-tight">
        {source ? "This is what the store serves" : "Describe your app"}
      </h1>
      <p className="mt-2 text-muted-foreground text-sm">
        {source
          ? "Edit anything you want. It saves as a draft in AppBoard - nothing goes to the store until you publish."
          : "We could not read a listing for this app, so start from your own text. The audit scores what you write here."}
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {app.data?.name ?? "Your app"}
            {source && (
              <span className="ml-2 font-normal text-muted-foreground text-xs">
                {source.language}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="start-title">Title</Label>
            <Input
              id="start-title"
              value={title}
              onChange={(e) => edit({ title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start-description">Description</Label>
            <Textarea
              id="start-description"
              value={description}
              rows={12}
              onChange={(e) => edit({ description: e.target.value })}
            />
            <p className="text-muted-foreground text-xs">
              {description.length} characters
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={goToAudit}>
              Skip
            </Button>
            <Button onClick={saveAndContinue} disabled={updateListing.isPending}>
              {updateListing.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              Continue to the audit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
