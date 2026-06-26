import { availability, isUsable } from "../../availability";
import { detectBrowser } from "../../../browser/detect";
import type { SummarizationProvider } from "../../contracts";
import type { SummarizationOptions } from "../../summarization-options";
import { buildChromeSummarizerOptions } from "../../summarization-options";
import type { ProviderAvailability, ProviderResult } from "../../types";
import {
  getChromeAiGlobals,
  mapChromeAvailability,
  probeChromeSummarizerAvailability,
} from "./detect";
import {
  trimTextForChromeSummarizer,
} from "./summarizer-limits";

/**
 * Chrome Built-in Summarizer adapter — on-device Gemini Nano, no remote calls.
 * @see https://developer.chrome.com/docs/ai/summarizer-api
 */
export class ChromeSummarizationProvider implements SummarizationProvider {
  readonly id = "chrome-summarizer";

  async checkAvailability(): Promise<ProviderAvailability> {
    return this.probeAvailability();
  }

  async summarize(
    text: string,
    options?: SummarizationOptions,
  ): Promise<ProviderResult<string>> {
    const trimmed = text.trim();
    if (!trimmed) {
      const current = await this.probeAvailability(options);
      return {
        ok: false,
        availability: current,
        message: "No text to summarize.",
      };
    }

    const { Summarizer: summarizer } = getChromeAiGlobals();
    if (!summarizer?.availability || !summarizer.create) {
      const current = await this.probeAvailability(options);
      return {
        ok: false,
        availability: current,
        message:
          current.message ??
          "Chrome on-device summarization is not available in this browser.",
      };
    }

    const chromeOptions = buildChromeSummarizerOptions(options);
    const input = trimTextForChromeSummarizer(trimmed);

    try {
      const chromeState = await probeChromeSummarizerAvailability(
        summarizer,
        chromeOptions,
      );
      const mapped = mapChromeAvailability(this.id, chromeState);
      const current = availability(this.id, mapped.state, mapped.message);

      if (!isUsable(current.state) && current.state !== "downloadable") {
        return {
          ok: false,
          availability: current,
          message:
            current.message ??
            "Chrome summarization is not ready. See availability status.",
        };
      }

      const instance = await summarizer.create({
        ...chromeOptions,
        monitor: options?.onDownloadProgress
          ? (monitor) => {
              monitor.addEventListener("downloadprogress", (event) => {
                options.onDownloadProgress?.(
                  Math.round(event.loaded * 100),
                );
              });
            }
          : undefined,
      });

      try {
        const summary = await instance.summarize(input, {
          context: options?.sharedContext,
        });
        return { ok: true, value: summary.trim() };
      } finally {
        await instance.destroy?.();
      }
    } catch (error) {
      const current = await this.probeAvailability(options);
      return {
        ok: false,
        availability: current,
        message:
          error instanceof Error
            ? error.message
            : "Chrome summarization failed.",
      };
    }
  }

  private async probeAvailability(
    options?: SummarizationOptions,
  ): Promise<ProviderAvailability> {
    const { Summarizer: summarizer } = getChromeAiGlobals();
    if (!summarizer?.availability) {
      const browser = detectBrowser();
      const message =
        browser === "chrome"
          ? "Chrome on-device summarization requires Chrome 138+ with Gemini Nano. Check chrome://on-device-internals or chrome://flags for the Summarizer API."
          : "Chrome on-device summarization is not available in this browser.";
      return availability(this.id, "unsupported", message);
    }

    try {
      const chromeOptions = buildChromeSummarizerOptions(options);
      const chromeState = await probeChromeSummarizerAvailability(
        summarizer,
        chromeOptions,
      );
      const mapped = mapChromeAvailability(this.id, chromeState);
      return availability(this.id, mapped.state, mapped.message);
    } catch {
      return availability(
        this.id,
        "unsupported",
        "Could not determine Chrome summarizer availability.",
      );
    }
  }
}
