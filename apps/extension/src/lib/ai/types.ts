/** Runtime availability for an AI or speech provider. */
export type ProviderAvailabilityState =
  | "available"
  | "downloadable"
  | "downloading"
  | "unsupported"
  | "requires_configuration";

export interface ProviderAvailability {
  state: ProviderAvailabilityState;
  /** Stable provider identifier, e.g. `chrome-summarizer`. */
  providerId: string;
  /** Optional user-facing explanation when not fully available. */
  message?: string;
}

export type ProviderResult<T> =
  | { ok: true; value: T }
  | { ok: false; availability: ProviderAvailability; message: string };

export type AICapability = "summarization" | "imageDescription" | "readAloud";

/** Page context passed to future navigation / summarization features. */
export interface PageContext {
  title: string;
  text: string;
  url: string;
}

/** Future plain-English navigation action (#28+). */
export interface NavAction {
  selector: string;
  description: string;
}

/** Input for image description providers (#27). */
export interface ImageDescriptionInput {
  /** Accessible name or alt text when present. */
  alt?: string;
  /** Image source URL on the current page (not fetched remotely by Geordi). */
  src?: string;
  /** Optional surrounding caption or figure text. */
  context?: string;
}
