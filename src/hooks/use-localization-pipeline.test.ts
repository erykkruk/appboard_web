import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook, waitFor } from "@testing-library/react";

import type { PipelineOptions } from "@/hooks/use-localization-pipeline";

// --- Mock the API client used by the pipeline ---

const translateLocalization = mock(
  async ({ targetLanguage }: { targetLanguage: string }) => ({
    model: "test",
    translations: {
      keywords: `kw-${targetLanguage}`,
      title: `title-${targetLanguage}`,
    },
  }),
);
const suggestKeywords = mock(async () => ({
  mock: false,
  model: "test",
  result: "ai, keywords, suggested",
}));
const generateReleaseNotes = mock(async () => ({
  mock: false,
  model: "test",
  result: "What's new in this version.",
}));

mock.module("@/lib/api", () => ({
  api: {
    ai: {
      generateReleaseNotes,
      suggestKeywords,
      translateLocalization,
    },
  },
}));

const { useLocalizationPipeline } = await import(
  "@/hooks/use-localization-pipeline"
);

function baseOptions(overrides: Partial<PipelineOptions> = {}): PipelineOptions {
  return {
    appId: "app-1",
    appName: "My App",
    includeKeywords: false,
    includeReleaseNotes: false,
    platform: "ios",
    releaseNotesChanges: "",
    sourceFields: { description: "desc", title: "Title" },
    sourceLanguage: "en-US",
    ...overrides,
  };
}

beforeEach(() => {
  translateLocalization.mockClear();
  suggestKeywords.mockClear();
  generateReleaseNotes.mockClear();
});

afterEach(() => {
  translateLocalization.mockReset();
  suggestKeywords.mockReset();
  generateReleaseNotes.mockReset();
  // Restore default success implementations for the next test.
  translateLocalization.mockImplementation(
    async ({ targetLanguage }: { targetLanguage: string }) => ({
      model: "test",
      translations: {
        keywords: `kw-${targetLanguage}`,
        title: `title-${targetLanguage}`,
      },
    }),
  );
  suggestKeywords.mockImplementation(async () => ({
    mock: false,
    model: "test",
    result: "ai, keywords, suggested",
  }));
  generateReleaseNotes.mockImplementation(async () => ({
    mock: false,
    model: "test",
    result: "What's new in this version.",
  }));
});

describe("useLocalizationPipeline", () => {
  test("translates each target language and ends in the done stage", async () => {
    const { result } = renderHook(() => useLocalizationPipeline());

    await act(async () => {
      await result.current.run(["pl", "de-DE"], baseOptions());
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    expect(result.current.jobs.pl?.stage).toBe("done");
    expect(result.current.jobs["de-DE"]?.stage).toBe("done");
    expect(result.current.jobs.pl?.result.title).toBe("title-pl");
    expect(translateLocalization).toHaveBeenCalledTimes(2);
  });

  test("folds suggested keywords and release notes into the result", async () => {
    const { result } = renderHook(() => useLocalizationPipeline());

    await act(async () => {
      await result.current.run(
        ["pl"],
        baseOptions({
          includeKeywords: true,
          includeReleaseNotes: true,
          releaseNotesChanges: "- fix bugs",
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.jobs.pl?.stage).toBe("done");
    });

    expect(suggestKeywords).toHaveBeenCalledTimes(1);
    expect(generateReleaseNotes).toHaveBeenCalledTimes(1);
    expect(result.current.jobs.pl?.result.keywords).toBe(
      "ai, keywords, suggested",
    );
    expect(result.current.jobs.pl?.result.whatsNew).toBe(
      "What's new in this version.",
    );
  });

  test("isolates a failing language while the others succeed", async () => {
    translateLocalization.mockImplementation(
      async ({ targetLanguage }: { targetLanguage: string }) => {
        if (targetLanguage === "pl") {
          throw new Error("AI unavailable");
        }
        return {
          model: "test",
          translations: { title: `title-${targetLanguage}` },
        };
      },
    );

    const { result } = renderHook(() => useLocalizationPipeline());

    await act(async () => {
      await result.current.run(["pl", "de-DE"], baseOptions());
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });

    expect(result.current.jobs.pl?.stage).toBe("error");
    expect(result.current.jobs.pl?.error).toBe("AI unavailable");
    expect(result.current.jobs["de-DE"]?.stage).toBe("done");
  });

  test("markSaved flags a language and reset clears all jobs", async () => {
    const { result } = renderHook(() => useLocalizationPipeline());

    await act(async () => {
      await result.current.run(["pl"], baseOptions());
    });

    act(() => {
      result.current.markSaved("pl");
    });
    expect(result.current.jobs.pl?.saved).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(Object.keys(result.current.jobs)).toHaveLength(0);
  });

  test("updateResultField edits a result and clears the saved flag", async () => {
    const { result } = renderHook(() => useLocalizationPipeline());

    await act(async () => {
      await result.current.run(["pl"], baseOptions());
    });
    act(() => {
      result.current.markSaved("pl");
    });

    act(() => {
      result.current.updateResultField("pl", "title", "Edited title");
    });

    expect(result.current.jobs.pl?.result.title).toBe("Edited title");
    expect(result.current.jobs.pl?.saved).toBe(false);
  });
});
