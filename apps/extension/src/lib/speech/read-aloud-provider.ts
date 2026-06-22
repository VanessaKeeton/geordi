import { availability, unsupported } from "../ai/availability";
import type { ReadAloudProvider } from "../ai/contracts";
import type { ProviderAvailability } from "../ai/types";

/**
 * Cross-browser baseline read-aloud via the Web Speech API.
 * Premium human voices (#29 / Phase 4) will register as separate providers.
 */
export class WebSpeechReadAloudProvider implements ReadAloudProvider {
  readonly id = "web-speech";

  async checkAvailability(): Promise<ProviderAvailability> {
    if (typeof speechSynthesis === "undefined") {
      return unsupported(
        this.id,
        "Text-to-speech is not supported in this environment.",
      );
    }

    return availability(this.id, "available");
  }
}
