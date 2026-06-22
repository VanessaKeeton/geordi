import { unsupported } from "../availability";
import type { SummarizationProvider, ImageDescriptionProvider } from "../contracts";
import type { ImageDescriptionInput, ProviderAvailability, ProviderResult } from "../types";

function unavailableResult<T>(
  availability: ProviderAvailability,
  message: string,
): ProviderResult<T> {
  return { ok: false, availability, message };
}

export class UnsupportedSummarizationProvider implements SummarizationProvider {
  readonly id: string;

  constructor(id = "unsupported-summarization") {
    this.id = id;
  }

  async checkAvailability(): Promise<ProviderAvailability> {
    return unsupported(
      this.id,
      "Page summarization is not available in this browser yet.",
    );
  }

  async summarize(_text: string): Promise<ProviderResult<string>> {
    const availability = await this.checkAvailability();
    return unavailableResult(
      availability,
      availability.message ?? "Summarization is unsupported.",
    );
  }
}

export class UnsupportedImageDescriptionProvider
  implements ImageDescriptionProvider
{
  readonly id: string;

  constructor(id = "unsupported-image-description") {
    this.id = id;
  }

  async checkAvailability(): Promise<ProviderAvailability> {
    return unsupported(
      this.id,
      "Rich image descriptions are not available in this browser yet.",
    );
  }

  async describeImage(
    _input: ImageDescriptionInput,
  ): Promise<ProviderResult<string>> {
    const availability = await this.checkAvailability();
    return unavailableResult(
      availability,
      availability.message ?? "Image description is unsupported.",
    );
  }
}
