import { detectBrowser } from "../../../browser/detect";
import type { ProviderAvailabilityState } from "../../types";
import { getChromeAiGlobals, probeChromeSummarizerAvailability } from "./detect";
import { buildChromeSummarizerOptions } from "../../summarization-options";
import { mapChromeAvailability } from "./detect";

/** Why on-device summarization is not ready yet. */
export type SummarizerSetupKind =
  | "ready"
  | "downloadable"
  | "downloading"
  | "needs-flag"
  | "device-unsupported"
  | "unsupported-browser";

export interface SummarizerSetupStatus {
  kind: SummarizerSetupKind;
  headline: string;
  detail?: string;
  steps: string[];
}

const FLAG_URL = "chrome://flags/#summarization-api-for-gemini-nano";
const ON_DEVICE_URL = "chrome://on-device-internals";

function isBuiltInAiBrowser(browser: ReturnType<typeof detectBrowser>): boolean {
  return browser === "chrome" || browser === "edge";
}

function hasSummarizerApi(): boolean {
  const { Summarizer } = getChromeAiGlobals();
  return (
    "Summarizer" in globalThis &&
    typeof Summarizer?.availability === "function" &&
    typeof Summarizer?.create === "function"
  );
}

function needsFlagSteps(browser: ReturnType<typeof detectBrowser>): string[] {
  const browserName = browser === "edge" ? "Edge" : "Chrome";
  return [
    `Open ${FLAG_URL} in a new ${browserName} tab.`,
    'Search for "Summarizer" and enable "Summarization API for Gemini Nano" (or #summarization-api-for-gemini-nano).',
    `Click Relaunch at the bottom of the flags page, then reopen this side panel.`,
    `Visit ${ON_DEVICE_URL} to confirm Gemini Nano is listed.`,
    "Reload Geordi on chrome://extensions if the Summarize section still shows setup steps.",
  ];
}

function deviceUnsupportedSteps(): string[] {
  return [
    `Open ${ON_DEVICE_URL} and check whether Gemini Nano downloaded successfully.`,
    "Requires desktop Chrome 138+, macOS 13+ or Windows 10/11, ~22 GB free disk, and 16 GB RAM.",
    "If the model failed to download, free disk space and relaunch Chrome.",
    `Re-enable the summarizer flag at ${FLAG_URL} if it was turned off after an update.`,
  ];
}

function mapAvailabilityToKind(
  state: ProviderAvailabilityState,
): SummarizerSetupKind {
  switch (state) {
    case "available":
      return "ready";
    case "downloadable":
      return "downloadable";
    case "downloading":
      return "downloading";
    default:
      return "device-unsupported";
  }
}

/** Structured setup guidance for the side panel Summarize section. */
export async function getSummarizerSetupStatus(): Promise<SummarizerSetupStatus> {
  const browser = detectBrowser();

  if (!isBuiltInAiBrowser(browser)) {
    return {
      kind: "unsupported-browser",
      headline: "On-device summarization needs Chrome or Edge on desktop",
      detail: "Free summaries use the browser's built-in model — no API key.",
      steps: [
        "Use Chrome 138 or newer on a desktop computer (not phone or tablet).",
        "Install Geordi there, then follow the setup steps in the Summarize section.",
      ],
    };
  }

  if (!hasSummarizerApi()) {
    return {
      kind: "needs-flag",
      headline: "Turn on Chrome's on-device summarizer first",
      detail:
        "Geordi uses your browser's free Gemini Nano model. Chrome hides this API until you enable it once.",
      steps: needsFlagSteps(browser),
    };
  }

  try {
    const { Summarizer } = getChromeAiGlobals();
    const chromeState = await probeChromeSummarizerAvailability(
      Summarizer!,
      buildChromeSummarizerOptions(),
    );
    const mapped = mapChromeAvailability("chrome-summarizer", chromeState);
    const kind = mapAvailabilityToKind(mapped.state);

    if (kind === "ready") {
      return {
        kind,
        headline: "On-device summarization is ready",
        detail: "Summaries run locally in your browser. No API key required.",
        steps: [],
      };
    }

    if (kind === "downloadable") {
      return {
        kind,
        headline: "One-time model download required",
        detail:
          "Click Summarize page to download Gemini Nano. This stays on your device.",
        steps: [
          `If download never starts, check ${ON_DEVICE_URL}.`,
          "Use an unmetered connection for the first download.",
        ],
      };
    }

    if (kind === "downloading") {
      return {
        kind,
        headline: "Gemini Nano is downloading",
        detail: "Wait for the download to finish, then try again.",
        steps: [`Track progress at ${ON_DEVICE_URL}.`],
      };
    }

    return {
      kind: "device-unsupported",
      headline: "Gemini Nano is not available on this device",
      steps: deviceUnsupportedSteps(),
    };
  } catch {
    return {
      kind: "needs-flag",
      headline: "Could not reach Chrome's summarizer",
      detail: "The built-in API may be disabled or still starting after a Chrome update.",
      steps: needsFlagSteps(browser),
    };
  }
}

export function canSummarizeWithSetup(kind: SummarizerSetupKind): boolean {
  return kind === "ready" || kind === "downloadable" || kind === "downloading";
}
