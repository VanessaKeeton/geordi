import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { contrastRatio } from "./contrast";
import {
  clearReadingStyles,
  getWrappedSpeakableText,
  highlightAtCharIndex,
  HL_SENTENCE_CLASS,
  HL_SENTENCE_FG_VAR,
  HL_WORD_CLASS,
  HL_WORD_FG_VAR,
  unwrapReadingMarkup,
  wrapForReading,
} from "./wrap-for-reading";

function parseRgb(value: string): [number, number, number] {
  const match = value.match(/(\d+)\D+(\d+)\D+(\d+)/);
  if (!match) throw new Error(`not an rgb value: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

describe("wrap-for-reading", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const style = window.getComputedStyle(this);
      if (style.display === "none" || style.visibility === "hidden") {
        return {
          width: 0,
          height: 0,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return {
        width: 100,
        height: 20,
        top: 0,
        left: 0,
        bottom: 20,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
    container = document.createElement("div");
    container.innerHTML =
      "<p>Hello world. Second sentence!</p><button>Skip me</button>";
    document.body.append(container);
  });

  afterEach(() => {
    unwrapReadingMarkup(container);
    document.documentElement.style.removeProperty(HL_SENTENCE_FG_VAR);
    document.documentElement.style.removeProperty(HL_WORD_FG_VAR);
    document.body.innerHTML = "";
  });

  it("wraps readable text and skips form controls", () => {
    wrapForReading(container, {
      skipFormControls: true,
      skipBoilerplate: false,
    });

    expect(container.querySelectorAll("[data-geordi-word]").length).toBeGreaterThan(0);
    expect(container.querySelector("button [data-geordi-word]")).toBeNull();
  });

  it("builds speakable text from wrapped word spans", () => {
    wrapForReading(container, {
      skipFormControls: true,
      skipBoilerplate: false,
    });

    const text = getWrappedSpeakableText(container);
    expect(text).toContain("Hello world.");
    expect(text).toContain("Second sentence!");
    expect(text).not.toContain("Skip me");
  });

  it("highlights the word at a global char index", () => {
    wrapForReading(container, {
      skipFormControls: true,
      skipBoilerplate: false,
    });

    const text = getWrappedSpeakableText(container);
    const secondSentenceStart = text.indexOf("Second");
    expect(secondSentenceStart).toBeGreaterThan(0);

    const found = highlightAtCharIndex(container, secondSentenceStart);
    expect(found).toBe(true);

    const words = [...container.querySelectorAll("[data-geordi-word]")];
    let charCount = 0;
    let targetWord: HTMLElement | null = null;
    const sentences = [...container.querySelectorAll("[data-geordi-sentence]")];

    outer: for (let s = 0; s < sentences.length; s += 1) {
      for (const word of sentences[s].querySelectorAll("[data-geordi-word]")) {
        const length = word.textContent?.length ?? 0;
        if (
          secondSentenceStart >= charCount &&
          secondSentenceStart < charCount + length
        ) {
          targetWord = word as HTMLElement;
          break outer;
        }
        charCount += length;
      }
      if (s < sentences.length - 1) charCount += 1;
    }

    expect(targetWord?.classList.contains(HL_WORD_CLASS)).toBe(true);
  });

  it("wraps text inside open shadow roots", () => {
    const host = document.createElement("article");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<p>Shadow headline. Another line!</p>";
    container.append(host);

    wrapForReading(container, {
      skipFormControls: true,
      skipBoilerplate: false,
    });

    const text = getWrappedSpeakableText(document);
    expect(text).toContain("Shadow headline.");
    expect(shadow.querySelectorAll("[data-geordi-word]").length).toBeGreaterThan(0);
  });

  it("scopes wrapping to the content root", () => {
    const main = document.createElement("main");
    main.innerHTML = "<p>Inside main only.</p>";
    const nav = document.createElement("nav");
    nav.textContent = "Skip navigation";
    document.body.append(nav, main);

    wrapForReading(document.body, {
      skipFormControls: true,
      skipBoilerplate: true,
      contentRoot: main,
    });

    const text = getWrappedSpeakableText(document);
    expect(text).toContain("Inside main only.");
    expect(text).not.toContain("Skip navigation");
    nav.remove();
    main.remove();
  });

  describe("adaptive highlight contrast", () => {
    function highlightFirstWord(): void {
      wrapForReading(container, {
        skipFormControls: true,
        skipBoilerplate: false,
      });
      const found = highlightAtCharIndex(container, 0);
      expect(found).toBe(true);
    }

    it("keeps highlighted text readable on a dark page with light text", () => {
      container.setAttribute(
        "style",
        "background-color: rgb(18, 18, 18); color: rgb(240, 240, 240)",
      );
      highlightFirstWord();

      const sentenceFg = parseRgb(
        document.documentElement.style.getPropertyValue(HL_SENTENCE_FG_VAR),
      );
      const wordFg = parseRgb(
        document.documentElement.style.getPropertyValue(HL_WORD_FG_VAR),
      );

      // Light page text would be unreadable on the light/orange fills, so it is
      // overridden to black for both the sentence and the active word.
      expect(sentenceFg).toEqual([0, 0, 0]);
      expect(wordFg).toEqual([0, 0, 0]);
      expect(contrastRatio(sentenceFg, [236, 220, 142])).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(wordFg, [243, 134, 1])).toBeGreaterThanOrEqual(4.5);
    });

    it("preserves dark page text on a light page", () => {
      container.setAttribute(
        "style",
        "background-color: rgb(255, 255, 255); color: rgb(17, 17, 17)",
      );
      highlightFirstWord();

      const sentenceFg = parseRgb(
        document.documentElement.style.getPropertyValue(HL_SENTENCE_FG_VAR),
      );
      const wordFg = parseRgb(
        document.documentElement.style.getPropertyValue(HL_WORD_FG_VAR),
      );

      // Dark page text already meets AA against the light fills, so it is kept.
      expect(sentenceFg).toEqual([17, 17, 17]);
      expect(wordFg).toEqual([17, 17, 17]);
    });

    it("removes highlight color variables when styles are cleared", () => {
      container.setAttribute(
        "style",
        "background-color: rgb(18, 18, 18); color: rgb(240, 240, 240)",
      );
      highlightFirstWord();
      expect(
        document.documentElement.style.getPropertyValue(HL_SENTENCE_FG_VAR),
      ).not.toBe("");

      clearReadingStyles(container);

      expect(
        container.querySelector(`.${HL_SENTENCE_CLASS}`),
      ).toBeNull();
      expect(container.querySelector(`.${HL_WORD_CLASS}`)).toBeNull();
      expect(
        document.documentElement.style.getPropertyValue(HL_SENTENCE_FG_VAR),
      ).toBe("");
      expect(
        document.documentElement.style.getPropertyValue(HL_WORD_FG_VAR),
      ).toBe("");
    });
  });

  it("unwrap restores original text nodes", () => {
    wrapForReading(container, {
      skipFormControls: true,
      skipBoilerplate: false,
    });
    unwrapReadingMarkup(container);

    expect(container.querySelector("[data-geordi-word]")).toBeNull();
    expect(container.textContent).toContain("Hello world.");
  });
});
