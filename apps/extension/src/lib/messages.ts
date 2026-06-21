/** Message types passed between extension contexts. */
export type GeordiMessage =
  | { type: "GET_PAGE_TEXT" }
  | { type: "GET_SELECTION_TEXT" }
  | { type: "PAGE_TEXT"; text: string; title: string }
  | { type: "SELECTION_TEXT"; text: string }
  | { type: "ERROR"; message: string };

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
