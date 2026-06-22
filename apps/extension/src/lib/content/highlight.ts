import {
  pickHighlightColor,
  pickHighlightTextColor,
  resolveBackgroundColor,
  resolveTextColor,
} from "./contrast";

const HIGHLIGHT_NAME = "geordi-reading";
const STYLE_ID = "geordi-highlight-styles";

let fallbackMarks: HTMLElement[] = [];
let lastColorKey = "";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function ensureStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ::highlight(${HIGHLIGHT_NAME}) {
      background-color: var(--geordi-hl, #ffe082);
      color: var(--geordi-hl-fg, #111111);
    }
    mark.geordi-reading-mark {
      background-color: var(--geordi-hl, #ffe082);
      color: var(--geordi-hl-fg, #111111);
    }
  `;
  doc.head.append(style);
}

function clearFallbackMarks(): void {
  for (const mark of fallbackMarks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  }
  fallbackMarks = [];
}

function applyAdaptiveColor(doc: Document, range: Range): void {
  const container =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element);

  if (!container) return;

  const textColor = resolveTextColor(container);
  const bgColor = resolveBackgroundColor(container);
  const colorKey = `${textColor.join(",")}:${bgColor.join(",")}`;
  if (colorKey === lastColorKey) return;

  lastColorKey = colorKey;
  const highlight = pickHighlightColor(textColor, bgColor);
  doc.documentElement.style.setProperty("--geordi-hl", highlight);
  doc.documentElement.style.setProperty(
    "--geordi-hl-fg",
    pickHighlightTextColor(highlight),
  );
}

function scrollRangeIntoView(range: Range): void {
  const rect = range.getBoundingClientRect();
  const margin = 48;
  const inView =
    rect.top >= margin &&
    rect.bottom <= window.innerHeight - margin &&
    rect.height > 0;

  if (inView) return;

  const element =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element);

  element?.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

function applyCssHighlight(range: Range): boolean {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return false;

  const highlight = new Highlight(range);
  CSS.highlights.set(HIGHLIGHT_NAME, highlight);
  return true;
}

function applyFallbackHighlight(doc: Document, range: Range): void {
  clearFallbackMarks();

  try {
    const mark = doc.createElement("mark");
    mark.className = "geordi-reading-mark";
    range.surroundContents(mark);
    fallbackMarks.push(mark);
  } catch {
    const fragment = range.extractContents();
    const mark = doc.createElement("mark");
    mark.className = "geordi-reading-mark";
    mark.append(fragment);
    range.insertNode(mark);
    fallbackMarks.push(mark);
  }
}

/** Highlight a range and scroll it into view (sentence-level fallback). */
export function highlightRange(doc: Document, range: Range): void {
  ensureStyles(doc);
  clearHighlight(doc);
  applyAdaptiveColor(doc, range);

  if (!applyCssHighlight(range)) {
    applyFallbackHighlight(doc, range);
  }

  scrollRangeIntoView(range);
}

/** Update the word highlight in sync with speech boundary events. */
export function highlightWordRange(
  doc: Document,
  range: Range,
  scroll = false,
): void {
  ensureStyles(doc);
  applyAdaptiveColor(doc, range);

  if (typeof CSS !== "undefined" && "highlights" in CSS) {
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
  } else {
    applyFallbackHighlight(doc, range);
  }

  if (scroll) {
    scrollRangeIntoView(range);
  }
}

/** Remove all reading highlights from the page. */
export function clearHighlight(doc: Document = document): void {
  if (typeof CSS !== "undefined" && "highlights" in CSS) {
    CSS.highlights.delete(HIGHLIGHT_NAME);
  }
  clearFallbackMarks();
  lastColorKey = "";
  doc.documentElement.style.removeProperty("--geordi-hl");
  doc.documentElement.style.removeProperty("--geordi-hl-fg");
}
