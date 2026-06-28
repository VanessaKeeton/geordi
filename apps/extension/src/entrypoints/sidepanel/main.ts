import type { GeordiMessage } from "../../lib/messages";
import type { SummaryStyle } from "../../lib/ai/summarization-options";
import { formatPageImageLabel } from "../../lib/content/page-images";
import type { PageImageCandidate } from "../../lib/content/page-images";
import { renderSummaryDisplay } from "../../lib/content/summary-display";
import { createSpeechReader } from "../../lib/speech/reader";
import {
  canSummarizeWithSetup,
  getSummarizerSetupStatus,
  summarizeActivePage,
} from "./summarize-page";
import {
  canDescribeImages,
  describeActivePageImage,
  discoverImagesOnActivePage,
  getImageDescriptionAvailabilityMessage,
} from "./describe-page-image";
import {
  clearSummaryHighlight,
  highlightSummaryAtChar,
  prepareSummaryForReading,
  teardownSummaryMarkup,
} from "./summary-highlight";
import { getWrappedSpeakableText } from "../../lib/content/wrap-for-reading";

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
const summaryScrollEl = document.getElementById("summary-scroll")!;
const summaryTextEl = document.getElementById("summary-text")!;
const summarizePageButton = document.getElementById("summarize-page")!;
const imagesAvailabilityEl = document.getElementById("images-availability")!;
const findPageImagesButton = document.getElementById("find-page-images")!;
const imagePickerFieldset = document.getElementById("image-picker-fieldset")!;
const imageSelect = document.getElementById("image-select") as HTMLSelectElement;
const describeImageButton = document.getElementById("describe-image")!;
const readImageDescriptionButton = document.getElementById("read-image-description")!;
const imageDescriptionResultSection = document.getElementById(
  "image-description-result",
)!;
const imageDescriptionLabelEl = document.getElementById("image-description-label")!;
const imageDescriptionTextEl = document.getElementById("image-description-text")!;
const imageDescriptionScrollEl = document.getElementById("image-description-scroll")!;
const voiceSelect = document.getElementById("voice-select") as HTMLSelectElement;
const speedRange = document.getElementById("speed-range") as HTMLInputElement;
const speedValue = document.getElementById("speed-value")!;

const reader = createSpeechReader();
type ReadingSource = "page" | "selection" | "summary" | "imageDescription";

let pendingText = "";
let pendingSource: ReadingSource | null = null;
let readingStartToken = 0;
let discoveredImages: PageImageCandidate[] = [];

function isSummaryReadingSource(): boolean {
  return pendingSource === "summary";
}

function isImageDescriptionReadingSource(): boolean {
  return pendingSource === "imageDescription";
}

function clearSummaryReadingHighlight() {
  clearSummaryHighlight(summaryTextEl);
}

function clearImageDescriptionReadingHighlight() {
  clearSummaryHighlight(imageDescriptionTextEl);
}

function highlightSummaryChar(charIndex: number) {
  highlightSummaryAtChar(summaryTextEl, charIndex, summaryScrollEl);
}

function highlightImageDescriptionChar(charIndex: number) {
  highlightSummaryAtChar(
    imageDescriptionTextEl,
    charIndex,
    imageDescriptionScrollEl,
  );
}

function isPageReadingSource(): boolean {
  return pendingSource === "page" || pendingSource === "selection";
}

async function speakSummary(text: string, style: SummaryStyle): Promise<void> {
  const speakable = prepareSummaryForReading(summaryTextEl, text, style);
  summaryResultSection.hidden = false;
  await reader.speakText(speakable);
}

