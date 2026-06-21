import {
  findContentRoot,
  isFormControlElement,
  isFormControlLabel,
  splitIntoSentences,
} from "./extract";
import {
  getWrappedSpeakableText,
  unwrapReadingMarkup,
  wrapForReading,
} from "./wrap-for-reading";

export interface PageReadingResult {
  text: string;
  title: string;
  sentenceCount: number;
}

let wrappedRoot: HTMLElement | null = null;
let wrappedDoc: Document | null = null;

export function getWrappedReadingRoot(): HTMLElement | null {
  return wrappedRoot;
}

export function getWrappedReadingDocument(): Document | null {
  return wrappedDoc;
}

export function clearWrappedReading(): void {
  if (wrappedDoc) {
    unwrapReadingMarkup(wrappedDoc);
  }
  wrappedRoot = null;
  wrappedDoc = null;
}

/** Wrap readable page content and return text aligned with highlight spans. */
export function preparePageReading(doc: Document = document): PageReadingResult {
  clearWrappedReading();

  const { root, skipBoilerplate } = findContentRoot(doc);

  wrapForReading(doc.body, {
    skipFormControls: true,
    skipBoilerplate,
    contentRoot: root,
  });

  wrappedRoot = doc.body;
  wrappedDoc = doc;
  const text = getWrappedSpeakableText(doc);

  return {
    text,
    title: doc.title,
    sentenceCount: splitIntoSentences(text).length,
  };
}

/** Wrap selected text and return speakable string aligned with highlight spans. */
export function prepareSelectionReading(doc: Document = document): PageReadingResult {
  clearWrappedReading();

  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return { text: "", title: doc.title, sentenceCount: 0 };
  }

  const range = selection.getRangeAt(0);
  const container = doc.body;
  wrapForReading(container, {
    skipFormControls: false,
    skipBoilerplate: false,
    boundaryRange: range,
  });

  wrappedRoot = container;
  wrappedDoc = doc;
  const text = getWrappedSpeakableText(doc);

  return {
    text,
    title: doc.title,
    sentenceCount: splitIntoSentences(text).length,
  };
}

export { isFormControlElement, isFormControlLabel };
