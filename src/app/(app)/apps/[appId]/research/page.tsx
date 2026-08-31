"use client";

import { useParams, useSearchParams } from "next/navigation";

import { useApp } from "@/hooks/use-apps";

import { AppResearchRunTab } from "@/components/tracking/app-research-run-tab";
import { AppleImpressionsCard } from "@/components/research/apple-impressions-card";
import { CountryOpportunitySection } from "@/components/research/country-opportunity-section";
import { KeywordScoresSection } from "@/components/research/keyword-scores-section";
import { AutomationTab } from "@/components/tracking/automation-tab";
import { KeywordsRankingsTab } from "@/components/tracking/keywords-rankings-tab";
import { ResearchHistoryTab } from "@/components/tracking/research-history-tab";
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

function AppKeywordScoresTab({ appId }: { appId: string }) {
  const app = useApp(appId);
  const appstoreId =
    app.data?.platform === "ios" ? app.data.externalId : undefined;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Research</h1>
        <p className="text-muted-foreground">
          Market research, keyword rankings and automations for this app.
        </p>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="run">Research</TabsTrigger>
          <TabsTrigger value="keywords">Keywords &amp; Rankings</TabsTrigger>
          <TabsTrigger value="scores">Keyword Scores</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="mt-6">
          <AppResearchRunTab appId={appId} />
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
