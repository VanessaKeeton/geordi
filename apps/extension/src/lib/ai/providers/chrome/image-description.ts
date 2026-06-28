import { availability, isUsable } from "../../availability";
import {
  buildImageDescriptionPrompt,
  dataUrlToBlob,
  inaccessibleImageDataMessage,
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
import { resolveChromePromptOutputLanguage } from "./summarizer-limits";
import { isSameOriginImageResource } from "../../../content/image-origin";

function buildImageModelOptions(
  outputLanguage?: string,
): ChromeLanguageModelCreateOptions {
  const lang = resolveChromePromptOutputLanguage(outputLanguage);
  return {
    expectedInputs: [{ type: "text", languages: [lang] }, { type: "image" }],
    expectedOutputs: [{ type: "text", languages: [lang] }],
  };
}

function resolvePromptImageValue(
  input: ImageDescriptionInput,
): string | Blob | HTMLImageElement | undefined {
  const imageDataUrl = input.imageDataUrl?.trim();
  if (imageDataUrl) return dataUrlToBlob(imageDataUrl);

  if (input.imageElement?.tagName?.toLowerCase() === "img") {
    const src = input.src?.trim();
    const pageUrl = input.pageUrl?.trim();
    if (!src || !pageUrl || isSameOriginImageResource(src, pageUrl)) {
      return input.imageElement;
    }
  }

  return undefined;
}

function formatChromeImageError(error: unknown): string {
  if (error instanceof Error) {
    if (/taint/i.test(error.message)) {
      return "Geordi could not read this image from the page. Try again after the image finishes loading.";
    }
    return error.message;
  }
  return "Chrome image description failed.";
}

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

    const imageValue = resolvePromptImageValue(input);
    if (!imageValue) {
      const current = await this.probeAvailability();
      return {
        ok: false,
        availability: current,
        message: inaccessibleImageDataMessage(input),
      };
    }

    try {
      const modelOptions = buildImageModelOptions(input.outputLanguage);
      const chromeState = await languageModel.availability(modelOptions);
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

      const session = await languageModel.create(modelOptions);
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
                value: imageValue,
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
      const current = await this.probeAvailability(input.outputLanguage);
      return {
        ok: false,
        availability: current,
        message: formatChromeImageError(error),
      };
    }
  }

  private async probeAvailability(
    outputLanguage?: string,
  ): Promise<ProviderAvailability> {
    const { LanguageModel: languageModel } = getChromeAiGlobals();
    if (!languageModel?.availability) {
      return availability(
        this.id,
        "unsupported",
        "Chrome on-device image description is not available in this browser.",
      );
    }

    try {
      const chromeState = await languageModel.availability(
        buildImageModelOptions(outputLanguage),
      );
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
