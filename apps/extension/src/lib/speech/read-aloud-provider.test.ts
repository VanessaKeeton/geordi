import { describe, it, expect, afterEach } from "vitest";
import { WebSpeechReadAloudProvider } from "./read-aloud-provider";

describe("WebSpeechReadAloudProvider", () => {
  const originalSpeechSynthesis = globalThis.speechSynthesis;

  afterEach(() => {
    globalThis.speechSynthesis = originalSpeechSynthesis;
  });

  it("reports available when speechSynthesis exists", async () => {
    globalThis.speechSynthesis = {
      getVoices: () => [],
    } as SpeechSynthesis;

    const provider = new WebSpeechReadAloudProvider();
    const result = await provider.checkAvailability();
    expect(result.state).toBe("available");
    expect(result.providerId).toBe("web-speech");
  });

  it("reports unsupported when speechSynthesis is missing", async () => {
    // @ts-expect-error — simulate non-browser test environment
    delete globalThis.speechSynthesis;

    const provider = new WebSpeechReadAloudProvider();
    const result = await provider.checkAvailability();
    expect(result.state).toBe("unsupported");
  });
});
