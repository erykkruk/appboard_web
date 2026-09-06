"use client";

import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { InlineDiff } from "@/components/diff/inline-diff";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AiUnlockCard } from "@/components/ai-unlock-card";
import { isLocalApp } from "@/lib/apps";
import { AiOffHint } from "@/components/write/ai-off-hint";
import { KeywordChips } from "@/components/write/keyword-chips";
import { useApp } from "@/hooks/use-apps";
import { useIsFeatureEnabled } from "@/hooks/use-features";
import { useKeywordScores } from "@/hooks/use-keyword-research";
import { useListingList } from "@/hooks/use-listings";
import {
  useApplyWrittenDescription,
  useSuggestTargetKeywords,
  useWriteDescription,
} from "@/hooks/use-write-with-ai";
import { computeDiff } from "@/lib/diff";
import type { KeywordScore } from "@/lib/types";
import {
  appPrimaryCategory,
  errorMessage,
  isAiUnavailableError,
  pickMarketListing,
  RECOMMENDED_CLASSIFICATIONS,
  splitCurrentKeywords,
} from "@/lib/write-with-ai";

/** Store limit for the long description on both platforms. */
const DESCRIPTION_MAX_CHARS = 4000;
/** Storefront to score against when the import did not pin one. */
const DEFAULT_COUNTRY = "us";

function AiError({ error }: { error: unknown }) {
  if (!error) return null;
  if (isAiUnavailableError(error)) return <AiOffHint detail={error.message} />;
  return (
    <Alert variant="destructive">
      <AlertTitle>That did not work.</AlertTitle>
      <AlertDescription>
        {errorMessage(error, "Something went wrong. Try again.")}
      </AlertDescription>
    </Alert>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="font-bold text-xl tracking-tight">Write with AI</h1>
      <p className="mt-1 text-muted-foreground text-sm">
        Pick the keywords worth targeting, then let the AI rewrite your
        description around them. Everything lands in the draft - nothing is
        sent to the store.
      </p>
    </div>
  );
}

/**
 * Three steps on one page: your description, the keywords to target, the
 * rewritten text as a diff. Only "Use this" touches the server, and it
 * writes the draft listing - the store is never called from here.
 */
