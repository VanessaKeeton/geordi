import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import {
  clearPageImageHighlight,
  highlightPageImage,
  PAGE_IMAGE_HIGHLIGHT_CLASS,
  PAGE_IMAGE_HIGHLIGHT_OVERLAY_ID,
} from "./highlight-page-image";

function dom(html: string) {
  const { window } = new JSDOM(html, { url: "https://example.com/page" });
  window.Element.prototype.getBoundingClientRect = function (this: Element) {
    const width = Number(this.getAttribute("data-width") ?? 200);
    const height = Number(this.getAttribute("data-height") ?? 150);
    return {
      width,
      height,
      top: 10,
      left: 20,
      bottom: 10 + height,
      right: 20 + width,
      x: 20,
      y: 10,
      toJSON: () => ({}),
    } as DOMRect;
  };
  return window.document;
}

describe("highlightPageImage", () => {
  beforeEach(() => {
    clearPageImageHighlight();
  });

  it("adds inline highlight styles and a positioned overlay", () => {
    const doc = dom(`
      <body>
        <main>
          <img src="/hero.png" alt="Product photo" data-width="400" data-height="300" />
        </main>
      </body>
    `);

    const highlighted = highlightPageImage(doc, "img-0", { scrollIntoView: false });
    const img = doc.querySelector("img")!;

    expect(highlighted).toBe(true);
    expect(img.classList.contains(PAGE_IMAGE_HIGHLIGHT_CLASS)).toBe(true);
    expect(img.style.outline).toContain("#ff8c00");

    const overlay = doc.getElementById(PAGE_IMAGE_HIGHLIGHT_OVERLAY_ID);
    expect(overlay?.hidden).toBe(false);
    expect(overlay?.style.width).toBe("400px");
  });

  it("moves the highlight when selection changes", () => {
    const doc = dom(`
      <body>
        <img src="/one.png" alt="One" data-width="100" data-height="100" />
        <img src="/two.png" alt="Two" data-width="120" data-height="80" />
      </body>
    `);
    const images = doc.querySelectorAll("img");

    highlightPageImage(doc, "img-0", { scrollIntoView: false });
    highlightPageImage(doc, "img-1", { scrollIntoView: false });

    expect(images[0]?.style.outline).toBe("");
    expect(images[1]?.style.outline).toContain("#ff8c00");
  });

  it("returns false when the image id is missing", () => {
    const doc = dom("<body></body>");
    expect(highlightPageImage(doc, "img-99", { scrollIntoView: false })).toBe(
      false,
    );
  });
});
