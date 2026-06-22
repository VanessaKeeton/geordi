import type { ProviderAvailabilityState } from "../types";

/**
 * Chrome Built-in AI availability strings (Summarizer, LanguageModel, etc.).
 * Kept in a Chrome-only module so feature code never imports these types.
 */
export type ChromeAiAvailability =
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

export interface ChromeAiNamespace {
  Summarizer?: ChromeSummarizerApi;
  LanguageModel?: ChromeLanguageModelApi;
}

type GlobalWithChromeAi = typeof globalThis & {
  ai?: ChromeAiNamespace;
};

/** Returns Chrome's on-device AI namespace when present (Chrome 138+ experiments). */
export function getChromeAiNamespace(): ChromeAiNamespace | undefined {
  return (globalThis as GlobalWithChromeAi).ai;
}

export function mapChromeAvailability(
  providerId: string,
  chromeState: ChromeAiAvailability,
): { state: ProviderAvailabilityState; message?: string } {
  switch (chromeState) {
    case "readily":
      return { state: "available" };
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
    case "no":
    default:
      return {
        state: "unsupported",
        message: "This Chrome AI capability is not available on this device.",
      };
  }
}
