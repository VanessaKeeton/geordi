import { describe, it, expect, afterEach } from "vitest";
import { createProviderRegistry } from "./create-registry";
import { mapChromeAvailability } from "./providers/chrome/detect";
import type { ChromeAiNamespace } from "./providers/chrome/detect";

describe("createProviderRegistry", () => {
  afterEach(() => {
    delete (globalThis as { ai?: ChromeAiNamespace }).ai;
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

  it("maps Chrome readily to available", () => {
    const mapped = mapChromeAvailability("chrome-summarizer", "readily");
    expect(mapped.state).toBe("available");
  });

  it("returns structured failure from unsupported summarization", async () => {
    const registry = createProviderRegistry({ browser: "safari" });
    const provider = await registry.getSummarizationProvider();
    expect(provider?.id).toBe("byok-cloud");

    const result = await provider!.summarize("hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.availability.state).toBe("requires_configuration");
    }
  });

  it("probes Chrome summarizer availability without throwing", async () => {
    (globalThis as { ai?: ChromeAiNamespace }).ai = {
      Summarizer: {
        availability: async () => "readily",
      },
    };

    const registry = createProviderRegistry({ browser: "chrome" });
    const provider = await registry.getSummarizationProvider();
    expect(provider?.id).toBe("chrome-summarizer");

    const availability = await provider!.checkAvailability();
    expect(availability.state).toBe("available");

    const result = await provider!.summarize("Article text");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("#25");
    }
  });

  it("returns downloadable message when Chrome model is not local yet", async () => {
    (globalThis as { ai?: ChromeAiNamespace }).ai = {
      Summarizer: {
        availability: async () => "after-download",
      },
    };

    const registry = createProviderRegistry({ browser: "chrome" });
    const provider = await registry.getSummarizationProvider();
    const result = await provider!.summarize("Article text");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.availability.state).toBe("downloadable");
    }
  });
});
