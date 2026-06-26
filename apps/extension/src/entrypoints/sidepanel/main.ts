import type { GeordiMessage } from "../../lib/messages";
import type { SummaryStyle } from "../../lib/ai/summarization-options";
import { createSpeechReader } from "../../lib/speech/reader";
import {
  canSummarizeWithSetup,
  getSummarizerSetupStatus,
  summarizeActivePage,
} from "./summarize-page";

const statusEl = document.getElementById("status")!;
const summarizeAvailabilityEl = document.getElementById("summarize-availability")!;
const summarizeSetupEl = document.getElementById("summarize-setup")!;
const summarizeSetupHeadlineEl = document.getElementById(
  "summarize-setup-heading",
)!;
const summarizeSetupDetailEl = document.getElementById("summarize-setup-detail")!;
const summarizeSetupStepsEl = document.getElementById(
  "summarize-setup-steps",
)! as HTMLOListElement;
const summaryFormatSelect = document.getElementById(
  "summary-format",
) as HTMLSelectElement;
const summaryResultSection = document.getElementById("summary-result")!;
const summaryTextEl = document.getElementById("summary-text")!;
const summarizePageButton = document.getElementById("summarize-page")!;
const voiceSelect = document.getElementById("voice-select") as HTMLSelectElement;
const speedRange = document.getElementById("speed-range") as HTMLInputElement;
const speedValue = document.getElementById("speed-value")!;

const reader = createSpeechReader();
type ReadingSource = "page" | "selection" | "summary";

let pendingText = "";
let pendingSource: ReadingSource | null = null;
let readingStartToken = 0;

function isPageReadingSource(): boolean {
  return pendingSource === "page" || pendingSource === "selection";
}

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

function resetReaderOnNavigation() {
  const wasPageReading =
    isPageReadingSource() && (reader.isActive() || reader.isPaused());
  readingStartToken += 1;
  reader.stop(false);

  const summaryText = summaryTextEl.textContent?.trim();
  if (summaryText) {
    pendingText = summaryText;
    pendingSource = "summary";
  } else {
    pendingText = "";
    pendingSource = null;
  }

  if (wasPageReading) {
    clearHighlight();
    teardownReading();
  }
  setStatus("Page changed.");
}

async function startReading(source: ReadingSource): Promise<void> {
  const token = ++readingStartToken;
  let text: string;

  if (source === "summary") {
    text =
      pendingSource === "summary" && pendingText
        ? pendingText
        : summaryTextEl.textContent?.trim() ?? "";
    if (!text) {
      throw new Error("No summary to read. Summarize a page first.");
    }
  } else {
    text =
      source === "page"
        ? await loadPageReading()
        : await loadSelectionReading();
  }

  if (token !== readingStartToken) return;

  pendingText = text;
  pendingSource = source;
  await reader.speakText(pendingText);
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

async function refreshSummarizeUi(): Promise<void> {
  const setup = await getSummarizerSetupStatus();
  const hasSetupSteps = setup.steps.length > 0;

  if (hasSetupSteps) {
    summarizeAvailabilityEl.hidden = true;
    summarizeAvailabilityEl.textContent = "";
    summarizeSetupEl.hidden = false;
    summarizeSetupHeadlineEl.textContent = setup.headline;

    const showDetail =
      setup.detail &&
      setup.detail !== setup.headline &&
      !setup.steps.includes(setup.detail);
    summarizeSetupDetailEl.textContent = showDetail ? setup.detail : "";
    summarizeSetupDetailEl.hidden = !showDetail;

    summarizeSetupStepsEl.replaceChildren();
    for (const step of setup.steps) {
      const item = document.createElement("li");
      item.textContent = step;
      summarizeSetupStepsEl.append(item);
    }
  } else {
    summarizeSetupEl.hidden = true;
    summarizeSetupHeadlineEl.textContent = "";
    summarizeSetupDetailEl.textContent = "";
    summarizeSetupDetailEl.hidden = true;
    summarizeSetupStepsEl.replaceChildren();

    summarizeAvailabilityEl.hidden = false;
    summarizeAvailabilityEl.textContent = setup.detail ?? setup.headline;
  }

  summarizePageButton.disabled = !canSummarizeWithSetup(setup.kind);
  summarizePageButton.setAttribute(
    "aria-disabled",
    String(!canSummarizeWithSetup(setup.kind)),
  );
}

async function initSettings() {
  const settings = await reader.loadSettings();
  speedRange.value = String(settings.rate);
  speedValue.textContent = `${settings.rate.toFixed(1)}×`;
  populateVoices();
  await refreshSummarizeUi();
}

function hideSummaryResult(): void {
  summaryResultSection.hidden = true;
  summaryTextEl.textContent = "";
}

function showSummaryResult(summary: string): void {
  summaryTextEl.textContent = summary;
  summaryResultSection.hidden = false;
}

async function handleSummarizePage(): Promise<void> {
  readingStartToken += 1;
  reader.stop(false);
  if (isPageReadingSource()) {
    clearHighlight();
    teardownReading();
  }
  hideSummaryResult();

  try {
    const { summary } = await summarizeActivePage({
      style: summaryFormatSelect.value as SummaryStyle,
      requestFromActiveTab,
      onStatus: setStatus,
    });
    showSummaryResult(summary);
    pendingText = summary;
    pendingSource = "summary";
    setStatus("Reading summary…");
    await reader.speakText(summary);
    await refreshSummarizeUi();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to summarize page");
    await refreshSummarizeUi();
  }
}

chrome.runtime.onMessage.addListener((message: GeordiMessage) => {
  if (message.type === "RESET_READING") {
    resetReaderOnNavigation();
  }
  return false;
});

reader.on((event) => {
  const readingSummary = pendingSource === "summary";

  switch (event.type) {
    case "start":
      setStatus(readingSummary ? "Reading summary…" : "Reading…");
      break;
    case "pause":
      setStatus("Paused.");
      if (!readingSummary) clearHighlight();
      break;
    case "resume":
      setStatus(readingSummary ? "Reading summary…" : "Reading…");
      break;
    case "end":
      setStatus(readingSummary ? "Summary finished." : "Finished.");
      if (!readingSummary) {
        clearHighlight();
        teardownReading();
      }
      break;
    case "error":
      setStatus(`Error: ${event.message}`);
      break;
    case "word":
      if (!readingSummary) highlightAtChar(event.charIndex);
      break;
  }
});

document.getElementById("read-page")!.addEventListener("click", async () => {
  try {
    await startReading("page");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to read page");
  }
});

document.getElementById("read-selection")!.addEventListener("click", async () => {
  try {
    await startReading("selection");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to read selection");
  }
});

summarizePageButton.addEventListener("click", () => {
  void handleSummarizePage();
});

document.getElementById("play")!.addEventListener("click", async () => {
  if (reader.isPaused()) {
    reader.resume();
    return;
  }

  if (reader.isActive()) {
    return;
  }

  try {
    const source =
      pendingSource ??
      (summaryTextEl.textContent?.trim() ? "summary" : "page");
    await startReading(source);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to start reading");
  }
});

document.getElementById("pause")!.addEventListener("click", () => {
  reader.pause();
});

document.getElementById("stop")!.addEventListener("click", () => {
  readingStartToken += 1;
  reader.stop();
  if (isPageReadingSource()) {
    clearHighlight();
    teardownReading();
  }
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
