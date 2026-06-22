import type {
  ImageDescriptionInput,
  ProviderAvailability,
  ProviderResult,
} from "./types";

/** Summarizes readable page text locally or via user-configured cloud (#25, #28). */
export interface SummarizationProvider {
  readonly id: string;
  checkAvailability(): Promise<ProviderAvailability>;
  summarize(text: string): Promise<ProviderResult<string>>;
}

/** Describes meaningful images using local multimodal AI (#27). */
export interface ImageDescriptionProvider {
  readonly id: string;
  checkAvailability(): Promise<ProviderAvailability>;
  describeImage(input: ImageDescriptionInput): Promise<ProviderResult<string>>;
}

/** Read-aloud beyond the free Web Speech baseline (#29, Phase 4 premium voices). */
export interface ReadAloudProvider {
  readonly id: string;
  checkAvailability(): Promise<ProviderAvailability>;
}
