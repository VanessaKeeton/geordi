import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpeechReader } from "./reader";

class MockUtterance {
  text: string;
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

function createMockSpeechSynthesis() {
  const queue: MockUtterance[] = [];

  return {
    speaking: false,
    paused: false,
    getVoices: () => [],
    speak(utterance: MockUtterance) {
      this.speaking = true;
      queue.push(utterance);
    },
    pause() {
      this.paused = true;
    },
    resume() {
      this.paused = false;
    },
    cancel() {
      const current = queue.pop();
      if (current?.onerror) {
        current.onerror({ error: "interrupted" });
      }
      this.speaking = queue.length > 0;
      this.paused = false;
    },
    addEventListener: vi.fn(),
    _queue: queue,
  };
}

describe("SpeechReader", () => {
  let mockSynth: ReturnType<typeof createMockSpeechSynthesis>;

  beforeEach(() => {
    mockSynth = createMockSpeechSynthesis();
    globalThis.speechSynthesis = mockSynth as unknown as SpeechSynthesis;
    globalThis.SpeechSynthesisUtterance =
      MockUtterance as unknown as typeof SpeechSynthesisUtterance;
    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    } as unknown as typeof chrome;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues and speaks multiple chunks", async () => {
    mockSynth.speak = function (utterance: MockUtterance) {
      this.speaking = true;
      setTimeout(() => utterance.onend?.(), 0);
    };

    const reader = new SpeechReader();
    const events: string[] = [];
    reader.on((e) => events.push(e.type));

    await reader.speak(["First chunk.", "Second chunk."]);
    await new Promise((r) => setTimeout(r, 10));

    expect(events).toContain("start");
    expect(events).toContain("end");
  });

  it("emits end immediately for empty queue", async () => {
    const reader = new SpeechReader();
    const events: string[] = [];
    reader.on((e) => events.push(e.type));

    await reader.speak([]);
    expect(events).toEqual(["end"]);
  });

  it("pause and resume replay the current sentence only", async () => {
    const spoken: string[] = [];
    mockSynth.speak = function (utterance: MockUtterance) {
      this.speaking = true;
      spoken.push(utterance.text);
    };

    const reader = new SpeechReader();
    await reader.speak([
      "First sentence. Second sentence. Third sentence.",
    ]);
    expect(spoken).toEqual(["First sentence."]);
    expect(reader.getQueueIndex()).toBe(0);

    reader.pause();
    mockSynth.speaking = false;
    reader.resume();

    expect(spoken).toEqual(["First sentence.", "First sentence."]);
    expect(reader.getQueueIndex()).toBe(0);
  });

  it("resume after later sentence continues from that sentence", async () => {
    const spoken: string[] = [];
    mockSynth.speak = function (utterance: MockUtterance) {
      this.speaking = true;
      spoken.push(utterance.text);
      if (utterance.text === "First sentence.") {
        setTimeout(() => utterance.onend?.(), 0);
      }
    };

    const reader = new SpeechReader();
    await reader.speak(["First sentence. Second sentence. Third sentence."]);
    await new Promise((r) => setTimeout(r, 5));
    expect(reader.getQueueIndex()).toBe(1);

    reader.pause();
    mockSynth.speaking = false;
    reader.resume();

    expect(spoken.at(-1)).toBe("Second sentence.");
    expect(reader.getQueueIndex()).toBe(1);
  });

  it("ignores stale onend after cancel so index does not jump", async () => {
    let pendingUtterance: MockUtterance | null = null;
    mockSynth.speak = function (utterance: MockUtterance) {
      this.speaking = true;
      pendingUtterance = utterance;
    };
    mockSynth.cancel = function () {
      this.speaking = false;
      // Simulate late onend after cancel (stale callback)
      setTimeout(() => pendingUtterance?.onend?.(), 0);
    };

    const reader = new SpeechReader();
    await reader.speak(["One. Two. Three."]);
    reader.pause();
    await new Promise((r) => setTimeout(r, 5));

    expect(reader.getQueueIndex()).toBe(0);
    reader.resume();
    expect(reader.getQueueIndex()).toBe(0);
  });

  it("updateSettings restarts current chunk with new voice while speaking", async () => {
    const voicesUsed: (SpeechSynthesisVoice | null)[] = [];
    mockSynth.getVoices = () => [
      { voiceURI: "voice-a", name: "A", lang: "en-US" } as SpeechSynthesisVoice,
      { voiceURI: "voice-b", name: "B", lang: "en-US" } as SpeechSynthesisVoice,
    ];
    mockSynth.speak = function (utterance: MockUtterance) {
      this.speaking = true;
      voicesUsed.push(utterance.voice);
    };

    const reader = new SpeechReader();
    await reader.speak(["Hello world."]);
    expect(voicesUsed).toHaveLength(1);

    await reader.updateSettings({ voiceURI: "voice-b" });
    expect(voicesUsed).toHaveLength(2);
    expect(voicesUsed[1]?.voiceURI).toBe("voice-b");
    expect(reader.getQueueIndex()).toBe(0);
  });

  it("updateSettings while paused applies on next resume", async () => {
    mockSynth.getVoices = () => [
      { voiceURI: "voice-b", name: "B", lang: "en-US" } as SpeechSynthesisVoice,
    ];
    const voicesUsed: (SpeechSynthesisVoice | null)[] = [];
    mockSynth.speak = function (utterance: MockUtterance) {
      this.speaking = true;
      voicesUsed.push(utterance.voice);
    };

    const reader = new SpeechReader();
    await reader.speak(["Paused chunk."]);
    reader.pause();
    await reader.updateSettings({ voiceURI: "voice-b" });

    mockSynth.speaking = false;
    reader.resume();

    expect(voicesUsed.at(-1)?.voiceURI).toBe("voice-b");
  });

  it("persists settings to chrome.storage", async () => {
    const reader = new SpeechReader();
    await reader.saveSettings({ rate: 1.5, voiceURI: "voice-1" });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      "geordi:speech-settings": expect.objectContaining({ rate: 1.5, voiceURI: "voice-1" }),
    });
  });

  it("stop cancels synthesis", () => {
    const reader = new SpeechReader();
    reader.stop();
    expect(mockSynth.speaking).toBe(false);
  });
});
