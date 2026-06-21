import {
  splitIntoParagraphs,
} from "../../lib/content/extract";
import type { GeordiMessage } from "../../lib/messages";
import { createSpeechReader } from "../../lib/speech/reader";

const statusEl = document.getElementById("status")!;
const voiceSelect = document.getElementById("voice-select") as HTMLSelectElement;
const speedRange = document.getElementById("speed-range") as HTMLInputElement;
const speedValue = document.getElementById("speed-value")!;

const reader = createSpeechReader();
let pendingChunks: string[] = [];

function setStatus(message: string) {
  statusEl.textContent = message;
}

function requestFromActiveTab(message: GeordiMessage): Promise<GeordiMessage> {
  return chrome.runtime.sendMessage(message);
}

async function loadPageText(): Promise<string[]> {
  setStatus("Extracting page content…");
  const response = await requestFromActiveTab({ type: "GET_PAGE_TEXT" });

  if (response.type === "ERROR") {
    throw new Error(response.message);
  }
  if (response.type !== "PAGE_TEXT") {
    throw new Error("Unexpected response from content script");
  }

  const chunks = splitIntoParagraphs(response.text);
  if (chunks.length === 0) {
    throw new Error("No readable content found on this page");
  }
  return chunks;
}

async function loadSelectionText(): Promise<string[]> {
  setStatus("Reading selection…");
  const response = await requestFromActiveTab({ type: "GET_SELECTION_TEXT" });

  if (response.type === "ERROR") {
    throw new Error(response.message);
  }
  if (response.type !== "SELECTION_TEXT") {
    throw new Error("Unexpected response from content script");
  }

  if (!response.text) {
    throw new Error("No text selected. Highlight text on the page first.");
  }

  return splitIntoParagraphs(response.text);
}

function populateVoices() {
  const voices = reader.getVoices();
  const current = reader.getSettings().voiceURI;

  voiceSelect.replaceChildren();
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "System default";
  voiceSelect.append(defaultOption);

  for (const voice of voices) {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.voiceURI === current) option.selected = true;
    voiceSelect.append(option);
  }
}

async function initSettings() {
  const settings = await reader.loadSettings();
  speedRange.value = String(settings.rate);
  speedValue.textContent = `${settings.rate.toFixed(1)}×`;
  populateVoices();
}

reader.on((event) => {
  switch (event.type) {
    case "start":
      setStatus("Reading…");
      break;
    case "pause":
      setStatus("Paused.");
      break;
    case "resume":
      setStatus("Reading…");
      break;
    case "end":
      setStatus("Finished.");
      break;
    case "error":
      setStatus(`Error: ${event.message}`);
      break;
    case "sentence":
      setStatus(`Reading sentence ${event.index + 1} of ${event.total}…`);
      break;
  }
});

document.getElementById("read-page")!.addEventListener("click", async () => {
  try {
    pendingChunks = await loadPageText();
    await reader.speak(pendingChunks);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to read page");
  }
});

document.getElementById("read-selection")!.addEventListener("click", async () => {
  try {
    pendingChunks = await loadSelectionText();
    await reader.speak(pendingChunks);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to read selection");
  }
});

document.getElementById("play")!.addEventListener("click", async () => {
  if (reader.isPaused()) {
    reader.resume();
    return;
  }

  if (reader.isActive()) {
    return;
  }

  if (pendingChunks.length > 0) {
    await reader.speak(pendingChunks);
  } else {
    setStatus("Use Read page or Read selection first.");
  }
});

document.getElementById("pause")!.addEventListener("click", () => {
  reader.pause();
});

document.getElementById("stop")!.addEventListener("click", () => {
  reader.stop();
  setStatus("Stopped.");
});

voiceSelect.addEventListener("change", async () => {
  await reader.updateSettings({
    voiceURI: voiceSelect.value || null,
  });
  setStatus("Voice updated.");
});

speedRange.addEventListener("input", async () => {
  const rate = Number(speedRange.value);
  speedValue.textContent = `${rate.toFixed(1)}×`;
  await reader.updateSettings({ rate });
});

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.addEventListener("voiceschanged", populateVoices);
}

initSettings();
