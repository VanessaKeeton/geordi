import { describe, it, expect, afterEach } from "vitest";
import { createProviderRegistry } from "./create-registry";
import { mapChromeAvailability } from "./providers/chrome/detect";
import type { ChromeAiGlobals } from "./providers/chrome/detect";

describe("createProviderRegistry", () => {
  afterEach(() => {
    delete (globalThis as ChromeAiGlobals).Summarizer;
    delete (globalThis as ChromeAiGlobals).LanguageModel;
  });

  it("registers web speech read-aloud on all browsers", async () => {
    const registry = createProviderRegistry({ browser: "firefox" });
    const readAloud = await registry.listAvailability("readAloud");
    expect(readAloud).toHaveLength(1);
    expect(readAloud[0]?.providerId).toBe("web-speech");
  });

  it("uses unsupported summarization on non-Chrome browsers", async () => {
    const registry = createProviderRegistry({ browser: "firefox" });
    const items = await registry.listAvailability("summarization");
    const ids = items.map((item) => item.providerId);
    expect(ids).toContain("unsupported-summarization");
    expect(ids).toContain("byok-cloud");
    expect(ids).not.toContain("chrome-summarizer");

    const best = await registry.bestAvailability("summarization");
    expect(best?.state).toBe("requires_configuration");
  });

  it("registers Chrome providers on Chrome", async () => {
    const registry = createProviderRegistry({ browser: "chrome" });
    const items = await registry.listAvailability("summarization");
    expect(items.some((item) => item.providerId === "chrome-summarizer")).toBe(
      true,
    );
  });

  it("maps Chrome available to available", () => {
    const mapped = mapChromeAvailability("chrome-summarizer", "available");
    expect(mapped.state).toBe("available");
  });

  it("maps older Chrome preview availability strings", () => {
    expect(mapChromeAvailability("chrome-summarizer", "readily").state).toBe(
      "available",
    );
    expect(
      mapChromeAvailability("chrome-summarizer", "after-download").state,
    ).toBe("downloadable");
    expect(mapChromeAvailability("chrome-summarizer", "no").state).toBe(
      "unsupported",
    );
  });

  it("returns structured failure from unsupported summarization", async () => {
    const registry = createProviderRegistry({ browser: "safari" });
    const provider = await registry.getSummarizationProvider();
    expect(provider?.id).toBe("unsupported-summarization");

    const result = await provider!.summarize("hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.availability.state).toBe("unsupported");
    }
  });

  it("prefers local Chrome summarizer over BYOK when Chrome API is missing", async () => {
    const registry = createProviderRegistry({ browser: "chrome" });
    const provider = await registry.getSummarizationProvider();
    expect(provider?.id).toBe("chrome-summarizer");

    const availability = await registry.bestLocalSummarizationAvailability();
    expect(availability?.providerId).toBe("chrome-summarizer");
    expect(availability?.state).toBe("unsupported");
    expect(availability?.message).not.toContain("API key");
  });

  it("probes Chrome summarizer availability without throwing", async () => {
    (globalThis as ChromeAiGlobals).Summarizer = {
      availability: async () => "available",
      create: async () => ({
        summarize: async () => "Local summary.",
        destroy: async () => undefined,
      }),
    };

    const registry = createProviderRegistry({ browser: "chrome" });
    const provider = await registry.getSummarizationProvider();
    expect(provider?.id).toBe("chrome-summarizer");

    const availability = await provider!.checkAvailability();
    expect(availability.state).toBe("available");

    const result = await provider!.summarize("Article text");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("Local summary.");
    }
  });

  it("returns downloadable message when Chrome model is not local yet", async () => {
    (globalThis as ChromeAiGlobals).Summarizer = {
      availability: async () => "downloadable",
      create: async () => ({
        summarize: async () => "Summary after download.",
      }),
    };

    const registry = createProviderRegistry({ browser: "chrome" });
    const provider = await registry.getSummarizationProvider();
    const result = await provider!.summarize("Article text");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("Summary after download.");
    }
  });

  it("probes Chrome LanguageModel for image description availability", async () => {
    (globalThis as ChromeAiGlobals).LanguageModel = {
      availability: async () => "available",
      create: async () => ({
        prompt: async () => "Rich description.",
      }),
    };

    const registry = createProviderRegistry({ browser: "chrome" });
    const provider = await registry.getImageDescriptionProvider();
    expect(provider?.id).toBe("chrome-multimodal");

    const availability = await provider!.checkAvailability();
    expect(availability.state).toBe("available");
  });

  it("returns structured failure from unsupported image description", async () => {
    const registry = createProviderRegistry({ browser: "firefox" });
    const provider = await registry.getImageDescriptionProvider();
    expect(provider?.id).toBe("unsupported-image-description");

    const result = await provider!.describeImage({
      imageDataUrl: "data:image/png;base64,abc",
      alt: "Chart",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.availability.state).toBe("unsupported");
    }
  });
});
