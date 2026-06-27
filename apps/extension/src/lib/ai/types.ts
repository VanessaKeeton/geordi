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

/** @see {@link ../content/page-content.ts PageContent} for the full extraction contract. */
export type { PageContent } from "../content/page-content";

/** Future plain-English navigation action (#28+). */
export interface NavAction {
  selector: string;
  description: string;
}

export interface ImageDimensions {
  displayWidth: number;
  displayHeight: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

/** Input for image description providers (#27). */
export interface ImageDescriptionInput {
  /** Stable id from page discovery (e.g. `img-0`). */
  id?: string;
  /** Accessible name or alt text when present. */
  alt?: string;
  /** Image source URL on the current page (not fetched remotely by Geordi). */
  src?: string;
  /** ARIA role when present (`img`, `presentation`, etc.). */
  role?: string;
  /** Layout and intrinsic dimensions from the live DOM. */
  dimensions?: ImageDimensions;
  /** Figure caption when available. */
  caption?: string;
  /** Nearest preceding or ancestor heading text. */
  nearbyHeading?: string;
  /** Nearby paragraph or list text around the image. */
  surroundingText?: string;
  /** Page URL where the image was discovered. */
  pageUrl?: string;
  /** Same-origin image bytes as a data URL — never fetched over the network. */
  imageDataUrl?: string;
  /** Optional combined caption / heading / surrounding text for providers. */
  context?: string;
}

/** Why image description input cannot be sent to a provider. */
export type ImageDescriptionInputFailureReason =
  | "missing_input"
  | "unsuitable_image"
  | "inaccessible_image_data";

export interface ImageDescriptionInputValidation {
  ok: boolean;
  reason?: ImageDescriptionInputFailureReason;
  message?: string;
}
