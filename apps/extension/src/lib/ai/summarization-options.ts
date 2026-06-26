import type { ChromeSummarizerCreateOptions } from "./providers/chrome/detect";
import { resolveChromeOutputLanguage } from "./providers/chrome/summarizer-limits";

/** User-facing summary styles mapped to Chrome Summarizer API types. */
export type SummaryStyle = "paragraph" | "bullets" | "takeaways";

export interface SummarizationOptions {
  style?: SummaryStyle;
  /** Background context passed to the on-device model. */
  sharedContext?: string;
  /** BCP 47 language tag for summary output. */
  outputLanguage?: string;
  /** Called with 0–100 while the on-device model downloads. */
  onDownloadProgress?: (percent: number) => void;
}

/** Map Geordi summary styles to Chrome Summarizer.create() options. */
export function buildChromeSummarizerOptions(
  options?: SummarizationOptions,
): ChromeSummarizerCreateOptions {
  const style = options?.style ?? "paragraph";
  const base: ChromeSummarizerCreateOptions = {
    format: "plain-text",
    outputLanguage: resolveChromeOutputLanguage(options?.outputLanguage),
    sharedContext: options?.sharedContext,
  };

  switch (style) {
    case "bullets":
      return { ...base, type: "key-points", length: "medium" };
    case "takeaways":
      return { ...base, type: "key-points", length: "short" };
    case "paragraph":
    default:
      return { ...base, type: "tldr", length: "medium" };
  }
}
