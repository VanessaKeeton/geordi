import { describe, it, expect, afterEach, vi } from "vitest";
import { buildChromeSummarizerOptions } from "../../summarization-options";
import { ChromeSummarizationProvider } from "./summarization";
import type { ChromeAiGlobals } from "./detect";

describe("buildChromeSummarizerOptions", () => {
  it("maps paragraph style to tldr", () => {
    expect(buildChromeSummarizerOptions({ style: "paragraph" })).toEqual({
      type: "tldr",
      format: "plain-text",
      length: "medium",
      outputLanguage: "en",
      sharedContext: undefined,
    });
  });

  it("maps bullets style to key-points", () => {
    expect(buildChromeSummarizerOptions({ style: "bullets" }).type).toBe(
      "key-points",
    );
  });

  it("maps takeaways style to short key-points", () => {
    expect(buildChromeSummarizerOptions({ style: "takeaways" })).toMatchObject({
      type: "key-points",
      length: "short",
    });
  });

  it("falls back to English for unsupported output languages in options", () => {
    expect(
      buildChromeSummarizerOptions({ outputLanguage: "de-DE" }).outputLanguage,
    ).toBe("en");
  });
});

describe("ChromeSummarizationProvider", () => {
  afterEach(() => {
    delete (globalThis as ChromeAiGlobals).Summarizer;
  });

  it("returns unsupported when Summarizer API is missing", async () => {
    const provider = new ChromeSummarizationProvider();
    const result = await provider.summarize("Article body");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.availability.state).toBe("unsupported");
    }
  });

  it("rejects empty input without calling Chrome APIs", async () => {
    (globalThis as ChromeAiGlobals).Summarizer = {
      availability: async () => "available",
      create: async () => ({
        summarize: async () => "Should not run",
      }),
    };

    const provider = new ChromeSummarizationProvider();
    const result = await provider.summarize("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("No text");
    }
  });

  it("summarizes text when Chrome reports available", async () => {
    const create = vi.fn(async () => ({
      summarize: async () => "Short summary.",
      destroy: async () => undefined,
    }));

    (globalThis as ChromeAiGlobals).Summarizer = {
      availability: async () => "available",
      create,
    };

    const provider = new ChromeSummarizationProvider();
    const result = await provider.summarize("Long article text.", {
      style: "paragraph",
      sharedContext: "News article",
    });

    expect(result).toEqual({ ok: true, value: "Short summary." });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tldr",
        sharedContext: "News article",
      }),
    );
  });

  it("reports download progress while creating the summarizer", async () => {
    const progress: number[] = [];

    (globalThis as ChromeAiGlobals).Summarizer = {
      availability: async () => "downloadable",
      create: async (options) => {
        options?.monitor?.({
          addEventListener: (type, listener) => {
            if (type === "downloadprogress") {
              listener({ loaded: 0.42 });
            }
          },
        });
        return {
          summarize: async () => "Done.",
        };
      },
    };

    const provider = new ChromeSummarizationProvider();
    const result = await provider.summarize("Article text.", {
      onDownloadProgress: (percent) => progress.push(percent),
    });

    expect(result.ok).toBe(true);
    expect(progress).toEqual([42]);
  });

  it("returns structured failure when summarize throws", async () => {
    (globalThis as ChromeAiGlobals).Summarizer = {
      availability: async () => "available",
      create: async () => ({
        summarize: async () => {
          throw new Error("Model error");
        },
      }),
    };

    const provider = new ChromeSummarizationProvider();
    const result = await provider.summarize("Article text.");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Model error");
    }
  });
});
