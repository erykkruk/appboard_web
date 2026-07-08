"use client";

import { useCallback, useState } from "react";

import { api } from "@/lib/api";
import type { StoreType } from "@/lib/types";

export type PipelineStage =
  | "pending"
  | "translating"
  | "keywords"
  | "release-notes"
  | "done"
  | "error";

export interface LanguageJob {
  language: string;
  stage: PipelineStage;
  /** Translated field values keyed by AI field name (title, keywords, ...). */
  result: Record<string, string>;
  error: string | null;
  /** Whether the reviewed result has been persisted to the draft. */
  saved: boolean;
}

export interface PipelineOptions {
  appId: string;
  appName: string;
  platform: string;
  sourceLanguage: string;
  /** AI field-name → source value, taken from the source-language draft. */
  sourceFields: Record<string, string>;
  /** Also call suggest-keywords and fold the result into the `keywords` field. */
  includeKeywords: boolean;
  /** Also call generate-release-notes and fold the result into `whatsNew`. */
  includeReleaseNotes: boolean;
  /** Free-text changelog used as input for release notes generation. */
  releaseNotesChanges: string;
}

type JobMap = Record<string, LanguageJob>;

function initialJob(language: string): LanguageJob {
  return {
    error: null,
    language,
    result: {},
    saved: false,
    stage: "pending",
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Map the loose app platform ("ios"/"android") to the AI keyword store type. */
function toStoreType(platform: string): StoreType {
  return platform === "ios" || platform === "app_store"
    ? "app_store"
    : "google_play";
}

/**
 * Orchestrates the per-language localization pipeline: translate → (keywords)
 * → (release notes). Each target language runs independently so a single
 * failure is isolated and the rest continue — mirroring the backend's
 * batch-report philosophy. Progress is exposed as a per-language state machine
 * that the panel renders; persistence is delegated to the caller via `onSave`.
 */
export function useLocalizationPipeline() {
  const [jobs, setJobs] = useState<JobMap>({});
  const [isRunning, setIsRunning] = useState(false);

  const patchJob = useCallback(
    (language: string, patch: Partial<LanguageJob>) => {
      setJobs((prev) => {
        const current = prev[language] ?? initialJob(language);
        return { ...prev, [language]: { ...current, ...patch } };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setJobs({});
    setIsRunning(false);
  }, []);

  const runForLanguage = useCallback(
    async (targetLanguage: string, options: PipelineOptions) => {
      patchJob(targetLanguage, {
        error: null,
        result: {},
        saved: false,
        stage: "translating",
      });

      try {
        const { translations } = await api.ai.translateLocalization({
          appId: options.appId,
          appName: options.appName,
          fields: options.sourceFields,
          platform: options.platform,
          sourceLanguage: options.sourceLanguage,
          targetLanguage,
        });

        const result: Record<string, string> = { ...translations };

        if (options.includeKeywords) {
          patchJob(targetLanguage, { stage: "keywords" });
          const description =
            result.description ||
            result.fullDescription ||
            result.shortDescription ||
            options.sourceFields.description ||
            "";
          const keywordsResponse = await api.ai.suggestKeywords({
            description,
            language: targetLanguage,
            platform: toStoreType(options.platform),
          });
          if (keywordsResponse.result.trim()) {
            result.keywords = keywordsResponse.result.trim();
          }
        }

        if (options.includeReleaseNotes && options.releaseNotesChanges.trim()) {
          patchJob(targetLanguage, { stage: "release-notes" });
          const notesResponse = await api.ai.generateReleaseNotes({
            appName: options.appName,
            changes: options.releaseNotesChanges,
          });
          if (notesResponse.result.trim()) {
            result.whatsNew = notesResponse.result.trim();
          }
        }

        patchJob(targetLanguage, { result, stage: "done" });
        return true;
      } catch (error) {
        patchJob(targetLanguage, {
          error: errorMessage(error, "Pipeline nie powiódł się"),
          stage: "error",
        });
        return false;
      }
    },
    [patchJob],
  );

  const run = useCallback(
    async (targetLanguages: string[], options: PipelineOptions) => {
      setIsRunning(true);
      setJobs(() => {
        const next: JobMap = {};
        for (const language of targetLanguages) {
          next[language] = initialJob(language);
        }
        return next;
      });

      // Sequential per language to keep AI request volume predictable and
      // surface progress one language at a time; steps within a language run
      // in order because keywords/release notes depend on the translation.
      for (const language of targetLanguages) {
        await runForLanguage(language, options);
      }

      setIsRunning(false);
    },
    [runForLanguage],
  );

  const markSaved = useCallback(
    (language: string) => {
      patchJob(language, { saved: true });
    },
    [patchJob],
  );

  const updateResultField = useCallback(
    (language: string, field: string, value: string) => {
      setJobs((prev) => {
        const current = prev[language];
        if (!current) return prev;
        return {
          ...prev,
          [language]: {
            ...current,
            result: { ...current.result, [field]: value },
            saved: false,
          },
        };
      });
    },
    [],
  );

  return {
    isRunning,
    jobs,
    markSaved,
    reset,
    run,
    updateResultField,
  };
}
