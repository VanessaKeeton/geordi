import { computeSentenceStarts, sentencesToRanges } from "./range-map";
import { isHiddenElement } from "./deep-dom";
import {
  buildFailedPageContent,
  buildPageContent,
  extractPageMetadata,
  logPageContentForDev,
  PAGE_CONTENT_MAX_HEADINGS,
  PAGE_CONTENT_MAX_LINKS,
  type PageContent,
  type PageContentLink,
  type PageContentStructure,
} from "./page-content";

const SKIP_TAGS = new Set([
  "script",
  "style",
  "meta",
  "link",
  "noscript",
  "head",
  "svg",
]);

const BOILERPLATE_TAGS = new Set(["nav", "footer", "aside", "header"]);

const BOILERPLATE_ROLES = new Set([
  "navigation",
  "banner",
  "contentinfo",
  "complementary",
]);

export function isBoilerplateElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (BOILERPLATE_TAGS.has(tag)) return true;
  const role = el.getAttribute("role")?.toLowerCase();
  return role !== undefined && BOILERPLATE_ROLES.has(role);
}

const FORM_CONTROL_TAGS = new Set(["button", "input", "select", "textarea"]);

const FORM_CONTROL_ROLES = new Set([
  "button",
  "checkbox",
  "radio",
  "switch",
  "combobox",
]);

const LANDMARK_SELECTORS = [
  "main",
  "article",
  '[role="main"]',
  '[role="article"]',
];

export interface TextSegment {
  node: Text;
  start: number;
  end: number;
  text: string;
  offset: number;
}

export interface ReadingContent {
  sentences: string[];
  ranges: Range[];
  segments: TextSegment[];
  sentenceStarts: number[];
  title?: string;
}

interface CollectOptions {
  skipFormControls: boolean;
  skipBoilerplate: boolean;
  boundaryRange?: Range;
  collectStructure?: boolean;
}

const EMPTY_STRUCTURE: PageContentStructure = { headings: [], links: [] };

function isVisible(el: Element): boolean {
  if (!("getBoundingClientRect" in el)) return false;
  const view = el.ownerDocument.defaultView;
  if (!view) return false;
  const rect = el.getBoundingClientRect();
  const style = view.getComputedStyle(el);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    style.opacity !== "0"
  );
}

function blockTags(tag: string): boolean {
  return [
    "p",
    "div",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "blockquote",
    "pre",
    "article",
    "section",
  ].includes(tag);
}

function isFormControlElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (FORM_CONTROL_TAGS.has(tag)) return true;
  const role = el.getAttribute("role")?.toLowerCase();
  return role !== undefined && FORM_CONTROL_ROLES.has(role);
}

function isFormControlLabel(el: Element): boolean {
  if (el.tagName.toLowerCase() !== "label") return false;

  const doc = el.ownerDocument;
  const forId = el.getAttribute("for");
  if (forId) {
    const target = doc.getElementById(forId);
    if (target && isFormControlElement(target)) return true;
  }

  return el.querySelector("input, select, textarea, button") !== null;
}

function shouldSkipElement(el: Element, options: CollectOptions): boolean {
  if (options.skipBoilerplate && isBoilerplateElement(el)) return true;
  if (options.skipFormControls) {
    if (isFormControlElement(el) || isFormControlLabel(el)) return true;
  }

  return false;
}

