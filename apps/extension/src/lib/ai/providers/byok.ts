import { requiresConfiguration } from "../availability";
import type { SummarizationProvider } from "../contracts";
import type { SummarizationOptions } from "../summarization-options";
import type { ProviderAvailability, ProviderResult } from "../types";

/**
 * Placeholder for optional BYOK / Geordi Cloud summarization (#28).
 * Never sends data — returns requires_configuration until explicitly wired.
 */
export class ByokSummarizationProvider implements SummarizationProvider {
  readonly id = "byok-cloud";

  async checkAvailability(): Promise<ProviderAvailability> {
    return requiresConfiguration(
      this.id,
      "Add your API key in settings to use cloud summarization.",
    );
  }

  async summarize(
    _text: string,
    _options?: SummarizationOptions,
  ): Promise<ProviderResult<string>> {
    const availability = await this.checkAvailability();
    return {
      ok: false,
      availability,
      message: availability.message ?? "Cloud summarization is not configured.",
    };
  }
}
