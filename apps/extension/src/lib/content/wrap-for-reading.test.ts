import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getWrappedSpeakableText,
  highlightAtCharIndex,
  HL_WORD_CLASS,
  unwrapReadingMarkup,
  wrapForReading,
} from "./wrap-for-reading";

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