function getTextSliceInBoundary(
  textNode: Text,
  boundaryRange?: Range,
): { start: number; end: number; text: string } | null {
  const full = textNode.textContent ?? "";
  if (!full) return null;

  if (!boundaryRange) {
    const normalized = full.replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    const leading = full.match(/^\s*/)?.[0].length ?? 0;
    const trailing = full.match(/\s*$/)?.[0].length ?? 0;
    return {
      start: leading,
      end: full.length - trailing,
      text: normalized,
    };
  }

  if (!boundaryRange.intersectsNode(textNode)) return null;

  const doc = textNode.ownerDocument;
  const nodeRange = doc.createRange();
  nodeRange.selectNodeContents(textNode);

  let start = 0;
  let end = full.length;

  if (boundaryRange.compareBoundaryPoints(Range.START_TO_START, nodeRange) > 0) {
    const preRange = doc.createRange();
    preRange.setStart(nodeRange.startContainer, nodeRange.startOffset);
    preRange.setEnd(boundaryRange.startContainer, boundaryRange.startOffset);
    start = preRange.toString().length;
  }

  if (boundaryRange.compareBoundaryPoints(Range.END_TO_END, nodeRange) < 0) {
    const preRange = doc.createRange();
    preRange.setStart(nodeRange.startContainer, nodeRange.startOffset);
    preRange.setEnd(boundaryRange.endContainer, boundaryRange.endOffset);
    end = preRange.toString().length;
  }

  const raw = full.slice(start, end);
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const localLeading = raw.match(/^\s*/)?.[0].length ?? 0;
  const localTrailing = raw.match(/\s*$/)?.[0].length ?? 0;

  return {
    start: start + localLeading,
    end: end - localTrailing,
    text: normalized,
  };
}


function isUsefulLink(el: Element): PageContentLink | null {
  const href = el.getAttribute("href")?.trim();
  if (!href || href.startsWith("javascript:")) return null;

  const text = el.textContent?.replace(/\s+/g, " ").trim();
  if (!text) return null;

  return { text, href };
}

function collectSegments(
  root: Element,
  options: CollectOptions,
): {
  segments: TextSegment[];
  fullText: string;
  structure: PageContentStructure;
} {
  let rawText = "";
  const rawSegments: Omit<TextSegment, "offset">[] = [];
  const structure: PageContentStructure = { headings: [], links: [] };

  function appendPart(value: string): number {
    if (!value) return rawText.length;
    if (
      rawText.length > 0 &&
      !value.startsWith("\n") &&
      !rawText.endsWith("\n")
    ) {
      rawText += " ";
    }
    const offset = rawText.length;
    rawText += value;
    return offset;
  }

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text;
      const slice = getTextSliceInBoundary(textNode, options.boundaryRange);
      if (!slice) return;

      const offset = appendPart(slice.text);
      rawSegments.push({
        node: textNode,
        start: slice.start,
        end: slice.end,
        text: slice.text,
        offset,
      });
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (SKIP_TAGS.has(tag)) return;
    if (isHiddenElement(el)) return;
    if (shouldSkipElement(el, options)) return;

    if (tag === "br") {
      appendPart("\n");
      return;
    }

    if (tag === "img") {
      const alt = el.getAttribute("alt")?.trim();
      if (alt) appendPart(alt);
      return;
    }

    if (options.collectStructure) {
      const headingMatch = /^h([1-6])$/.exec(tag);
      if (
        headingMatch &&
        structure.headings.length < PAGE_CONTENT_MAX_HEADINGS
      ) {
        const text = el.textContent?.replace(/\s+/g, " ").trim();
        if (text) {
          structure.headings.push({
            level: Number(headingMatch[1]),
            text,
          });
        }
      }

      if (tag === "a" && structure.links.length < PAGE_CONTENT_MAX_LINKS) {
        const link = isUsefulLink(el);
        if (link) structure.links.push(link);
      }
    }

    for (const child of el.childNodes) {
      walk(child);
    }

    if (blockTags(tag)) {
      appendPart("\n\n");
    }
  }

  walk(root);

  const fullText = rawText
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ +/g, " ")
    .trim();

  if (!fullText) {
    return { segments: [], fullText: "", structure };
  }

  // Recompute stream offsets against final normalized text.
  let cursor = 0;
  const aligned: TextSegment[] = [];

  for (const segment of rawSegments) {
    const idx = fullText.indexOf(segment.text, cursor);
    if (idx === -1) continue;
    aligned.push({ ...segment, offset: idx });
    cursor = idx + segment.text.length;
  }

  return { segments: aligned, fullText, structure };
}

export function findContentRoot(doc: Document = document): {
  root: Element;
  skipBoilerplate: boolean;
} {
  for (const selector of LANDMARK_SELECTORS) {
    const el = doc.querySelector(selector);
    if (el && isVisible(el)) return { root: el, skipBoilerplate: false };
  }

  return { root: doc.body, skipBoilerplate: true };
}

