import type { NavAction, PageContext } from "./types";

export type {
  ImageDescriptionProvider,
  ReadAloudProvider,
  SummarizationProvider,
} from "./contracts";

export type {
  AICapability,
  ImageDescriptionInput,
  ImageDescriptionInputFailureReason,
  ImageDescriptionInputValidation,
  ImageDimensions,
  NavAction,
  PageContext,
  ProviderAvailability,
  ProviderAvailabilityState,
  ProviderResult,
} from "./types";

export {
  availability,
  isUsable,
  pickBestAvailability,
  requiresConfiguration,
  unsupported,
} from "./availability";

export { ProviderRegistry } from "./registry";
export { createProviderRegistry } from "./create-registry";
export type { CreateProviderRegistryOptions } from "./create-registry";

export {
  buildImageDescriptionPrompt,
  dataUrlToBlob,
  validateImageDescriptionInput,
} from "./image-description-input";

/** @deprecated Legacy Phase 3 stub — use SummarizationProvider + ProviderRegistry. */
export interface AIProvider {
  summarize(text: string): Promise<string>;
  navigate(instruction: string, pageContext: PageContext): Promise<NavAction>;
}

/** @deprecated Use createProviderRegistry() and structured ProviderResult instead. */
export class UnconfiguredAIProvider implements AIProvider {
  async summarize(): Promise<string> {
    throw new Error("AI features require an API key. Coming in Phase 3.");
  }

  async navigate(): Promise<NavAction> {
    throw new Error("AI navigation requires an API key. Coming in Phase 3.");
  }
}
