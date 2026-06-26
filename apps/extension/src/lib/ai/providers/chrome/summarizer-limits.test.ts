import { describe, it, expect, vi } from "vitest";
import {
  CHROME_SUMMARIZER_MAX_CHARS,
  resolveChromeOutputLanguage,
  trimTextForChromeSummarizer,
} from "./summarizer-limits";
import { probeChromeSummarizerAvailability } from "./detect";
import type { ChromeSummarizerApi } from "./detect";

describe("resolveChromeOutputLanguage", () => {
  it("keeps supported languages", () => {
    expect(resolveChromeOutputLanguage("es-MX")).toBe("es");
    expect(resolveChromeOutputLanguage("ja")).toBe("ja");
  });

  it("falls back to English for unsupported page languages", () => {
    expect(resolveChromeOutputLanguage("de")).toBe("en");
    expect(resolveChromeOutputLanguage("fr-FR")).toBe("en");
  });
});

describe("trimTextForChromeSummarizer", () => {
  it("truncates long text near a word boundary", () => {
    const long = `${"word ".repeat(900)}end`;
    const trimmed = trimTextForChromeSummarizer(long);
    expect(trimmed.length).toBeLessThanOrEqual(CHROME_SUMMARIZER_MAX_CHARS);
  });
});

describe("probeChromeSummarizerAvailability", () => {
  it("uses bare availability when it succeeds", async () => {
    const availability = vi.fn(async () => "downloadable");
    const summarizer = { availability } as unknown as ChromeSummarizerApi;

    await expect(
      probeChromeSummarizerAvailability(summarizer, {
        type: "tldr",
        outputLanguage: "en",
      }),
    ).resolves.toBe("downloadable");
    expect(availability).toHaveBeenCalledTimes(1);
    expect(availability).toHaveBeenCalledWith();
  });

  it("retries with create options when bare availability is unavailable", async () => {
    const availability = vi
      .fn()
      .mockResolvedValueOnce("unavailable")
      .mockResolvedValueOnce("available");
    const summarizer = { availability } as unknown as ChromeSummarizerApi;
    const options = { type: "tldr" as const, outputLanguage: "en" };

    await expect(
      probeChromeSummarizerAvailability(summarizer, options),
    ).resolves.toBe("available");
    expect(availability).toHaveBeenNthCalledWith(1);
    expect(availability).toHaveBeenNthCalledWith(2, options);
  });
});
