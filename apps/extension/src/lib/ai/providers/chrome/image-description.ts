import { availability } from "../../availability";
import type { ImageDescriptionProvider } from "../../contracts";
import type {
  ImageDescriptionInput,
  ProviderAvailability,
  ProviderResult,
} from "../../types";
import {
  getChromeAiNamespace,
  mapChromeAvailability,
} from "./detect";

/**
 * Chrome multimodal image description adapter (#27 will implement describeImage()).
 * Uses LanguageModel availability as the capability probe — no remote image upload.
 */
export class ChromeImageDescriptionProvider implements ImageDescriptionProvider {
  readonly id = "chrome-multimodal";

  async checkAvailability(): Promise<ProviderAvailability> {
    const ai = getChromeAiNamespace();
    const languageModel = ai?.LanguageModel;
    if (!languageModel?.availability) {
      return availability(
        this.id,
        "unsupported",
        "Chrome on-device image description is not available in this browser.",
      );
    }

    try {
      const chromeState = await languageModel.availability();
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

  async describeImage(
    _input: ImageDescriptionInput,
  ): Promise<ProviderResult<string>> {
    const current = await this.checkAvailability();
    if (current.state !== "available" && current.state !== "downloading") {
      return {
        ok: false,
        availability: current,
        message:
          current.message ??
          "Chrome image description is not ready. See availability status.",
      };
    }

    return {
      ok: false,
      availability: current,
      message: "Image description implementation is tracked in #27.",
    };
  }
}