async function speakImageDescription(text: string): Promise<void> {
  let speakable = getWrappedSpeakableText(imageDescriptionTextEl);
  if (!speakable) {
    speakable = prepareSummaryForReading(
      imageDescriptionTextEl,
      text,
      "paragraph",
    );
  }
  imageDescriptionResultSection.hidden = false;
  await reader.speakText(speakable);
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

function highlightSelectedPageImage(): void {
  const candidateId = imageSelect.value;
  if (candidateId) {
    sendToActiveTab({ type: "HIGHLIGHT_PAGE_IMAGE", candidateId });
  } else {
    sendToActiveTab({ type: "CLEAR_PAGE_IMAGE" });
  }
}

function clearPageImageHighlightOnPage(): void {
  sendToActiveTab({ type: "CLEAR_PAGE_IMAGE" });
}

function resetReaderOnNavigation() {
  const wasPageReading =
    isPageReadingSource() && (reader.isActive() || reader.isPaused());
  readingStartToken += 1;
  reader.stop(false);

  const summaryText = summaryTextEl.textContent?.trim();
  const imageDescriptionText = imageDescriptionTextEl.textContent?.trim();
  if (imageDescriptionText) {
    pendingText = imageDescriptionText;
    pendingSource = "imageDescription";
  } else if (summaryText) {
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
  clearPageImageHighlightOnPage();
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
  } else if (source === "imageDescription") {
    text =
      pendingSource === "imageDescription" && pendingText
        ? pendingText
        : imageDescriptionTextEl.textContent?.trim() ?? "";
    if (!text) {
      throw new Error("No image description to read. Describe an image first.");
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

  if (source === "page" || source === "selection") {
    clearPageImageHighlightOnPage();
  }

  if (source === "summary") {
    const style = summaryFormatSelect.value as SummaryStyle;
    await speakSummary(text, style);
  } else if (source === "imageDescription") {
    await speakImageDescription(text);
  } else {
    await reader.speakText(pendingText);
  }
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

function updateImageActionButtons(): void {
  const hasSelection = Boolean(imageSelect.value);
  const hasDescription = Boolean(imageDescriptionTextEl.textContent?.trim());
  describeImageButton.disabled = !hasSelection;
  readImageDescriptionButton.disabled = !hasDescription;
  describeImageButton.setAttribute("aria-disabled", String(!hasSelection));
  readImageDescriptionButton.setAttribute(
    "aria-disabled",
    String(!hasDescription),
  );
}

function populateImageSelect(images: PageImageCandidate[]): void {
  imageSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent =
    images.length === 0 ? "No images found" : "Select an image";
  imageSelect.append(placeholder);

  for (const image of images) {
    const option = document.createElement("option");
    option.value = image.id;
    option.textContent = formatPageImageLabel(image);
    imageSelect.append(option);
  }

  imagePickerFieldset.hidden = false;
  updateImageActionButtons();
}

function hideImageDescriptionResult(): void {
  teardownSummaryMarkup(imageDescriptionTextEl);
  imageDescriptionResultSection.hidden = true;
  imageDescriptionLabelEl.textContent = "";
  imageDescriptionTextEl.textContent = "";
  readImageDescriptionButton.disabled = true;
}

function showImageDescriptionResult(label: string, description: string): void {
  imageDescriptionLabelEl.textContent = label;
  prepareSummaryForReading(imageDescriptionTextEl, description, "paragraph");
  imageDescriptionResultSection.hidden = false;
  updateImageActionButtons();
}

async function refreshImagesUi(): Promise<void> {
  imagesAvailabilityEl.textContent =
    await getImageDescriptionAvailabilityMessage();
  const enabled = await canDescribeImages();
  findPageImagesButton.disabled = !enabled;
  findPageImagesButton.setAttribute("aria-disabled", String(!enabled));
  if (!enabled) {
    describeImageButton.disabled = true;
    describeImageButton.setAttribute("aria-disabled", "true");
  } else {
    updateImageActionButtons();
  }
}

async function handleFindPageImages(): Promise<void> {
  hideImageDescriptionResult();
  clearPageImageHighlightOnPage();
  discoveredImages = [];
  imageSelect.value = "";

  try {
    setStatus("Finding images on page…");
    discoveredImages = await discoverImagesOnActivePage(requestFromActiveTab);
    populateImageSelect(discoveredImages);

    if (discoveredImages.length === 0) {
      setStatus("No meaningful images found on this page.");
      return;
    }

    imageSelect.value = discoveredImages[0]?.id ?? "";
    updateImageActionButtons();
    highlightSelectedPageImage();
    setStatus(
      `Found ${discoveredImages.length} image${discoveredImages.length === 1 ? "" : "s"}.`,
    );
    await refreshImagesUi();
  } catch (err) {
    imagePickerFieldset.hidden = true;
    setStatus(err instanceof Error ? err.message : "Failed to find images");
    await refreshImagesUi();
  }
}

async function handleDescribeImage(): Promise<void> {
  const candidateId = imageSelect.value;
  if (!candidateId) {
    setStatus("Select an image first.");
    return;
  }

  readingStartToken += 1;
  reader.stop(false);
  if (isPageReadingSource()) {
    clearHighlight();
    teardownReading();
  }
  if (isSummaryReadingSource()) {
    clearSummaryReadingHighlight();
  }
  if (isImageDescriptionReadingSource()) {
    clearImageDescriptionReadingHighlight();
  }
  hideImageDescriptionResult();
  highlightSelectedPageImage();

  try {
    const { description, label } = await describeActivePageImage({
      candidateId,
      requestFromActiveTab,
      onStatus: setStatus,
    });
    showImageDescriptionResult(label, description);
    pendingText = description;
    pendingSource = "imageDescription";
    setStatus("Reading image description…");
    await speakImageDescription(description);
    await refreshImagesUi();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Failed to describe image");
    await refreshImagesUi();
  }
}

async function handleReadImageDescription(): Promise<void> {
  try {
    await startReading("imageDescription");
  } catch (err) {
    setStatus(
      err instanceof Error ? err.message : "Failed to read image description",
    );
  }
}

async function initSettings() {
  const settings = await reader.loadSettings();
  speedRange.value = String(settings.rate);
  speedValue.textContent = `${settings.rate.toFixed(1)}×`;
  populateVoices();
  await refreshSummarizeUi();
  await refreshImagesUi();
}

function hideSummaryResult(): void {
  teardownSummaryMarkup(summaryTextEl);
  summaryResultSection.hidden = true;
  summaryTextEl.replaceChildren();
}

function showSummaryResult(summary: string, style: SummaryStyle): void {
  renderSummaryDisplay(summaryTextEl, summary, style);
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
    const style = summaryFormatSelect.value as SummaryStyle;
    const { summary } = await summarizeActivePage({
      style,
      requestFromActiveTab,
      onStatus: setStatus,
    });
    showSummaryResult(summary, style);
    pendingText = summary;
    pendingSource = "summary";
    setStatus("Reading summary…");
    await speakSummary(summary, style);
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
  const readingSummary = isSummaryReadingSource();
  const readingImageDescription = isImageDescriptionReadingSource();

  switch (event.type) {
    case "start":
      setStatus(
        readingSummary
          ? "Reading summary…"
          : readingImageDescription
            ? "Reading image description…"
            : "Reading…",
      );
      break;
    case "pause":
      setStatus("Paused.");
      if (readingSummary) clearSummaryReadingHighlight();
      else if (readingImageDescription) clearImageDescriptionReadingHighlight();
      else clearHighlight();
      break;
    case "resume":
      setStatus(
        readingSummary
          ? "Reading summary…"
          : readingImageDescription
            ? "Reading image description…"
            : "Reading…",
      );
      break;
    case "end":
      setStatus(
        readingSummary
          ? "Summary finished."
          : readingImageDescription
            ? "Image description finished."
            : "Finished.",
      );
      if (readingSummary) clearSummaryReadingHighlight();
      else if (readingImageDescription) clearImageDescriptionReadingHighlight();
      else {
        clearHighlight();
        teardownReading();
      }
      break;
    case "error":
      setStatus(`Error: ${event.message}`);
      break;
    case "word":
      if (readingSummary) highlightSummaryChar(event.charIndex);
      else if (readingImageDescription) {
        highlightImageDescriptionChar(event.charIndex);
      } else highlightAtChar(event.charIndex);
      break;
  }
});

document.getElementById("read-page")!.addEventListener("click", async () => {
  try {
    clearSummaryReadingHighlight();
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

findPageImagesButton.addEventListener("click", () => {
  void handleFindPageImages();
});

describeImageButton.addEventListener("click", () => {
  void handleDescribeImage();
});

readImageDescriptionButton.addEventListener("click", () => {
  void handleReadImageDescription();
});

imageSelect.addEventListener("change", () => {
  updateImageActionButtons();
  highlightSelectedPageImage();
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
      (imageDescriptionTextEl.textContent?.trim()
        ? "imageDescription"
        : summaryTextEl.textContent?.trim()
          ? "summary"
          : "page");
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
  if (isSummaryReadingSource()) {
    clearSummaryReadingHighlight();
  } else if (isPageReadingSource()) {
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
