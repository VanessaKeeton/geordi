import {
  DEFAULT_SPEECH_SETTINGS,
  STORAGE_KEYS,
  type SpeechSettings,
  type SpeechEvent,
} from "../messages";
import { buildSpeechQueue } from "../content/extract";

export type { SpeechEvent };

type SpeechListener = (event: SpeechEvent) => void;

export class SpeechReader {
  private queue: string[] = [];
  private index = 0;
  private paused = false;
  private stopped = false;
  private active = false;
  private continuousMode = false;
  private continuousText = "";
  private continuousStartOffset = 0;
  private continuousCharIndex = 0;
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

    if (this.continuousMode) {
      const wasPaused = this.paused;
      this.continuousStartOffset = this.continuousCharIndex;
      this.cancelCurrentUtterance();
      if (wasPaused) {
        this.paused = true;
        return;
      }
      this.speakContinuousText();
      return;
    }

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
    await this.speakSentences(buildSpeechQueue(chunks.filter(Boolean)));
  }

  /** Speak full page/selection text as one utterance (for DOM charIndex highlighting). */
  async speakText(text: string): Promise<void> {
    this.stop(false);
    this.continuousMode = true;
    this.continuousText = text.trim();
    this.continuousStartOffset = 0;
    this.continuousCharIndex = 0;
    this.paused = false;
    this.stopped = false;

    if (!this.continuousText) {
      this.continuousMode = false;
      this.emit({ type: "end" });
      return;
    }

    this.active = true;
    await this.loadSettings();
    this.emit({ type: "start" });
    this.speakContinuousText();
  }

  /** Speak a pre-split sentence queue (legacy / chunk mode). */
  async speakSentences(sentences: string[]): Promise<void> {
    this.stop(false);
    this.continuousMode = false;
    this.queue = sentences.filter(Boolean);
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

    if (this.continuousMode && typeof speechSynthesis !== "undefined") {
      speechSynthesis.pause();
      this.emit({ type: "pause" });
      return;
    }

    this.cancelCurrentUtterance();
    this.emit({ type: "pause" });
  }

  resume(): void {
    if (!this.paused || !this.active) return;
    this.paused = false;
    this.stopped = false;
    this.emit({ type: "resume" });

    if (this.continuousMode && typeof speechSynthesis !== "undefined") {
      speechSynthesis.resume();
      return;
    }

    this.speakNext();
  }

  stop(emitEnd = true): void {
    this.stopped = true;
    this.active = false;
    this.paused = false;
    this.continuousMode = false;
    this.continuousText = "";
    this.continuousStartOffset = 0;
    this.continuousCharIndex = 0;
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

  private speakContinuousText(): void {
    if (this.stopped || this.paused || !this.continuousText) {
      if (!this.stopped && !this.paused && !this.continuousText) {
        this.active = false;
        this.continuousMode = false;
        this.emit({ type: "end" });
      }
      return;
    }

    this.continuousStartOffset = Math.max(
      0,
      Math.min(this.continuousStartOffset, this.continuousText.length),
    );
    const text = this.continuousText.slice(this.continuousStartOffset);
    if (!text) {
      this.active = false;
      this.continuousMode = false;
      this.emit({ type: "end" });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.rate;

    const voices = this.getVoices();
    if (this.settings.voiceURI) {
      const voice = voices.find((v) => v.voiceURI === this.settings.voiceURI);
      if (voice) utterance.voice = voice;
    }

    const generation = this.utteranceGeneration;

    utterance.addEventListener("boundary", (event) => {
      if (generation !== this.utteranceGeneration) return;
      if (this.stopped || this.paused) return;

      const name = event.name?.toLowerCase() ?? "";
      const isWord = name.includes("word");
      const isSentence = name.includes("sentence");
      if (!isWord && !isSentence) return;

      const charIndex = this.continuousStartOffset + event.charIndex;
      this.continuousCharIndex = charIndex;
      this.emit({
        type: "word",
        charIndex,
      });
    });

    utterance.onend = () => {
      if (generation !== this.utteranceGeneration) return;
      if (this.stopped || this.paused) return;
      this.active = false;
      this.continuousMode = false;
      this.emit({ type: "end" });
    };

    utterance.onerror = (event) => {
      if (generation !== this.utteranceGeneration) return;
      if (this.stopped || this.paused) return;
      if (event.error === "interrupted") return;
      this.emit({
        type: "error",
        message: event.error ?? "Speech synthesis failed",
      });
      this.active = false;
      this.continuousMode = false;
      this.emit({ type: "end" });
    };

    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.speak(utterance);
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.rate;

    const voices = this.getVoices();
    if (this.settings.voiceURI) {
      const voice = voices.find((v) => v.voiceURI === this.settings.voiceURI);
      if (voice) utterance.voice = voice;
    }

    const generation = this.utteranceGeneration;

    utterance.addEventListener("boundary", (event) => {
      if (generation !== this.utteranceGeneration) return;
      if (this.stopped || this.paused) return;

      const name = event.name?.toLowerCase() ?? "";
      const isWord = name.includes("word");
      const isSentence = name.includes("sentence");
      if (!isWord && !isSentence) return;

      this.emit({
        type: "word",
        charIndex: event.charIndex,
      });
    });

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