export default function WriteWithAiPage() {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const aiEnabled = useIsFeatureEnabled("AI");
  const researchEnabled = useIsFeatureEnabled("RESEARCH");
  const app = useApp(appId);
  const listings = useListingList(appId);
  const suggest = useSuggestTargetKeywords();
  const scoring = useKeywordScores();
  const write = useWriteDescription();
  const apply = useApplyWrittenDescription(appId);

  const publicCountry = app.data?.rawData?.publicCountry;
  const source = useMemo(
    () => pickMarketListing(listings.data ?? [], publicCountry),
    [listings.data, publicCountry],
  );

  // Derived, not copied on an effect: the store text until you type, your
  // edits from then on, so a late-arriving listing never clobbers them.
  const [edited, setEdited] = useState<string | null>(null);
  const description = edited ?? source?.fullDesc ?? "";
  const brief = description.trim();

  const [keywords, setKeywords] = useState<string[]>([]);
  const [scores, setScores] = useState<Record<string, KeywordScore>>({});
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  // Once you have toggled a chip, late scores must not redo your picks.
  const touchedRef = useRef(false);
  const [generated, setGenerated] = useState<string | null>(null);

  const isIos = app.data?.platform === "ios";
  const canScore = isIos && researchEnabled;
  const selectedKeywords = keywords.filter((k) => selected.has(k));

  const diff = useMemo(
    () => (generated === null ? null : computeDiff(description, generated)),
    [description, generated],
  );

  const toggleKeyword = (keyword: string) => {
    touchedRef.current = true;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  const scoreKeywords = (found: string[]) => {
    scoring.mutate(
      {
        appstoreId: app.data?.externalId,
        country: publicCountry ?? DEFAULT_COUNTRY,
        keywords: found,
      },
      {
        onSuccess: (result) => {
          const byKeyword = Object.fromEntries(
            result.map((s) => [s.keyword.toLowerCase(), s]),
          );
          setScores(byKeyword);
          const winners = found.filter((k) => {
            const classification = byKeyword[k]?.classification;
            return classification
              ? RECOMMENDED_CLASSIFICATIONS.has(classification)
              : false;
          });
          if (winners.length > 0 && !touchedRef.current) {
            setSelected(new Set(winners));
          }
        },
      },
    );
  };

  const findTargets = () => {
    if (!app.data) return;
    setGenerated(null);
    setScores({});
    touchedRef.current = false;
    suggest.mutate(
      {
        appName: app.data.name,
        category: appPrimaryCategory(app.data),
        currentKeywords: splitCurrentKeywords(source?.keywords),
        description: brief || undefined,
      },
      {
        onSuccess: (found) => {
          setKeywords(found);
          setSelected(new Set(found));
          if (found.length > 0 && canScore) scoreKeywords(found);
        },
      },
    );
  };

  const writeDescription = () => {
    if (!app.data || !brief) return;
    write.mutate(
      {
        appName: app.data.name,
        keywords: selectedKeywords,
        platform: app.data.platform,
        prompt: brief,
      },
      { onSuccess: (text) => setGenerated(text) },
    );
  };

  const acceptGenerated = async () => {
    if (!source || generated === null) return;
    await apply.mutateAsync({ fullDesc: generated, language: source.language });
    setEdited(generated);
    setGenerated(null);
  };

  if (!aiEnabled) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
        <PageHeader />
        <AiOffHint
          detail="The AI feature is switched off for this workspace. Turn it on under Settings, Features."
          href="/settings/features"
        />
      </div>
    );
  }

  if (app.isLoading || listings.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const canFindTargets = !!app.data && !suggest.isPending;
  const canWrite =
    !!source && brief.length > 0 && selectedKeywords.length > 0 && !write.isPending;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <PageHeader />
      <AiUnlockCard />

      <Card>
        <CardHeader>
          <CardTitle>1. Your description</CardTitle>
          <CardDescription>
            {source
              ? "The text the AI starts from. Edit it freely - nothing is saved until you accept a rewrite in step 3."
              : (isLocalApp(app.data) ? "No text yet. Write a first description in Text & keywords, then come back - the AI needs something to start from." : "No listing text synced yet. Run Sync All or add the app from a store link, then come back.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {source && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{source.language}</Badge>
              <Badge variant="secondary">
                {source.source === "draft" ? "Draft" : "In the store"}
              </Badge>
            </div>
          )}
          <Textarea
            value={description}
            onChange={(e) => setEdited(e.target.value)}
            disabled={!source}
            placeholder="Describe what the app does in a few sentences."
            className="min-h-64"
            maxLength={DESCRIPTION_MAX_CHARS}
          />
          <p className="text-right text-muted-foreground text-xs">
            {description.length} / {DESCRIPTION_MAX_CHARS}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. What am I targeting?</CardTitle>
          <CardDescription>
            Keyword ideas from your description. Tap a chip to include or
            leave out a keyword; the selected ones shape the rewrite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={findTargets} disabled={!canFindTargets}>
            {suggest.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            What am I targeting?
          </Button>

          <AiError error={suggest.error} />

          {suggest.isSuccess && keywords.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No usable keywords came back. Add a few sentences about what the
              app does and try again.
            </p>
          )}

          {keywords.length > 0 && (
            <>
              <KeywordChips
                keywords={keywords}
                onToggle={toggleKeyword}
                scores={scores}
                scoring={scoring.isPending}
                selected={selected}
              />
              <p className="text-muted-foreground text-xs">
                {!isIos
                  ? "Difficulty is not available for Google Play."
                  : !researchEnabled
                    ? "Keyword scores need the Research feature, which is off for this workspace."
                    : Object.keys(scores).length > 0
                      ? `Scored against the ${(publicCountry ?? DEFAULT_COUNTRY).toUpperCase()} App Store. Recommended keywords were pre-selected.`
                      : null}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Write a description for these keywords</CardTitle>
          <CardDescription>
            A new description built around your picks, shown against the
            current text. Accept it and it becomes the draft for{" "}
            {source?.language ?? "this language"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedKeywords.map((keyword) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Pick at least one keyword in step 2 first.
            </p>
          )}

          <Button onClick={writeDescription} disabled={!canWrite}>
            {write.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            Write a description for these keywords
          </Button>

          <AiError error={write.error} />

          {generated !== null && diff && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold text-sm">What changes</h3>
                <div className="max-h-[480px] overflow-auto rounded-lg border bg-muted/30 p-3">
                  <InlineDiff
                    segments={diff.segments}
                    mode={diff.mode === "line" ? "line-by-line" : "inline"}
                  />
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-sm">The new text</h3>
                <pre className="whitespace-pre-wrap break-words rounded-lg border p-3 font-sans text-sm">
                  {generated}
                </pre>
                <p className="mt-1 text-right text-muted-foreground text-xs">
                  {generated.length} / {DESCRIPTION_MAX_CHARS}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={acceptGenerated} disabled={apply.isPending}>
                  {apply.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check />
                  )}
                  Use this
                </Button>
                <Button
                  variant="outline"
                  onClick={writeDescription}
                  disabled={!canWrite}
                >
                  <RefreshCw />
                  Try again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
