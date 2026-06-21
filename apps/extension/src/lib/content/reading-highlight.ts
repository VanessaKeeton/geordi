import type { TextSegment } from "./extract";
import {
  clearHighlight,
  highlightRange,
  highlightWordRange,
} from "./highlight";
import { offsetsToRange } from "./range-map";

export interface ReadingSession {
  segments: TextSegment[];
  sentenceStarts: number[];
  sentenceRanges: Range[];
}

let lastScrolledSentence = -1;

export function createReadingSession(content: {
  segments: TextSegment[];
  sentenceStarts: number[];
  ranges: Range[];
}): ReadingSession {
  lastScrolledSentence = -1;
  return {
    segments: content.segments,
    sentenceStarts: content.sentenceStarts,
    sentenceRanges: content.ranges,
  };
}

export function clearReadingHighlight(doc: Document): void {
  clearHighlight(doc);
  lastScrolledSentence = -1;
}

export function highlightSentence(
  doc: Document,
  session: ReadingSession,
  sentenceIndex: number,
): void {
  const range = session.sentenceRanges[sentenceIndex];
  if (!range) return;

  lastScrolledSentence = sentenceIndex;
  highlightRange(doc, range);
}

export function highlightWord(
  doc: Document,
  session: ReadingSession,
  sentenceIndex: number,
  charIndex: number,
  charLength: number,
): void {
  const sentenceStart = session.sentenceStarts[sentenceIndex];
  if (sentenceStart === undefined || sentenceStart < 0) {
    highlightSentence(doc, session, sentenceIndex);
    return;
  }

  const start = sentenceStart + charIndex;
  const end = start + Math.max(charLength, 1);
  const range = offsetsToRange(doc, session.segments, start, end);

  if (!range) {
    highlightSentence(doc, session, sentenceIndex);
    return;
  }

  const rect = range.getBoundingClientRect();
  const margin = 48;
  const inView =
    rect.top >= margin &&
    rect.bottom <= window.innerHeight - margin &&
    rect.height > 0;
  const shouldScroll = sentenceIndex !== lastScrolledSentence || !inView;

  highlightWordRange(doc, range, shouldScroll);
  if (shouldScroll) {
    lastScrolledSentence = sentenceIndex;
  }
}
