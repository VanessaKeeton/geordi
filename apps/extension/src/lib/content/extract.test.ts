import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import {
  extractPageText,
  extractPageReading,
  extractSelectionReading,
  extractSelectionText,
  splitIntoParagraphs,
  splitIntoSentences,
  buildSpeechQueue,
} from "./extract";

function dom(html: string) {
  const { window } = new JSDOM(html, { url: "https://example.com" });
  window.Element.prototype.getBoundingClientRect = function (this: Element) {
    const style = window.getComputedStyle(this);
    if (style.display === "none" || style.visibility === "hidden") {
      return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    }
    return { width: 100, height: 20, top: 0, left: 0, bottom: 20, right: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
  return window.document;
}

describe("extractPageText", () => {
  it("prefers main landmark over nav and footer", () => {
    const doc = dom(`
      <body>
        <nav>Skip this navigation</nav>
        <main><p>Main article content here.</p></main>
        <footer>Copyright notice</footer>
      </body>
    `);
    const text = extractPageText(doc);
    expect(text).toContain("Main article content");
    expect(text).not.toContain("Skip this navigation");
    expect(text).not.toContain("Copyright notice");
  });

  it("ignores hidden elements", () => {
    const doc = dom(`
      <body>
        <main>
          <p>Visible text</p>
          <p style="display:none">Hidden text</p>
        </main>
      </body>
    `);
    const text = extractPageText(doc);
    expect(text).toContain("Visible text");
    expect(text).not.toContain("Hidden text");
  });

  it("includes image alt text", () => {
    const doc = dom(`
      <body>
        <main><img src="x.png" alt="A chart showing trends" /></main>
      </body>
    `);
    const text = extractPageText(doc);
    expect(text).toContain("A chart showing trends");
  });

  it("skips button text inside main", () => {
    const doc = dom(`
      <body>
        <main>
          <p>Article body.</p>
          <button>Subscribe now</button>
        </main>
      </body>
    `);
    const text = extractPageText(doc);
    expect(text).toContain("Article body");
    expect(text).not.toContain("Subscribe now");
  });

  it("skips checkbox and associated label", () => {
    const doc = dom(`
      <body>
        <main>
          <p>News content.</p>
          <label for="agree"><input type="checkbox" id="agree" /> I agree to terms</label>
        </main>
      </body>
    `);
    const text = extractPageText(doc);
    expect(text).toContain("News content");
    expect(text).not.toContain("I agree to terms");
  });

  it("keeps link text inside main", () => {
    const doc = dom(`
      <body>
        <main>
          <p>Read <a href="/more">more details</a> here.</p>
        </main>
      </body>
    `);
    const text = extractPageText(doc);
    expect(text).toContain("more details");
  });
});

describe("extractPageReading", () => {
  it("returns sentences with DOM ranges", () => {
    const doc = dom(`
      <body>
        <main><p>First sentence. Second sentence.</p></main>
      </body>
    `);
    const content = extractPageReading(doc);
    expect(content.sentences).toEqual(["First sentence.", "Second sentence."]);
    expect(content.ranges).toHaveLength(2);
    expect(content.ranges[0]?.toString()).toBe("First sentence.");
  });
});

describe("extractSelectionReading", () => {
  it("returns sentences from selected text with ranges", () => {
    const doc = dom(`<body><p>Hello world. Goodbye world.</p></body>`);
    const p = doc.querySelector("p")!;
    const range = doc.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 12);
    doc.getSelection()?.removeAllRanges();
    doc.getSelection()?.addRange(range);

    const content = extractSelectionReading(doc);
    expect(content.sentences).toEqual(["Hello world."]);
    expect(content.ranges).toHaveLength(1);
  });
});

describe("extractSelectionText", () => {
  it("returns trimmed selection text", () => {
    const doc = dom(`<body><p>Hello world selection</p></body>`);
    const range = doc.createRange();
    range.selectNodeContents(doc.querySelector("p")!);
    doc.getSelection()?.removeAllRanges();
    doc.getSelection()?.addRange(range);
    expect(extractSelectionText(doc)).toBe("Hello world selection");
  });

  it("returns empty string when nothing selected", () => {
    const doc = dom(`<body><p>Hello</p></body>`);
    expect(extractSelectionText(doc)).toBe("");
  });
});

describe("splitIntoParagraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(splitIntoParagraphs("First para.\n\nSecond para.")).toEqual([
      "First para.",
      "Second para.",
    ]);
  });

  it("filters empty chunks", () => {
    expect(splitIntoParagraphs("Only one\n\n\n")).toEqual(["Only one"]);
  });
});

describe("splitIntoSentences", () => {
  it("splits on sentence boundaries", () => {
    expect(splitIntoSentences("Hello world. How are you? Fine!")).toEqual([
      "Hello world.",
      "How are you?",
      "Fine!",
    ]);
  });

  it("returns single sentence when no boundary", () => {
    expect(splitIntoSentences("Just one phrase")).toEqual(["Just one phrase"]);
  });
});

describe("buildSpeechQueue", () => {
  it("flattens paragraphs into sentences", () => {
    expect(
      buildSpeechQueue(["First sent. Second sent.", "Third sent."]),
    ).toEqual(["First sent.", "Second sent.", "Third sent."]);
  });
});
