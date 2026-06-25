import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import {
  applyPageContentGuardrails,
  buildPageContent,
  extractPageMetadata,
  PAGE_CONTENT_MAX_CHARS,
  toSummaryInput,
} from "./page-content";

function dom(html: string) {
  const { window } = new JSDOM(html, { url: "https://example.com/article" });
  return window.document;
}

describe("extractPageMetadata", () => {
  it("reads description, author, and canonical metadata", () => {
    const doc = dom(`
      <html lang="en">
        <head>
          <meta name="description" content="A short article summary." />
          <meta name="author" content="Ada Lovelace" />
          <link rel="canonical" href="https://example.com/article" />
        </head>
        <body></body>
      </html>
    `);

    expect(extractPageMetadata(doc)).toEqual({
      description: "A short article summary.",
      author: "Ada Lovelace",
      canonicalUrl: "https://example.com/article",
      lang: "en",
    });
  });
});

describe("applyPageContentGuardrails", () => {
  it("truncates very long text at a word boundary", () => {
    const words = Array.from({ length: 20_000 }, () => "word").join(" ");
    const result = applyPageContentGuardrails(words, 100);

    expect(result.status).toBe("truncated");
    expect(result.originalLength).toBe(words.length);
    expect(result.text.length).toBeLessThanOrEqual(100);
    expect(result.text.endsWith("word")).toBe(true);
  });

  it("leaves short text unchanged", () => {
    const result = applyPageContentGuardrails("Hello world.");
    expect(result).toEqual({
      text: "Hello world.",
      status: "ok",
      originalLength: 12,
    });
  });
});

describe("buildPageContent", () => {
  it("marks empty extraction clearly", () => {
    const content = buildPageContent({
      title: "Empty",
      url: "https://example.com",
      source: "page",
      text: "   ",
    });

    expect(content.status).toBe("empty");
    expect(content.text).toBe("");
    expect(content.message).toContain("No readable content");
  });

  it("marks truncated extraction with a user-facing message", () => {
    const content = buildPageContent({
      title: "Long page",
      url: "https://example.com",
      source: "page",
      text: "x".repeat(PAGE_CONTENT_MAX_CHARS + 50),
    });

    expect(content.status).toBe("truncated");
    expect(content.text.length).toBeLessThanOrEqual(PAGE_CONTENT_MAX_CHARS);
    expect(content.message).toContain("shortened");
  });
});

describe("toSummaryInput", () => {
  it("prepends metadata for summarization", () => {
    const input = toSummaryInput({
      title: "Article",
      text: "Body text.",
      url: "https://example.com",
      source: "page",
      status: "ok",
      metadata: { description: "Summary lead." },
      structure: { headings: [], links: [] },
    });

    expect(input).toContain("Title: Article");
    expect(input).toContain("Description: Summary lead.");
    expect(input).toContain("Body text.");
  });

  it("returns empty string for failed extraction", () => {
    expect(
      toSummaryInput({
        title: "Broken",
        text: "",
        url: "https://example.com",
        source: "page",
        status: "failed",
        metadata: {},
        structure: { headings: [], links: [] },
        message: "Could not extract page content.",
      }),
    ).toBe("");
  });
});
