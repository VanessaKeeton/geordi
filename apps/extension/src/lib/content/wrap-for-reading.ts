import {
  blendOver,
  resolveBackgroundColor,
  resolveHighlightTextColor,
  resolveTextColor,
  rgbToCss,
  type Rgb,
} from "./contrast";
import {
  ancestorElements,
  collectTextNodesDeep,
  isHiddenElement,
  isNodeInSubtree,
  queryAllDeep,
} from "./deep-dom";
import {
  isBoilerplateElement,
  isFormControlElement,
  isFormControlLabel,
} from "./extract";

const SKIP_TAGS = new Set([
  "script",
  "style",
  "meta",
  "link",
  "noscript",
  "head",
  "svg",
]);

export const SENTENCE_ATTR = "data-geordi-sentence";
export const WORD_ATTR = "data-geordi-word";
export const WRAPPED_ATTR = "data-geordi-wrapped";

export const HIGHLIGHT_STYLE_ID = "geordi-reading-highlight-styles";
export const HL_SENTENCE_CLASS = "geordi-hl-sentence";
export const HL_WORD_CLASS = "geordi-hl-word";

export const HL_SENTENCE_FG_VAR = "--geordi-hl-sentence-fg";
export const HL_WORD_FG_VAR = "--geordi-hl-word-fg";

// Highlight fills as opaque base color + alpha, kept in sync with the stylesheet
// below so contrast math composites against the real rendered background.
const SENTENCE_FILL: Rgb = [255, 238, 153];
const SENTENCE_ALPHA = 0.92;
const WORD_FILL: Rgb = [255, 140, 0];
const WORD_ALPHA = 0.95;

export interface WrapOptions {
  skipFormControls: boolean;
  skipBoilerplate: boolean;
  contentRoot?: Element;
  boundaryRange?: Range;
}

