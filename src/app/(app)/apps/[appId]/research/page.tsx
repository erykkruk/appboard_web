"use client";

import { useParams } from "next/navigation";

import { AppResearchRunTab } from "@/components/tracking/app-research-run-tab";
import { AutomationTab } from "@/components/tracking/automation-tab";
import { KeywordsRankingsTab } from "@/components/tracking/keywords-rankings-tab";
import { ResearchHistoryTab } from "@/components/tracking/research-history-tab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function AppResearchPage() {
  const { appId } = useParams<{ appId: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Research</h1>
        <p className="text-muted-foreground">
          Market research, keyword rankings and automations for this app.
        </p>
      </div>

      <Tabs defaultValue="run">
        <TabsList>
          <TabsTrigger value="run">Research</TabsTrigger>
          <TabsTrigger value="keywords">Keywords &amp; Rankings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="mt-6">
          <AppResearchRunTab appId={appId} />
        </TabsContent>
        <TabsContent value="keywords" className="mt-6">
          <KeywordsRankingsTab appId={appId} />
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
