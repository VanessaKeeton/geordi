/** Message types passed between extension contexts. */

import type { ImageDescriptionInput } from "./ai/types";
import type { PageContent } from "./content/page-content";
import type { PageImageDiscoveryResult } from "./content/page-images";

export type SpeechEvent =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "end" }
  | { type: "error"; message: string }
  | { type: "word"; charIndex: number };

export type GeordiMessage =
  | { type: "GET_PAGE_READING" }
  | { type: "GET_SELECTION_READING" }
  | { type: "GET_PAGE_CONTENT" }
  | { type: "GET_SELECTION_CONTENT" }
  | { type: "GET_PAGE_IMAGES" }
  | { type: "DESCRIBE_PAGE_IMAGE"; candidateId: string }
  | { type: "FETCH_SAME_ORIGIN_IMAGE"; imageUrl: string; pageUrl: string }
  | { type: "GET_IMAGE_DESCRIPTION_INPUT"; candidateId: string }
  | { type: "PAGE_READING"; text: string; title: string }
  | { type: "PAGE_CONTENT"; content: PageContent }
  | { type: "PAGE_IMAGES"; discovery: PageImageDiscoveryResult }
  | {
      type: "IMAGE_DESCRIPTION_RESULT";
      description: string;
      label: string;
      providerId: string;
    }
  | { type: "SAME_ORIGIN_IMAGE_DATA"; imageDataUrl: string }
  | { type: "IMAGE_DESCRIPTION_INPUT"; input: ImageDescriptionInput }
  | { type: "SELECTION_READING"; text: string }
  | { type: "SELECTION_CONTENT"; content: PageContent }
  | { type: "HIGHLIGHT_AT_CHAR"; charIndex: number }
  | { type: "CLEAR_HIGHLIGHT" }
  | { type: "TEARDOWN_READING" }
  | { type: "RESET_READING" }
  | { type: "ERROR"; message: string };

/** Messages that require a response from the content script. */
export type GeordiRequestMessage =
  | { type: "GET_PAGE_READING" }
  | { type: "GET_SELECTION_READING" }
  | { type: "GET_PAGE_CONTENT" }
  | { type: "GET_SELECTION_CONTENT" }
  | { type: "GET_PAGE_IMAGES" }
  | { type: "DESCRIBE_PAGE_IMAGE"; candidateId: string }
  | { type: "GET_IMAGE_DESCRIPTION_INPUT"; candidateId: string };

/** Messages forwarded from side panel to the active tab. */
export type GeordiTabMessage =
  | GeordiRequestMessage
  | { type: "HIGHLIGHT_AT_CHAR"; charIndex: number }
  | { type: "CLEAR_HIGHLIGHT" }
  | { type: "TEARDOWN_READING" };

export interface SpeechSettings {
  voiceURI: string | null;
  rate: number;
}

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  voiceURI: null,
  rate: 1,
};

export const STORAGE_KEYS = {
  speechSettings: "geordi:speech-settings",
} as const;