export function ensureHighlightStyles(doc: Document = document): void {
  if (doc.getElementById(HIGHLIGHT_STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    [${SENTENCE_ATTR}].${HL_SENTENCE_CLASS} {
      background-color: rgba(255, 238, 153, ${SENTENCE_ALPHA}) !important;
      color: var(${HL_SENTENCE_FG_VAR}, #1a1a1a) !important;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    [${WORD_ATTR}].${HL_WORD_CLASS} {
      background-color: rgba(255, 140, 0, ${WORD_ALPHA}) !important;
      color: var(${HL_WORD_FG_VAR}, #1a1a1a) !important;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
  `;
  doc.documentElement.append(style);
}

/**
 * Compute readable highlight text colors from the page's own foreground/background
 * and expose them as CSS variables on the document root. The fixed yellow/orange
 * fills stay recognizable; only the text color adapts so highlighted reading text
 * stays legible on dark pages with light text. Variables are removed on clear, so
 * the page's own styles are never permanently changed.
 */
function applyAdaptiveHighlightColors(sentence: Element, word?: Element): void {
  const root = sentence.ownerDocument?.documentElement;
  if (!root) return;

  const pageBackground = resolveBackgroundColor(sentence);
  const pageText = resolveTextColor(word ?? sentence);

  const sentenceBg = blendOver(SENTENCE_FILL, pageBackground, SENTENCE_ALPHA);
  const sentenceFg = resolveHighlightTextColor(pageText, sentenceBg);
  root.style.setProperty(HL_SENTENCE_FG_VAR, rgbToCss(sentenceFg));

  const wordBg = blendOver(WORD_FILL, pageBackground, WORD_ALPHA);
  const wordFg = resolveHighlightTextColor(pageText, wordBg);
  root.style.setProperty(HL_WORD_FG_VAR, rgbToCss(wordFg));
}

function shouldSkipElement(el: Element, options: WrapOptions): boolean {
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return true;
  if (isHiddenElement(el)) return true;
  if (options.skipBoilerplate && isBoilerplateElement(el)) return true;
  if (options.skipFormControls) {
    if (isFormControlElement(el) || isFormControlLabel(el)) return true;
  }
  return false;
}

function shouldSkipTextNode(textNode: Text, options: WrapOptions): boolean {
  if (options.boundaryRange && !options.boundaryRange.intersectsNode(textNode)) {
    return true;
  }

  if (options.contentRoot && !isNodeInSubtree(textNode, options.contentRoot)) {
    return true;
  }

  for (const el of ancestorElements(textNode)) {
    if (shouldSkipElement(el, options)) return true;
  }

  return false;
}

function wrapTextNode(node: Text): void {
  const raw = node.nodeValue ?? "";
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return;

  const sentences = trimmed.split(/(?<=[.!?…])\s+|\n+/).filter(Boolean);
  const fragment = document.createDocumentFragment();

  for (const sentence of sentences) {
    const sentenceSpan = document.createElement("span");
    sentenceSpan.setAttribute(SENTENCE_ATTR, "true");

    const words = sentence.split(/\s+/).filter(Boolean);
    words.forEach((word, index) => {
      const wordSpan = document.createElement("span");
      wordSpan.setAttribute(WORD_ATTR, "true");
      wordSpan.textContent = word + (index < words.length - 1 ? " " : "");
      sentenceSpan.append(wordSpan);
    });

    fragment.append(sentenceSpan);
    fragment.append(document.createTextNode(" "));
  }

  node.parentNode?.replaceChild(fragment, node);
}

/** Wrap readable text nodes in sentence/word spans for charIndex highlighting. */
export function wrapForReading(
  container: HTMLElement,
  options: WrapOptions,
): void {
  ensureHighlightStyles(container.ownerDocument);
  unwrapReadingMarkup(container);

  const textNodes = collectTextNodesDeep(container).filter((textNode) => {
    if (shouldSkipTextNode(textNode, options)) return false;
    const trimmed = (textNode.nodeValue ?? "").replace(/\s+/g, " ").trim();
    return Boolean(trimmed);
  });

  for (const node of textNodes) {
    wrapTextNode(node);
  }

  container.setAttribute(WRAPPED_ATTR, "true");
}

/** Build the exact string passed to speechSynthesis from wrapped spans. */
export function getWrappedSpeakableText(container: Element | Document): string {
  const sentences = queryAllDeep(container, `[${SENTENCE_ATTR}]`);
  const parts: string[] = [];

  sentences.forEach((sentence, index) => {
    let sentenceText = "";
    sentence.querySelectorAll(`[${WORD_ATTR}]`).forEach((word) => {
      sentenceText += word.textContent ?? "";
    });
    parts.push(sentenceText);
    if (index < sentences.length - 1) {
      parts.push(" ");
    }
  });

  return parts.join("");
}

export function unwrapReadingMarkup(container: Element | Document): void {
  queryAllDeep(container, `[${SENTENCE_ATTR}]`).forEach((sentence) => {
    const text = sentence.textContent ?? "";
    sentence.replaceWith(document.createTextNode(text));
  });

  if (container instanceof Element) {
    container.removeAttribute(WRAPPED_ATTR);
    container.normalize?.();
  }
}

export function clearReadingStyles(container: Element | Document): void {
  queryAllDeep(container, `[${SENTENCE_ATTR}]`).forEach((el) => {
    el.classList.remove(HL_SENTENCE_CLASS);
  });
  queryAllDeep(container, `[${WORD_ATTR}]`).forEach((el) => {
    el.classList.remove(HL_WORD_CLASS);
  });

  const root =
    container instanceof Document
      ? container.documentElement
      : container.ownerDocument?.documentElement;
  root?.style.removeProperty(HL_SENTENCE_FG_VAR);
  root?.style.removeProperty(HL_WORD_FG_VAR);
}

/** Highlight word + sentence at a global charIndex (speechify-dry-run pattern). */
export function highlightAtCharIndex(
  container: Element | Document,
  charIndex: number,
): boolean {
  clearReadingStyles(container);

  let charCount = 0;
  const sentences = queryAllDeep(container, `[${SENTENCE_ATTR}]`);

  for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex += 1) {
    const sentence = sentences[sentenceIndex];
    const words = sentence.querySelectorAll(`[${WORD_ATTR}]`);
    for (const word of words) {
      const length = word.textContent?.length ?? 0;
      const start = charCount;
      const end = charCount + length;

      if (charIndex >= start && charIndex < end) {
        // Resolve page colors before applying classes so the spans still report
        // the page's own foreground color rather than our highlight override.
        applyAdaptiveHighlightColors(sentence, word);
        sentence.classList.add(HL_SENTENCE_CLASS);
        word.classList.add(HL_WORD_CLASS);
        word.scrollIntoView?.({ block: "center", behavior: "smooth" });
        return true;
      }

      charCount = end;
    }

    if (sentenceIndex < sentences.length - 1) {
      const spaceStart = charCount;
      const spaceEnd = charCount + 1;
      if (charIndex >= spaceStart && charIndex < spaceEnd) {
        applyAdaptiveHighlightColors(sentence);
        sentence.classList.add(HL_SENTENCE_CLASS);
        return true;
      }
      charCount = spaceEnd;
    }
  }

  return false;
}
