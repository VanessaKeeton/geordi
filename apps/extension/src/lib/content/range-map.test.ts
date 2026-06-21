import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import type { TextSegment } from "./extract";
import { offsetsToRange, sentencesToRanges, computeSentenceStarts } from "./range-map";

function makeSegment(
  doc: Document,
  text: string,
  offset: number,
): TextSegment {
  const node = doc.createTextNode(text);
  doc.body.append(node);
  return { node, start: 0, end: text.length, text, offset };
}

describe("offsetsToRange", () => {
  it("maps stream offsets to a DOM Range", () => {
    const { window } = new JSDOM("<body></body>");
    const doc = window.document;
    const segments = [
      makeSegment(doc, "Hello ", 0),
      makeSegment(doc, "world.", 6),
    ];

    const range = offsetsToRange(doc, segments, 0, 12);
    expect(range?.toString()).toBe("Hello world.");
  });

  it("maps partial offsets across segments", () => {
    const { window } = new JSDOM("<body></body>");
    const doc = window.document;
    const segments = [
      makeSegment(doc, "First. ", 0),
      makeSegment(doc, "Second.", 7),
    ];

    const range = offsetsToRange(doc, segments, 7, 14);
    expect(range?.toString()).toBe("Second.");
  });
});

describe("computeSentenceStarts", () => {
  it("returns stream offsets for each sentence", () => {
    const fullText = "One. Two.";
    expect(computeSentenceStarts(["One.", "Two."], fullText)).toEqual([0, 5]);
  });
});

describe("sentencesToRanges", () => {
  it("returns one range per sentence", () => {
    const { window } = new JSDOM("<body></body>");
    const doc = window.document;
    const fullText = "One. Two.";
    const segments = [makeSegment(doc, fullText, 0)];
    const sentences = ["One.", "Two."];

    const ranges = sentencesToRanges(doc, segments, sentences, fullText);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]?.toString()).toBe("One.");
    expect(ranges[1]?.toString()).toBe("Two.");
  });
});
