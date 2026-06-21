import {
  ancestorElements,
  collectTextNodesDeep,
  isHiddenElement,
  queryAllDeep,
} from "./deep-dom";
import {
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

const BOILERPLATE_TAGS = new Set(["nav", "footer", "aside"]);

export const SENTENCE_ATTR = "data-geordi-sentence";
export const WORD_ATTR = "data-geordi-word";
export const WRAPPED_ATTR = "data-geordi-wrapped";

export const HIGHLIGHT_STYLE_ID = "geordi-reading-highlight-styles";
export const HL_SENTENCE_CLASS = "geordi-hl-sentence";
export const HL_WORD_CLASS = "geordi-hl-word";

export interface WrapOptions {
  skipFormControls: boolean;
  skipBoilerplate: boolean;
  boundaryRange?: Range;
}

export function ensureHighlightStyles(doc: Document = document): void {
  if (doc.getElementById(HIGHLIGHT_STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    [${SENTENCE_ATTR}].${HL_SENTENCE_CLASS} {
      background-color: rgba(255, 238, 153, 0.92) !important;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    [${WORD_ATTR}].${HL_WORD_CLASS} {
      background-color: rgba(255, 140, 0, 0.95) !important;
      color: #000 !important;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
  `;
  doc.documentElement.append(style);
}

function shouldSkipElement(el: Element, options: WrapOptions): boolean {
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return true;
  if (isHiddenElement(el)) return true;
  if (options.skipBoilerplate && BOILERPLATE_TAGS.has(tag)) return true;
  if (options.skipFormControls) {
    if (isFormControlElement(el) || isFormControlLabel(el)) return true;
  }
  return false;
}

function shouldSkipTextNode(textNode: Text, options: WrapOptions): boolean {
  if (options.boundaryRange && !options.boundaryRange.intersectsNode(textNode)) {
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
        sentence.classList.add(HL_SENTENCE_CLASS);
        return true;
      }
      charCount = spaceEnd;
    }
  }

  return false;
}
