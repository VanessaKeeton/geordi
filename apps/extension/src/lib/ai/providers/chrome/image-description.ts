import { availability, isUsable } from "../../availability";
import {
  buildImageDescriptionPrompt,
  dataUrlToBlob,
  validateImageDescriptionInput,
} from "../../image-description-input";
import type { ImageDescriptionProvider } from "../../contracts";
import type {
  ImageDescriptionInput,
  ProviderAvailability,
  ProviderResult,
} from "../../types";
import {
  getChromeAiGlobals,
  mapChromeAvailability,
  type ChromeLanguageModelCreateOptions,
} from "./detect";

const IMAGE_MODEL_OPTIONS: ChromeLanguageModelCreateOptions = {
  expectedInputs: [{ type: "text" }, { type: "image" }],
  expectedOutputs: [{ type: "text" }],
};

/**
 * Chrome Prompt API adapter for on-device multimodal image description.
 * @see https://developer.chrome.com/docs/ai/prompt-api
 */
export class ChromeImageDescriptionProvider implements ImageDescriptionProvider {
  readonly id = "chrome-multimodal";

  async checkAvailability(): Promise<ProviderAvailability> {
    return this.probeAvailability();
  }

  async describeImage(
    input: ImageDescriptionInput,
  ): Promise<ProviderResult<string>> {
    const validation = validateImageDescriptionInput(input);
    if (!validation.ok) {
      const current = await this.probeAvailability();
      return {
        ok: false,
        availability: current,
        message: validation.message ?? "Image is not suitable for description.",
      };
    }

    const { LanguageModel: languageModel } = getChromeAiGlobals();
    if (!languageModel?.availability || !languageModel.create) {
      const current = await this.probeAvailability();
      return {
        ok: false,
        availability: current,
        message:
          current.message ??
          "Chrome on-device image description is not available in this browser.",
      };
    }

    const imageDataUrl = input.imageDataUrl?.trim();
    if (!imageDataUrl) {
      const current = await this.probeAvailability();
      return {
        ok: false,
        availability: current,
        message:
          "Image pixels could not be read locally. Cross-origin images stay private and are not fetched over the network.",
      };
    }

    try {
      const chromeState = await languageModel.availability(IMAGE_MODEL_OPTIONS);
      const mapped = mapChromeAvailability(this.id, chromeState);
      const current = availability(this.id, mapped.state, mapped.message);

      if (!isUsable(current.state) && current.state !== "downloadable") {
        return {
          ok: false,
          availability: current,
          message:
            current.message ??
            "Chrome image description is not ready. See availability status.",
        };
      }

      const session = await languageModel.create(IMAGE_MODEL_OPTIONS);
      try {
        const description = await session.prompt([
          {
            role: "user",
            content: [
              {
                type: "text",
                value: buildImageDescriptionPrompt(input),
              },
              {
                type: "image",
                value: dataUrlToBlob(imageDataUrl),
              },
            ],
          },
        ]);

        const trimmed = description.trim();
        if (!trimmed) {
          return {
            ok: false,
            availability: current,
            message: "Chrome returned an empty image description.",
          };
        }

        return { ok: true, value: trimmed };
      } finally {
        await session.destroy?.();
      }
    } catch (error) {
      const current = await this.probeAvailability();
      return {
        ok: false,
        availability: current,
        message:
          error instanceof Error
            ? error.message
            : "Chrome image description failed.",
      };
    }
  }

  private async probeAvailability(): Promise<ProviderAvailability> {
    const { LanguageModel: languageModel } = getChromeAiGlobals();
    if (!languageModel?.availability) {
      return availability(
        this.id,
        "unsupported",
        "Chrome on-device image description is not available in this browser.",
      );
    }

    try {
      const chromeState = await languageModel.availability(IMAGE_MODEL_OPTIONS);
      const mapped = mapChromeAvailability(this.id, chromeState);
      return availability(this.id, mapped.state, mapped.message);
    } catch {
      return availability(
        this.id,
        "unsupported",
        "Could not determine Chrome image description availability.",
      );
    }
  }
}