function buildReadingContent(
  doc: Document,
  root: Element,
  options: CollectOptions,
  title?: string,
): ReadingContent {
  const { segments, fullText } = collectSegments(root, options);
  const sentences = splitIntoSentences(fullText);
  const sentenceStarts = computeSentenceStarts(sentences, fullText);
  const ranges = sentencesToRanges(doc, segments, sentences, fullText);

  return { sentences, ranges, segments, sentenceStarts, title };
}

function extractReadableContent(
  doc: Document,
  root: Element,
  options: CollectOptions,
  source: "page" | "selection",
): PageContent {
  const { fullText, structure } = collectSegments(root, {
    ...options,
    collectStructure: true,
  });
  const content = buildPageContent({
    title: doc.title,
    url: doc.location?.href ?? "",
    source,
    text: fullText,
    metadata: extractPageMetadata(doc),
    structure,
  });
  logPageContentForDev(content);
  return content;
}

/** Extract structured page content for summaries and provider adapters. */
export function extractPageContent(doc: Document = document): PageContent {
  try {
    const { root, skipBoilerplate } = findContentRoot(doc);
    return extractReadableContent(
      doc,
      root,
      { skipFormControls: true, skipBoilerplate },
      "page",
    );
  } catch (error) {
    const content = buildFailedPageContent(doc, "page", error);
    logPageContentForDev(content);
    return content;
  }
}

/** Extract structured content from the user's current selection. */
export function extractSelectionContent(doc: Document = document): PageContent {
  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    const content = buildPageContent({
      title: doc.title,
      url: doc.location?.href ?? "",
      source: "selection",
      text: "",
      metadata: extractPageMetadata(doc),
      structure: EMPTY_STRUCTURE,
    });
    logPageContentForDev(content);
    return content;
  }

  try {
    const boundaryRange = selection.getRangeAt(0);
    return extractReadableContent(
      doc,
      doc.body,
      {
        skipFormControls: false,
        skipBoilerplate: false,
        boundaryRange,
      },
      "selection",
    );
  } catch (error) {
    const content = buildFailedPageContent(doc, "selection", error);
    logPageContentForDev(content);
    return content;
  }
}

/** Extract readable plain text from the page for TTS. */
export function extractPageText(doc: Document = document): string {
  const { root, skipBoilerplate } = findContentRoot(doc);
  const { fullText } = collectSegments(root, {
    skipFormControls: true,
    skipBoilerplate,
  });
  return fullText;
}

/** Extract page content as sentences with DOM ranges for highlighting. */
export function extractPageReading(doc: Document = document): ReadingContent {
  const { root, skipBoilerplate } = findContentRoot(doc);
  return buildReadingContent(
    doc,
    root,
    { skipFormControls: true, skipBoilerplate },
    doc.title,
  );
}

/** Extract the user's current text selection. */
export function extractSelectionText(doc: Document = document): string {
  const selection = doc.getSelection();
  return selection?.toString().replace(/\s+/g, " ").trim() ?? "";
}

/** Extract selection as sentences with DOM ranges for highlighting. */
export function extractSelectionReading(doc: Document = document): ReadingContent {
  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return { sentences: [], ranges: [], segments: [], sentenceStarts: [] };
  }

  const boundaryRange = selection.getRangeAt(0);
  return buildReadingContent(doc, doc.body, {
    skipFormControls: false,
    skipBoilerplate: false,
    boundaryRange,
  });
}

/** Split text into paragraph-sized chunks for the speech queue. */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Split text into sentences for pause/resume granularity. */
export function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const parts = normalized.split(/(?<=[.!?…])\s+/);
  const sentences = parts.map((part) => part.trim()).filter(Boolean);

  return sentences.length > 0 ? sentences : [normalized];
}

/** Flatten paragraph chunks into a sentence queue for TTS. */
export function buildSpeechQueue(chunks: string[]): string[] {
  return chunks.flatMap((chunk) => splitIntoSentences(chunk)).filter(Boolean);
}

export { isFormControlElement, isFormControlLabel };
