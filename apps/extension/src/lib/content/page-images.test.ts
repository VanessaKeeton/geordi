import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import {
  discoverPageImages,
  fetchSameOriginImageAsDataUrl,
  formatPageImageLabel,
  isPageImageUrl,
  isSameOriginImageResource,
  resolvePageImageCandidate,
  toImageDescriptionInput,
  PAGE_IMAGE_MIN_DIMENSION_PX,
} from "./page-images";

function dom(html: string, url = "https://example.com/article") {
  const { window } = new JSDOM(html, { url });
  window.Element.prototype.getBoundingClientRect = function (this: Element) {
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

    const width = Number(this.getAttribute("data-width") ?? 200);
    const height = Number(this.getAttribute("data-height") ?? 150);
    return {
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
  return window.document;
}

describe("discoverPageImages", () => {
  it("finds meaningful images with context", () => {
    const doc = dom(`
      <body>
        <main>
          <h2>Sales trends</h2>
          <figure>
            <img src="/chart.png" alt="Quarterly revenue chart" data-width="400" data-height="300" />
            <figcaption>Revenue grew 12% year over year.</figcaption>
          </figure>
        </main>
      </body>
    `);

    const result = discoverPageImages(doc);
    expect(result.status).toBe("ok");
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toMatchObject({
      id: "img-0",
      alt: "Quarterly revenue chart",
      resolvedSrc: "https://example.com/chart.png",
      caption: "Revenue grew 12% year over year.",
      nearbyHeading: "Sales trends",
    });
  });

  it("skips decorative, hidden, tiny, and boilerplate images", () => {
    const doc = dom(`
      <body>
        <nav>
          <img src="/logo.png" alt="Site logo" data-width="120" data-height="40" />
        </nav>
        <main>
          <img src="/dot.gif" alt="Analytics" data-width="1" data-height="1" />
          <img src="/icon.png" alt="" data-width="16" data-height="16" />
          <img src="/hero.png" alt="Product photo" style="display:none" data-width="600" data-height="400" />
          <img src="/small.png" alt="Tiny badge" data-width="20" data-height="20" />
          <img role="presentation" src="/divider.png" data-width="600" data-height="4" />
        </main>
      </body>
    `);

    const result = discoverPageImages(doc);
    expect(result.status).toBe("empty");
    expect(result.images).toHaveLength(0);
    expect(result.skipped.map((item) => item.skipReason)).toEqual(
      expect.arrayContaining([
        "boilerplate",
        "tracking_pixel",
        "decorative",
        "hidden",
        "too_small",
        "decorative",
      ]),
    );
  });

  it("reports empty when the page has no images", () => {
    const doc = dom("<body><main><p>Text only.</p></main></body>");
    const result = discoverPageImages(doc);
    expect(result.status).toBe("empty");
    expect(result.message).toContain("no images");
  });

  it("respects minimum dimension threshold", () => {
    expect(PAGE_IMAGE_MIN_DIMENSION_PX).toBeGreaterThanOrEqual(32);
  });
});

describe("resolvePageImageCandidate", () => {
  it("finds a candidate by DOM index even when filters changed", () => {
    const doc = dom(`
      <body>
        <main>
          <img src="/icon.png" alt="" data-width="16" data-height="16" />
          <img src="/hero.png" alt="Product photo" data-width="600" data-height="400" />
        </main>
      </body>
    `);

    const firstPass = discoverPageImages(doc);
    expect(firstPass.images).toHaveLength(1);
    expect(firstPass.images[0]?.id).toBe("img-1");

    const hero = doc.querySelector('img[alt="Product photo"]') as HTMLImageElement;
    hero.setAttribute("data-width", "20");
    hero.setAttribute("data-height", "20");

    const secondPass = discoverPageImages(doc);
    expect(secondPass.images.find((item) => item.id === "img-1")).toBeUndefined();

    const resolved = resolvePageImageCandidate(doc, "img-1");
    expect(resolved).toMatchObject({
      id: "img-1",
      alt: "Product photo",
      skipReason: "too_small",
    });
  });

  it("returns undefined when the DOM index no longer exists", () => {
    const doc = dom(`
      <body><main><img src="/hero.png" alt="Photo" data-width="600" data-height="400" /></main></body>
    `);
    expect(resolvePageImageCandidate(doc, "img-99")).toBeUndefined();
  });
});

describe("toImageDescriptionInput", () => {
  it("maps candidate fields into provider input", () => {
    const input = toImageDescriptionInput(
      {
        id: "img-1",
        status: "discovered",
        alt: "Architecture diagram",
        resolvedSrc: "https://example.com/diagram.png",
        caption: "System overview",
        nearbyHeading: "Design",
        surroundingText: "The service connects to storage.",
        dimensions: { displayWidth: 500, displayHeight: 300 },
      },
      {
        pageUrl: "https://example.com/article",
        imageDataUrl: "data:image/png;base64,abc",
      },
    );

    expect(input).toMatchObject({
      id: "img-1",
      alt: "Architecture diagram",
      src: "https://example.com/diagram.png",
      pageUrl: "https://example.com/article",
      imageDataUrl: "data:image/png;base64,abc",
      context: expect.stringContaining("Caption: System overview"),
    });
  });
});

describe("formatPageImageLabel", () => {
  it("prefers alt text", () => {
    expect(
      formatPageImageLabel({
        id: "img-0",
        status: "discovered",
        alt: "Quarterly revenue chart",
      }),
    ).toBe("Quarterly revenue chart");
  });

  it("falls back to filename from src", () => {
    expect(
      formatPageImageLabel({
        id: "img-1",
        status: "discovered",
        resolvedSrc: "https://example.com/assets/diagram.png",
      }),
    ).toBe("diagram.png");
  });
});

describe("isSameOriginImageResource", () => {
  it("treats data URLs as local", () => {
    expect(
      isSameOriginImageResource(
        "data:image/png;base64,abc",
        "https://example.com/page",
      ),
    ).toBe(true);
  });

  it("matches page origin only", () => {
    expect(
      isSameOriginImageResource(
        "https://example.com/chart.png",
        "https://example.com/page",
      ),
    ).toBe(true);
    expect(
      isSameOriginImageResource(
        "https://cdn.example.com/chart.png",
        "https://example.com/page",
      ),
    ).toBe(false);
  });
});

describe("isPageImageUrl", () => {
  it("accepts third-party CDN URLs shown on the page", () => {
    expect(
      isPageImageUrl("https://m.media-amazon.com/images/I/51.jpg"),
    ).toBe(true);
  });
});

describe("fetchSameOriginImageAsDataUrl", () => {
  it("returns data URLs unchanged", async () => {
    const doc = dom("<body></body>");
    await expect(
      fetchSameOriginImageAsDataUrl("data:image/png;base64,abc", doc),
    ).resolves.toBe("data:image/png;base64,abc");
  });

  it("fetches same-origin image bytes", async () => {
    const doc = dom("<body></body>");
    const blob = new Blob(["pixels"], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => blob,
      })),
    );

    const dataUrl = await fetchSameOriginImageAsDataUrl(
      "https://example.com/chart.png",
      doc,
    );
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    vi.unstubAllGlobals();
  });
});
