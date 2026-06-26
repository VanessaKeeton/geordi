import { describe, it, expect } from "vitest";
import { buildChromeSummarizerOptions } from "./summarization-options";

describe("summarization-options", () => {
  it("uses plain-text output for accessibility", () => {
    expect(buildChromeSummarizerOptions().format).toBe("plain-text");
  });

  it("passes through output language and shared context", () => {
    expect(
      buildChromeSummarizerOptions({
        outputLanguage: "es",
        sharedContext: "Product documentation",
      }),
    ).toMatchObject({
      outputLanguage: "es",
      sharedContext: "Product documentation",
    });
  });
});
