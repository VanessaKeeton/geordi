import { availability } from "../../availability";
import type { SummarizationProvider } from "../../contracts";
import type { ProviderAvailability, ProviderResult } from "../../types";
import {
  getChromeAiGlobals,
  mapChromeAvailability,
} from "./detect";

/**
 * Chrome Built-in Summarizer adapter (#25 will implement summarize()).
 * Availability probing only — no page text leaves the extension.
 */
export class ChromeSummarizationProvider implements SummarizationProvider {
  readonly id = "chrome-summarizer";

  async checkAvailability(): Promise<ProviderAvailability> {
    const { Summarizer: summarizer } = getChromeAiGlobals();
    if (!summarizer?.availability) {
      return availability(
        this.id,
        "unsupported",
        "Chrome on-device summarization is not available in this browser.",
      );
    }

    try {
      const chromeState = await summarizer.availability();
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

  async summarize(_text: string): Promise<ProviderResult<string>> {
    const current = await this.checkAvailability();
    if (current.state !== "available" && current.state !== "downloading") {
      return {
        ok: false,
        availability: current,
        message:
          current.message ??
          "Chrome summarization is not ready. See availability status.",
      };
    }

    return {
      ok: false,
      availability: current,
      message: "Summarization implementation is tracked in #25.",
    };
  }
}
