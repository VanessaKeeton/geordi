import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import {
  extractPageText,
  extractPageReading,
  extractPageContent,
  extractSelectionReading,
  extractSelectionContent,
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

  it("skips header and role=navigation regions when using body fallback", () => {
    const doc = dom(`
      <body>
        <header role="banner"><a>Home</a> <a>Sign in</a></header>
        <p>Article body text here.</p>
      </body>
    `);
    const text = extractPageText(doc);
    expect(text).toContain("Article body text");
    expect(text).not.toContain("Sign in");
    expect(text).not.toContain("Home");
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

describe("extractPageContent", () => {
  it("returns structured content with metadata and headings", () => {
    const doc = dom(`
      <html lang="en">
        <head>
          <title>Sample Article</title>
          <meta name="description" content="An example article." />
        </head>
        <body>
          <nav>Skip navigation</nav>
          <main>
            <h1>Main headline</h1>
            <p>Article body with a <a href="/details">details link</a>.</p>
            <ul><li>First item</li><li>Second item</li></ul>
          </main>
        </body>
      </html>
    `);

    const content = extractPageContent(doc);
    expect(content.status).toBe("ok");
    expect(content.title).toBe("Sample Article");
    expect(content.url).toBe("https://example.com/");
    expect(content.text).toContain("Main headline");
    expect(content.text).toContain("details link");
    expect(content.text).toContain("First item");
    expect(content.text).not.toContain("Skip navigation");
    expect(content.metadata.description).toBe("An example article.");
    expect(content.metadata.lang).toBe("en");
    expect(content.structure.headings).toEqual([
      { level: 1, text: "Main headline" },
    ]);
    expect(content.structure.links).toEqual([
      { text: "details link", href: "/details" },
    ]);
  });

  it("reports empty pages with a clear message", () => {
    const doc = dom(`
      <body>
        <main><button>Subscribe</button></main>
      </body>
    `);

    const content = extractPageContent(doc);
    expect(content.status).toBe("empty");
    expect(content.text).toBe("");
    expect(content.message).toContain("No readable content");
  });
});

describe("extractSelectionContent", () => {
  it("returns selected text with selection source", () => {
    const doc = dom(`<body><p>Hello world. Goodbye world.</p></body>`);
    const p = doc.querySelector("p")!;
    const range = doc.createRange();
    range.setStart(p.firstChild!, 0);
    range.setEnd(p.firstChild!, 12);
    doc.getSelection()?.removeAllRanges();
    doc.getSelection()?.addRange(range);

    const content = extractSelectionContent(doc);
    expect(content.source).toBe("selection");
    expect(content.status).toBe("ok");
    expect(content.text).toBe("Hello world.");
  });

  it("reports empty selection clearly", () => {
    const doc = dom(`<body><p>Hello</p></body>`);
    const content = extractSelectionContent(doc);
    expect(content.status).toBe("empty");
    expect(content.message).toContain("No text selected");
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
