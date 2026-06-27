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

export type ChromeSummarizerType = "key-points" | "tldr" | "teaser" | "headline";
export type ChromeSummarizerFormat = "markdown" | "plain-text";
export type ChromeSummarizerLength = "short" | "medium" | "long";

export interface ChromeSummarizerCreateOptions {
  type?: ChromeSummarizerType;
  format?: ChromeSummarizerFormat;
  length?: ChromeSummarizerLength;
  sharedContext?: string;
  outputLanguage?: string;
  monitor?: (monitor: ChromeDownloadMonitor) => void;
}

export interface ChromeDownloadProgressEvent {
  loaded: number;
}

export interface ChromeDownloadMonitor {
  addEventListener(
    type: "downloadprogress",
    listener: (event: ChromeDownloadProgressEvent) => void,
  ): void;
}

export interface ChromeSummarizerInstance {
  summarize(
    input: string,
    options?: { context?: string },
  ): Promise<string>;
  destroy?(): Promise<void>;
}

export interface ChromeSummarizerApi {
  availability(
    options?: ChromeSummarizerCreateOptions,
  ): Promise<ChromeAiAvailability>;
  create(
    options?: ChromeSummarizerCreateOptions,
  ): Promise<ChromeSummarizerInstance>;
}

export interface ChromePromptContentPart {
  type: "text" | "image";
  value: string | Blob;
}

export interface ChromePromptMessage {
  role: "user" | "assistant" | "system";
  content: string | ChromePromptContentPart[];
}

export interface ChromeLanguageModelCreateOptions {
  expectedInputs?: Array<{ type: "text" | "image" | "audio"; languages?: string[] }>;
  expectedOutputs?: Array<{ type: "text"; languages?: string[] }>;
  initialPrompts?: ChromePromptMessage[];
  monitor?: (monitor: ChromeDownloadMonitor) => void;
}

export interface ChromeLanguageModelSession {
  prompt(input: string | ChromePromptMessage[]): Promise<string>;
  destroy?(): Promise<void>;
}

export interface ChromeLanguageModelApi {
  availability(): Promise<ChromeAiAvailability>;
  availability(
    options?: ChromeLanguageModelCreateOptions,
  ): Promise<ChromeAiAvailability>;
  create(
    options?: ChromeLanguageModelCreateOptions,
  ): Promise<ChromeLanguageModelSession>;
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
        message:
          "A one-time on-device model download is required. No API key needed.",
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
        message:
          "Gemini Nano is not available on this device. Needs Chrome 138+ on desktop, ~22 GB free disk, and 16 GB RAM. Check chrome://on-device-internals and chrome://flags (#summarization-api-for-gemini-nano).",
      };
  }
}

/**
 * Probe Summarizer availability the way Chrome's official extension sample does:
 * call without options first, then with create options if needed.
 */
export async function probeChromeSummarizerAvailability(
  summarizer: ChromeSummarizerApi,
  createOptions?: ChromeSummarizerCreateOptions,
): Promise<ChromeAiAvailability> {
  const bare = await summarizer.availability();
  if (bare !== "unavailable" && bare !== "no") {
    return bare;
  }

  if (!createOptions) return bare;

  return summarizer.availability(createOptions);
}
