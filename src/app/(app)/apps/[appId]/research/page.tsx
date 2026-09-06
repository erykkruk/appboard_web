"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useApp } from "@/hooks/use-apps";
import { isLocalApp } from "@/lib/apps";

import { AppResearchRunTab } from "@/components/tracking/app-research-run-tab";
import { AppleImpressionsCard } from "@/components/research/apple-impressions-card";
import { CountryOpportunitySection } from "@/components/research/country-opportunity-section";
import { KeywordScoresSection } from "@/components/research/keyword-scores-section";
import { AutomationTab } from "@/components/tracking/automation-tab";
import { KeywordsRankingsTab } from "@/components/tracking/keywords-rankings-tab";
import { ResearchHistoryTab } from "@/components/tracking/research-history-tab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const RESEARCH_TABS = [
  "run",
  "keywords",
  "scores",
  "history",
  "automation",
] as const;
type ResearchTab = (typeof RESEARCH_TABS)[number];

/**
 * Research reads the store page, so an app that is in no store yet has
 * nothing to scrape. Keyword scoring only needs the search results, so that
 * is the useful place to send someone building a listing from scratch.
 */
function NotInStoreCard({ onScoreKeywords }: { onScoreKeywords: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Research starts on the store page</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="max-w-xl text-muted-foreground">
          This app is not in a store yet, so there are no reviews or metadata
          to read. What works today: score the keywords you are considering
          for the title and subtitle, and track them so positions appear the
          day the app goes live.
        </p>
        <Button size="sm" onClick={onScoreKeywords}>
          Score keywords
        </Button>
      </CardContent>
    </Card>
  );
}

function AppKeywordScoresTab({ appId }: { appId: string }) {
  const app = useApp(appId);
  // A local app's id is not a store id: score without a "your rank" column.
  const appstoreId =
    app.data?.platform === "ios" && !isLocalApp(app.data)
      ? app.data.externalId
      : undefined;
  return (
    <div className="space-y-10">
      <KeywordScoresSection appstoreId={appstoreId} />
      <CountryOpportunitySection appstoreId={appstoreId} />
      <AppleImpressionsCard appId={appId} />
    </div>
  );
}

export default function AppResearchPage() {
  const { appId } = useParams<{ appId: string }>();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: ResearchTab = RESEARCH_TABS.includes(
    tabParam as ResearchTab,
  )
    ? (tabParam as ResearchTab)
    : "run";
  const [tab, setTab] = useState<ResearchTab>(initialTab);
  const app = useApp(appId);
  const notInStore = isLocalApp(app.data);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Research</h1>
        <p className="text-muted-foreground">
          Market research, keyword rankings and automations for this app.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ResearchTab)}>
        <TabsList>
          <TabsTrigger value="run">Research</TabsTrigger>
          <TabsTrigger value="keywords">Keywords &amp; Rankings</TabsTrigger>
          <TabsTrigger value="scores">Keyword Scores</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="mt-6">
          {notInStore ? (
            <NotInStoreCard onScoreKeywords={() => setTab("scores")} />
          ) : (
            <AppResearchRunTab appId={appId} />
          )}
        </TabsContent>
        <TabsContent value="keywords" className="mt-6">
          <KeywordsRankingsTab appId={appId} />
        </TabsContent>
        <TabsContent value="scores" className="mt-6">
          <AppKeywordScoresTab appId={appId} />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <ResearchHistoryTab appId={appId} />
        </TabsContent>
        <TabsContent value="automation" className="mt-6">
          <AutomationTab appId={appId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
