import { describe, it, expect, afterEach, vi } from "vitest";
import { ChromeImageDescriptionProvider } from "./image-description";
import type { ChromeAiGlobals } from "./detect";

const SAMPLE_DATA_URL = "data:image/png;base64,AQID";

describe("ChromeImageDescriptionProvider", () => {
  afterEach(() => {
    delete (globalThis as ChromeAiGlobals).LanguageModel;
  });

  it("returns unsupported when LanguageModel API is missing", async () => {
    const provider = new ChromeImageDescriptionProvider();
    const result = await provider.describeImage({
      imageDataUrl: SAMPLE_DATA_URL,
      alt: "Chart",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.availability.state).toBe("unsupported");
    }
  });

  it("rejects input without accessible image bytes", async () => {
    (globalThis as ChromeAiGlobals).LanguageModel = {
      availability: async () => "available",
      create: async () => ({
        prompt: async () => "Should not run",
      }),
    };

    const provider = new ChromeImageDescriptionProvider();
    const result = await provider.describeImage({
      src: "https://cdn.example.com/chart.png",
      alt: "Chart",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Cross-origin");
    }
  });

  it("describes an image when Chrome reports available", async () => {
    const prompt = vi.fn(async () => "A bar chart with rising quarterly revenue.");
    const create = vi.fn(async () => ({
      prompt,
      destroy: async () => undefined,
    }));

    (globalThis as ChromeAiGlobals).LanguageModel = {
      availability: async () => "available",
      create,
    };

    const provider = new ChromeImageDescriptionProvider();
    const result = await provider.describeImage({
      imageDataUrl: SAMPLE_DATA_URL,
      alt: "Revenue chart",
      caption: "Q1 through Q4",
    });

    expect(result).toEqual({
      ok: true,
      value: "A bar chart with rising quarterly revenue.",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInputs: expect.arrayContaining([
          { type: "text" },
          { type: "image" },
        ]),
      }),
    );
    expect(prompt).toHaveBeenCalledWith([
      expect.objectContaining({
        role: "user",
        content: expect.arrayContaining([
          expect.objectContaining({ type: "text" }),
          expect.objectContaining({ type: "image" }),
        ]),
      }),
    ]);
  });

  it("returns structured failure when prompt throws", async () => {
    (globalThis as ChromeAiGlobals).LanguageModel = {
      availability: async () => "available",
      create: async () => ({
        prompt: async () => {
          throw new Error("Model error");
        },
      }),
    };

    const provider = new ChromeImageDescriptionProvider();
    const result = await provider.describeImage({
      imageDataUrl: SAMPLE_DATA_URL,
      alt: "Diagram",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Model error");
    }
  });

  it("probes multimodal availability", async () => {
    const availability = vi.fn(async () => "downloadable");
    (globalThis as ChromeAiGlobals).LanguageModel = {
      availability,
      create: async () => ({
        prompt: async () => "Description",
      }),
    };

    const provider = new ChromeImageDescriptionProvider();
    const state = await provider.checkAvailability();
    expect(state.state).toBe("downloadable");
    expect(availability).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInputs: expect.arrayContaining([{ type: "image" }]),
      }),
    );
  });
});
