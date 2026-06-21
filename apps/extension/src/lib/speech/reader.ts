import {
  DEFAULT_SPEECH_SETTINGS,
  STORAGE_KEYS,
  type SpeechSettings,
} from "../messages";
import { buildSpeechQueue } from "../content/extract";

export type SpeechEvent =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "end" }
  | { type: "error"; message: string }
  | { type: "sentence"; index: number; total: number };

type SpeechListener = (event: SpeechEvent) => void;

export class SpeechReader {
  private queue: string[] = [];
  private index = 0;
  private paused = false;
  private stopped = false;
  private active = false;
  private utteranceGeneration = 0;
  private settings: SpeechSettings = { ...DEFAULT_SPEECH_SETTINGS };
  private listeners = new Set<SpeechListener>();
  private voicesReady = false;

  constructor() {
    if (typeof speechSynthesis !== "undefined") {
      if (speechSynthesis.getVoices().length > 0) {
        this.voicesReady = true;
      }
      speechSynthesis.addEventListener("voiceschanged", () => {
        this.voicesReady = true;
      });
    }
  }

  on(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SpeechEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  async loadSettings(): Promise<SpeechSettings> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.speechSettings);
      const saved = stored[STORAGE_KEYS.speechSettings] as SpeechSettings | undefined;
      if (saved) {
        this.settings = { ...DEFAULT_SPEECH_SETTINGS, ...saved };
      }
    }
    return this.settings;
  }

  async saveSettings(settings: Partial<SpeechSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.speechSettings]: this.settings,
      });
    }
  }

  /** Save settings and apply immediately to in-progress reading. */
  async updateSettings(settings: Partial<SpeechSettings>): Promise<void> {
    await this.saveSettings(settings);
    if (!this.active) return;

    const wasPaused = this.paused;
    this.cancelCurrentUtterance();

    if (wasPaused) {
      this.paused = true;
      return;
    }

    if (this.index < this.queue.length) {
      this.speakNext();
    }
  }

  getSettings(): SpeechSettings {
    return { ...this.settings };
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (typeof speechSynthesis === "undefined") return [];
    return speechSynthesis.getVoices();
  }

  isPaused(): boolean {
    return this.paused;
  }

  isActive(): boolean {
    return this.active;
  }

  getQueueIndex(): number {
    return this.index;
  }

  async speak(chunks: string[]): Promise<void> {
    this.stop(false);
    this.queue = buildSpeechQueue(chunks.filter(Boolean));
    this.index = 0;
    this.paused = false;
    this.stopped = false;

    if (this.queue.length === 0) {
      this.emit({ type: "end" });
      return;
    }

    this.active = true;
    await this.loadSettings();
    this.emit({ type: "start" });
    this.speakNext();
  }

  pause(): void {
    if (!this.active || this.paused) return;
    this.paused = true;
    this.cancelCurrentUtterance();
    this.emit({ type: "pause" });
  }

  resume(): void {
    if (!this.paused || !this.active) return;
    this.paused = false;
    this.stopped = false;
    this.emit({ type: "resume" });
    // Always restart the current sentence from its beginning.
    this.speakNext();
  }

  stop(emitEnd = true): void {
    this.stopped = true;
    this.active = false;
    this.paused = false;
    this.cancelCurrentUtterance();
    this.queue = [];
    this.index = 0;
    if (emitEnd) {
      this.emit({ type: "end" });
    }
  }

  private cancelCurrentUtterance(): void {
    this.utteranceGeneration += 1;
    if (typeof speechSynthesis !== "undefined" && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
  }

  private speakNext(): void {
    if (this.stopped || this.paused || this.index >= this.queue.length) {
      if (!this.stopped && !this.paused && this.index >= this.queue.length) {
        this.active = false;
        this.emit({ type: "end" });
      }
      return;
    }

    const text = this.queue[this.index];
    this.emit({
      type: "sentence",
      index: this.index,
      total: this.queue.length,
    });

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.rate;

    const voices = this.getVoices();
    if (this.settings.voiceURI) {
      const voice = voices.find((v) => v.voiceURI === this.settings.voiceURI);
      if (voice) utterance.voice = voice;
    }

    const generation = this.utteranceGeneration;
    utterance.onend = () => {
      if (generation !== this.utteranceGeneration) return;
      if (this.stopped || this.paused) return;
      this.index += 1;
      this.speakNext();
    };

    utterance.onerror = (event) => {
      if (generation !== this.utteranceGeneration) return;
      if (this.stopped || this.paused) return;
      if (event.error === "interrupted") return;
      this.emit({
        type: "error",
        message: event.error ?? "Speech synthesis failed",
      });
      this.index += 1;
      this.speakNext();
    };

    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.speak(utterance);
    }
  }

  /** Test helper — whether voices have loaded. */
  isVoicesReady(): boolean {
    return this.voicesReady;
  }
}

export function createSpeechReader(): SpeechReader {
  return new SpeechReader();
}
