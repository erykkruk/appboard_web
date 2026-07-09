"use client";

import { useState } from "react";

import { PageHeader } from "@/components/page-header";
import { AnalysisOptionsSection } from "@/components/research/analysis-options-section";
import { AppListSection } from "@/components/research/app-list-section";
import { AppReport } from "@/components/research/app-report";
import { STORE_SHORT_LABELS } from "@/components/research/shared";
import {
  SavedResearchList,
  SaveResearchButton,
} from "@/components/research/standalone-history";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useResearchAppList, useResearchPipeline } from "@/hooks/use-research";
import { RESEARCH_COUNTRIES } from "@/lib/research";

const TAB_TITLE_MAX_CHARS = 24;

export default function ResearchPage() {
  const list = useResearchAppList();
  const pipeline = useResearchPipeline();
  const [country, setCountry] = useState<string>(RESEARCH_COUNTRIES[0]);
  const [deep, setDeep] = useState(false);
  const [activeTab, setActiveTab] = useState("");

  const selected = list.apps.filter((app) => app.checked);

  async function runAnalysis() {
    setActiveTab("");
    await pipeline.run(selected, { country, deep });
  }

  const results = pipeline.results;
  const currentTab =
    activeTab && results.some((r) => r.key === activeTab)
      ? activeTab
      : (results[0]?.key ?? "");

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Research"
        description="Analyze store reviews, ASO keywords, markets and competitors for any app"
      />
      <div>
        <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <AppListSection
              apps={list.apps}
              country={country}
              onAdd={list.add}
              onRemove={list.remove}
              onToggle={list.toggle}
            />

            <AnalysisOptionsSection
              country={country}
              deep={deep}
              onCountryChange={setCountry}
              onDeepChange={setDeep}
              onRun={runAnalysis}
              progress={pipeline.progress}
              running={pipeline.running}
              selectedCount={selected.length}
            />
          </div>

          {results.length > 0 && (
            <Tabs value={currentTab} onValueChange={setActiveTab}>
              <TabsList className="h-auto flex-wrap">
                {results.map((result) => (
                  <TabsTrigger key={result.key} value={result.key}>
                    {result.meta.title.slice(0, TAB_TITLE_MAX_CHARS)} (
                    {STORE_SHORT_LABELS[result.meta.store]})
                  </TabsTrigger>
                ))}
              </TabsList>
              {results.map((result) => (
                <TabsContent key={result.key} value={result.key}>
                  <div className="mb-4 flex justify-end">
                    <SaveResearchButton country={country} result={result} />
                  </div>
                  <AppReport country={country} result={result} />
                </TabsContent>
              ))}
            </Tabs>
          )}

          <SavedResearchList />
        </div>
      </div>
    </div>
  );
}
