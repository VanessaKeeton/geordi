/** Predictable page content shape for summarization and read-aloud providers. */

export const PAGE_CONTENT_MAX_CHARS = 100_000;
export const PAGE_CONTENT_MAX_HEADINGS = 50;
export const PAGE_CONTENT_MAX_LINKS = 100;

export type PageContentSource = "page" | "selection";

export type PageContentStatus = "ok" | "empty" | "truncated" | "failed";

export interface PageContentMetadata {
  description?: string;
  author?: string;
  publishedAt?: string;
  siteName?: string;
  canonicalUrl?: string;
  lang?: string;
}

export interface PageContentHeading {
  level: number;
  text: string;
}

export interface PageContentLink {
  text: string;
  href: string;
}

export interface PageContentStructure {
  headings: PageContentHeading[];
  links: PageContentLink[];
}

export interface PageContent {
  title: string;
  text: string;
  url: string;
  source: PageContentSource;
  status: PageContentStatus;
  metadata: PageContentMetadata;
  structure: PageContentStructure;
  /** Length of extracted text before guardrails. */
  originalLength?: number;
  /** User-facing explanation when status is not `ok`. */
  message?: string;
}

export interface BuildPageContentInput {
  title: string;
  url: string;
  source: PageContentSource;
  text: string;
  metadata?: PageContentMetadata;
  structure?: PageContentStructure;
}

function metaContent(doc: Document, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const value = doc.querySelector(selector)?.getAttribute("content")?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Read document metadata useful for summaries. */
export function extractPageMetadata(doc: Document = document): PageContentMetadata {
  const description = metaContent(doc, [
    'meta[name="description"]',
    'meta[property="og:description"]',
  ]);
  const author = metaContent(doc, [
    'meta[name="author"]',
    'meta[property="article:author"]',
  ]);
  const publishedAt = metaContent(doc, [
    'meta[property="article:published_time"]',
    'meta[name="article:published_time"]',
    'meta[property="og:article:published_time"]',
  ]);
  const siteName = metaContent(doc, ['meta[property="og:site_name"]']);
  const canonicalUrl =
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href")?.trim() ??
    undefined;
  const lang = doc.documentElement.lang?.trim() || undefined;

  return {
    description,
    author,
    publishedAt,
    siteName,
    canonicalUrl,
    lang,
  };
}

export interface PageContentGuardrailResult {
  text: string;
  status: "ok" | "truncated";
  originalLength: number;
}

/** Cap very long pages at a word boundary for downstream providers. */
export function applyPageContentGuardrails(
  text: string,
  maxChars = PAGE_CONTENT_MAX_CHARS,
): PageContentGuardrailResult {
  const trimmed = text.trim();
  const originalLength = trimmed.length;

  if (originalLength <= maxChars) {
    return { text: trimmed, status: "ok", originalLength };
  }

  let truncated = trimmed.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.8) {
    truncated = truncated.slice(0, lastSpace);
  }

  return {
    text: truncated.trim(),
    status: "truncated",
    originalLength,
  };
}

const EMPTY_MESSAGES: Record<PageContentSource, string> = {
  page: "No readable content found on this page.",
  selection: "No text selected. Highlight text on the page first.",
};

/** Build a serializable PageContent value with guardrails applied. */
export function buildPageContent(input: BuildPageContentInput): PageContent {
  const metadata = input.metadata ?? {};
  const structure = input.structure ?? { headings: [], links: [] };
  const guardrails = applyPageContentGuardrails(input.text);

  if (!guardrails.text) {
    return {
      title: input.title,
      text: "",
      url: input.url,
      source: input.source,
      status: "empty",
      metadata,
      structure,
      originalLength: guardrails.originalLength,
      message: EMPTY_MESSAGES[input.source],
    };
  }

  const status = guardrails.status;
  return {
    title: input.title,
    text: guardrails.text,
    url: input.url,
    source: input.source,
    status,
    metadata,
    structure,
    originalLength: guardrails.originalLength,
    message:
      status === "truncated"
        ? `Page content was shortened to ${PAGE_CONTENT_MAX_CHARS.toLocaleString()} characters for processing.`
        : undefined,
  };
}

export function buildFailedPageContent(
  doc: Document,
  source: PageContentSource,
  error: unknown,
): PageContent {
  const message =
    error instanceof Error ? error.message : "Could not extract page content.";
  return {
    title: doc.title,
    text: "",
    url: doc.location?.href ?? "",
    source,
    status: "failed",
    metadata: {},
    structure: { headings: [], links: [] },
    message,
  };
}

/** Plain-text summary input with optional metadata preamble. */
export function toSummaryInput(content: PageContent): string {
  if (content.status === "empty" || content.status === "failed") {
    return "";
  }

  const preamble: string[] = [];
  if (content.title) preamble.push(`Title: ${content.title}`);
  if (content.metadata.description) {
    preamble.push(`Description: ${content.metadata.description}`);
  }
  if (content.metadata.author) {
    preamble.push(`Author: ${content.metadata.author}`);
  }

  if (preamble.length === 0) return content.text;
  return `${preamble.join("\n")}\n\n${content.text}`;
}

/** Bridge to the slimmer AI navigation context shape. */
export function toPageContext(content: PageContent): {
  title: string;
  text: string;
  url: string;
} {
  return {
    title: content.title,
    text: content.text,
    url: content.url,
  };
}

/** Log extracted content in development for summary-input inspection. */
export function logPageContentForDev(content: PageContent): void {
  if (!import.meta.env?.DEV || import.meta.env?.VITEST) return;

  console.debug("[geordi] PageContent", {
    ...content,
    summaryInput: toSummaryInput(content),
  });
}
