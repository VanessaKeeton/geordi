import type { ProviderAvailabilityState } from "../../types";

/**
 * Chrome Built-in AI availability strings (Summarizer, LanguageModel, etc.).
 * Kept in a Chrome-only module so feature code never imports these types.
 */
export type ChromeAiAvailability =
  | "available"
  | "downloadable"
  | "unavailable"
  | "readily"
  | "after-download"
  | "downloading"
  | "no"
  | (string & {});

export interface ChromeSummarizerApi {
  availability(): Promise<ChromeAiAvailability>;
}

export interface ChromeLanguageModelApi {
  availability(): Promise<ChromeAiAvailability>;
}

export interface ChromeAiGlobals {
  Summarizer?: ChromeSummarizerApi;
  LanguageModel?: ChromeLanguageModelApi;
}

type GlobalWithChromeAi = typeof globalThis & {
  Summarizer?: ChromeSummarizerApi;
  LanguageModel?: ChromeLanguageModelApi;
};

/** Returns Chrome's on-device AI globals when present (Chrome 138+). */
export function getChromeAiGlobals(): ChromeAiGlobals {
  const chromeGlobal = globalThis as GlobalWithChromeAi;
  return {
    Summarizer: chromeGlobal.Summarizer,
    LanguageModel: chromeGlobal.LanguageModel,
  };
}

export function mapChromeAvailability(
  _providerId: string,
  chromeState: ChromeAiAvailability,
): { state: ProviderAvailabilityState; message?: string } {
  switch (chromeState) {
    case "available":
    case "readily":
      return { state: "available" };
    case "downloadable":
    case "after-download":
      return {
        state: "downloadable",
        message: "A one-time on-device model download is required.",
      };
    case "downloading":
      return {
        state: "downloading",
        message: "The on-device model is downloading.",
      };
    case "unavailable":
    case "no":
    default:
      return {
        state: "unsupported",
        message: "This Chrome AI capability is not available on this device.",
      };
  }
}
