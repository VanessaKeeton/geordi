import { createProviderRegistry } from "../../lib/ai/create-registry";
import type { SummaryStyle } from "../../lib/ai/summarization-options";
import {
  canSummarizeWithSetup,
  getSummarizerSetupStatus,
  type SummarizerSetupStatus,
} from "../../lib/ai/providers/chrome/summarizer-setup";
import type { GeordiMessage } from "../../lib/messages";
import { toSummaryInput } from "../../lib/content/page-content";
import { resolveChromeOutputLanguage } from "../../lib/ai/providers/chrome/summarizer-limits";

export interface SummarizePageOptions {
  style: SummaryStyle;
  requestFromActiveTab: (message: GeordiMessage) => Promise<GeordiMessage>;
  onStatus: (message: string) => void;
}

export interface SummarizePageResult {
  summary: string;
  providerId: string;
}

export type { SummarizerSetupStatus };
export { getSummarizerSetupStatus, canSummarizeWithSetup };

function outputLanguageFromPage(lang?: string): string {
  return resolveChromeOutputLanguage(lang);
}

function sharedContextFromContent(content: {
  title: string;
  metadata: { description?: string; siteName?: string };
}): string | undefined {
  const parts = [
    content.title,
    content.metadata.siteName,
    content.metadata.description,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : undefined;
}

function setupBlockedMessage(status: SummarizerSetupStatus): string {
  if (status.steps.length > 0) {
    return `${status.headline} ${status.steps[0]}`;
  }
  return status.headline;
}

/** Extract page content and summarize it with the best local provider. */
export async function summarizeActivePage(
  options: SummarizePageOptions,
): Promise<SummarizePageResult> {
  const setup = await getSummarizerSetupStatus();
  if (!canSummarizeWithSetup(setup.kind)) {
    throw new Error(setupBlockedMessage(setup));
  }

  options.onStatus("Extracting page content…");
  const response = await options.requestFromActiveTab({
    type: "GET_PAGE_CONTENT",
  });

  if (response.type === "ERROR") {
    throw new Error(response.message);
  }
  if (response.type !== "PAGE_CONTENT") {
    throw new Error("Unexpected response from content script");
  }

  const { content } = response;
  if (content.status === "empty" || content.status === "failed") {
    throw new Error(content.message ?? "Could not extract page content.");
  }

  const registry = createProviderRegistry();
  const provider = await registry.getSummarizationProvider();
  if (!provider) {
    throw new Error("No summarization provider is available.");
  }

  const input = toSummaryInput(content);
  let downloadStarted = false;

  const result = await provider.summarize(input, {
    style: options.style,
    sharedContext: sharedContextFromContent(content),
    outputLanguage: outputLanguageFromPage(content.metadata.lang),
    onDownloadProgress: (percent) => {
      if (!downloadStarted) {
        downloadStarted = true;
        options.onStatus("Downloading on-device model…");
      }
      options.onStatus(`Downloading on-device model… ${percent}%`);
    },
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  if (!result.value.trim()) {
    throw new Error("Summarization returned no text.");
  }

  return { summary: result.value, providerId: provider.id };
}

/** Short status line for the summarize section header. */
export async function getSummarizeAvailabilityMessage(): Promise<string> {
  const setup = await getSummarizerSetupStatus();
  if (setup.detail) return setup.detail;
  return setup.headline;
}
