import type { GeordiMessage } from "../../lib/messages";
import { createSpeechReader } from "../../lib/speech/reader";

const statusEl = document.getElementById("status")!;
const voiceSelect = document.getElementById("voice-select") as HTMLSelectElement;
const speedRange = document.getElementById("speed-range") as HTMLInputElement;
const speedValue = document.getElementById("speed-value")!;

const reader = createSpeechReader();
let pendingText = "";

function setStatus(message: string) {
  statusEl.textContent = message;
}

function requestFromActiveTab(message: GeordiMessage): Promise<GeordiMessage> {
  return chrome.runtime.sendMessage(message);
}

function sendToActiveTab(message: GeordiMessage): void {
  void chrome.runtime.sendMessage(message);
}

function highlightAtChar(charIndex: number) {
  sendToActiveTab({ type: "HIGHLIGHT_AT_CHAR", charIndex });
}

function clearHighlight() {
  sendToActiveTab({ type: "CLEAR_HIGHLIGHT" });
}

function teardownReading() {
  sendToActiveTab({ type: "TEARDOWN_READING" });
}

async function loadPageReading(): Promise<string> {
  setStatus("Extracting page content…");
  const response = await requestFromActiveTab({ type: "GET_PAGE_READING" });

  if (response.type === "ERROR") {
    throw new Error(response.message);
  }
  if (response.type !== "PAGE_READING") {
    throw new Error("Unexpected response from content script");
  }

  if (!response.text.trim()) {
    throw new Error("No readable content found on this page");
  }
  return response.text;
}

async function loadSelectionReading(): Promise<string> {
  setStatus("Reading selection…");
  const response = await requestFromActiveTab({ type: "GET_SELECTION_READING" });

  if (response.type === "ERROR") {
    throw new Error(response.message);
  }
  if (response.type !== "SELECTION_READING") {
    throw new Error("Unexpected response from content script");
  }

  if (!response.text.trim()) {
    throw new Error("No text selected. Highlight text on the page first.");
  }

  return response.text;
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
      clearHighlight();
      break;
    case "resume":
      setStatus("Reading…");
      break;
    case "end":
      setStatus("Finished.");
      clearHighlight();
      teardownReading();
      break;
    case "error":
      setStatus(`Error: ${event.message}`);
      break;
    case "word":
      highlightAtChar(event.charIndex);
      break;
  }
});

document.getElementById("read-page")!.addEventListener("click", async () => {
  try {
    pendingText = await loadPageReading();
    await reader.speakText(pendingText);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to read page");
  }
});

document.getElementById("read-selection")!.addEventListener("click", async () => {
  try {
    pendingText = await loadSelectionReading();
    await reader.speakText(pendingText);
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

  if (pendingText.trim()) {
    await reader.speakText(pendingText);
  } else {
    setStatus("Use Read page or Read selection first.");
  }
});

document.getElementById("pause")!.addEventListener("click", () => {
  reader.pause();
});

document.getElementById("stop")!.addEventListener("click", () => {
  reader.stop();
  clearHighlight();
  teardownReading();
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
