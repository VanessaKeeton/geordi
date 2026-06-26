import { describe, it, expect, afterEach, vi } from "vitest";
import { detectBrowser } from "../../../browser/detect";
import {
  canSummarizeWithSetup,
  getSummarizerSetupStatus,
} from "./summarizer-setup";
import type { ChromeAiGlobals } from "./detect";

vi.mock("../../../browser/detect", () => ({
  detectBrowser: vi.fn(() => "chrome"),
}));

describe("getSummarizerSetupStatus", () => {
  afterEach(() => {
    delete (globalThis as ChromeAiGlobals).Summarizer;
    vi.mocked(detectBrowser).mockReturnValue("chrome");
  });

  it("guides non-Chromium browsers", async () => {
    vi.mocked(detectBrowser).mockReturnValue("firefox");
    const status = await getSummarizerSetupStatus();
    expect(status.kind).toBe("unsupported-browser");
    expect(status.steps[0]).toContain("Chrome 138");
  });

  it("shows flag setup when Summarizer API is missing", async () => {
    const status = await getSummarizerSetupStatus();
    expect(status.kind).toBe("needs-flag");
    expect(status.headline).toContain("on-device summarizer");
    expect(status.steps.join(" ")).toContain("chrome://flags");
    expect(canSummarizeWithSetup(status.kind)).toBe(false);
  });

  it("reports ready when Chrome says available", async () => {
    (globalThis as ChromeAiGlobals).Summarizer = {
      availability: async () => "available",
      create: async () => ({ summarize: async () => "ok" }),
    };

    const status = await getSummarizerSetupStatus();
    expect(status.kind).toBe("ready");
    expect(status.steps).toHaveLength(0);
    expect(canSummarizeWithSetup(status.kind)).toBe(true);
  });

  it("allows summarize when model is downloadable", async () => {
    (globalThis as ChromeAiGlobals).Summarizer = {
      availability: async () => "downloadable",
      create: async () => ({ summarize: async () => "ok" }),
    };

    const status = await getSummarizerSetupStatus();
    expect(status.kind).toBe("downloadable");
    expect(canSummarizeWithSetup(status.kind)).toBe(true);
  });
});

describe("canSummarizeWithSetup", () => {
  it("blocks setup kinds that need user configuration", () => {
    expect(canSummarizeWithSetup("needs-flag")).toBe(false);
    expect(canSummarizeWithSetup("device-unsupported")).toBe(false);
  });
});
