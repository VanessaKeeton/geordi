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

const LANDMARK_SELECTORS = [
  "main",
  "article",
  '[role="main"]',
  '[role="article"]',
];

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

function collectText(root: Element): string {
  const parts: string[] = [];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (text) parts.push(text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (SKIP_TAGS.has(tag)) return;
    if (!isVisible(el)) return;

    if (tag === "br") {
      parts.push("\n");
      return;
    }

    if (tag === "img") {
      const alt = el.getAttribute("alt")?.trim();
      if (alt) parts.push(alt);
      return;
    }

    for (const child of el.childNodes) {
      walk(child);
    }

    if (blockTags(tag)) {
      parts.push("\n\n");
    }
  }

  walk(root);
  return parts.join(" ").replace(/\n{3,}/g, "\n\n").replace(/ +/g, " ").trim();
}

function findContentRoot(doc: Document = document): Element {
  for (const selector of LANDMARK_SELECTORS) {
    const el = doc.querySelector(selector);
    if (el && isVisible(el)) return el;
  }

  const clone = doc.body.cloneNode(true) as HTMLElement;
  for (const tag of BOILERPLATE_TAGS) {
    clone.querySelectorAll(tag).forEach((node) => node.remove());
  }
  return clone;
}

/** Extract readable plain text from the page for TTS. */
export function extractPageText(doc: Document = document): string {
  const root = findContentRoot(doc);
  return collectText(root);
}

/** Extract the user's current text selection. */
export function extractSelectionText(doc: Document = document): string {
  const selection = doc.getSelection();
  return selection?.toString().replace(/\s+/g, " ").trim() ?? "";
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
