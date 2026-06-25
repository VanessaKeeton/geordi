/** Message types passed between extension contexts. */

import type { PageContent } from "./content/page-content";

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
  | { type: "PAGE_READING"; text: string; title: string }
  | { type: "PAGE_CONTENT"; content: PageContent }
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
  | { type: "GET_SELECTION_CONTENT" };

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
