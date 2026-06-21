import type { TextSegment } from "./extract";

/** Map stream offsets to a live DOM Range. */
export function offsetsToRange(
  doc: Document,
  segments: TextSegment[],
  start: number,
  end: number,
): Range | null {
  if (start >= end || segments.length === 0) return null;

  let rangeStart: { node: Text; offset: number } | null = null;
  let rangeEnd: { node: Text; offset: number } | null = null;

  for (const segment of segments) {
    const segStart = segment.offset;
    const segEnd = segment.offset + segment.text.length;

    if (segEnd <= start) continue;
    if (segStart >= end) break;

    const overlapStart = Math.max(start, segStart);
    const overlapEnd = Math.min(end, segEnd);
    const localStart = segment.start + (overlapStart - segStart);
    const localEnd = segment.start + (overlapEnd - segStart);

    if (!rangeStart) {
      rangeStart = { node: segment.node, offset: localStart };
    }
    rangeEnd = { node: segment.node, offset: localEnd };
  }

  if (!rangeStart || !rangeEnd) return null;

  const range = doc.createRange();
  range.setStart(rangeStart.node, rangeStart.offset);
  range.setEnd(rangeEnd.node, rangeEnd.offset);
  return range;
}

/** Find the stream offset where each sentence begins in fullText. */
export function computeSentenceStarts(
  sentences: string[],
  fullText: string,
): number[] {
  const starts: number[] = [];
  let searchFrom = 0;

  for (const sentence of sentences) {
    const idx = fullText.indexOf(sentence, searchFrom);
    if (idx === -1) {
      starts.push(-1);
      continue;
    }
    starts.push(idx);
    searchFrom = idx + sentence.length;
  }

  return starts;
}

/** Map each sentence string to its DOM Range using segment offsets. */
export function sentencesToRanges(
  doc: Document,
  segments: TextSegment[],
  sentences: string[],
  fullText: string,
): Range[] {
  const ranges: Range[] = [];
  let searchFrom = 0;

  for (const sentence of sentences) {
    const idx = fullText.indexOf(sentence, searchFrom);
    if (idx === -1) {
      ranges.push(null as unknown as Range);
      continue;
    }
    const range = offsetsToRange(doc, segments, idx, idx + sentence.length);
    ranges.push(range ?? (null as unknown as Range));
    searchFrom = idx + sentence.length;
  }

  return ranges;
}
