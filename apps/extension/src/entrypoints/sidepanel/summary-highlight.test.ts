import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clearSummaryHighlight,
  highlightSummaryAtChar,
  prepareSummaryForReading,
  teardownSummaryMarkup,
} from "./summary-highlight";
import {
  HL_SENTENCE_CLASS,
  HL_WORD_CLASS,
  SENTENCE_ATTR,
  WORD_ATTR,
} from "../../lib/content/wrap-for-reading";

describe("summary-highlight", () => {
  let container: HTMLParagraphElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("p");
    document.body.append(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("wraps summary text and returns speakable string", () => {
    const speakable = prepareSummaryForReading(
      container,
      "Hello world. Second sentence.",
    );
    expect(speakable).toBe("Hello world. Second sentence.");
    expect(container.querySelectorAll(`[${WORD_ATTR}]`).length).toBeGreaterThan(
      0,
    );
  });

  it("highlights the active word at charIndex", () => {
    const scrollRoot = document.createElement("div");
    scrollRoot.style.height = "40px";
    scrollRoot.style.overflow = "auto";
    scrollRoot.append(container);
    document.body.append(scrollRoot);

    prepareSummaryForReading(container, "Hello world.");
    highlightSummaryAtChar(container, 0, scrollRoot);
    const word = container.querySelector(`[${WORD_ATTR}].${HL_WORD_CLASS}`);
    const sentence = container.querySelector(
      `[${SENTENCE_ATTR}].${HL_SENTENCE_CLASS}`,
    );
    expect(word?.textContent).toContain("Hello");
    expect(sentence).toBeTruthy();
  });

  it("scrolls only within the summary container, not the page", () => {
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }

    const scrollRoot = document.createElement("div");
    document.body.append(scrollRoot);
    scrollRoot.append(container);
    prepareSummaryForReading(container, "Hello world. Second sentence here.");

    const scrollIntoViewSpy = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});

    const secondSentenceStart = "Hello world. Second".length;
    highlightSummaryAtChar(container, secondSentenceStart, scrollRoot);

    expect(scrollIntoViewSpy).not.toHaveBeenCalled();

    scrollIntoViewSpy.mockRestore();
  });

  it("clears highlight styles without removing wraps", () => {
    const scrollRoot = document.createElement("div");
    scrollRoot.append(container);
    document.body.append(scrollRoot);

    prepareSummaryForReading(container, "Hello world.");
    highlightSummaryAtChar(container, 0, scrollRoot);
    clearSummaryHighlight(container);
    expect(container.querySelector(`.${HL_WORD_CLASS}`)).toBeNull();
    expect(container.querySelector(`[${WORD_ATTR}]`)).toBeTruthy();
  });

  it("teardown removes reading markup", () => {
    prepareSummaryForReading(container, "Hello world.");
    teardownSummaryMarkup(container);
    expect(container.querySelector(`[${WORD_ATTR}]`)).toBeNull();
    expect(container.textContent?.trim()).toBe("Hello world.");
  });
});
