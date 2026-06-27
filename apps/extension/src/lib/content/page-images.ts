/** Discover meaningful page images and extract context for image description (#27). */

import { isBoilerplateElement } from "./extract";
import {
  ancestorElements,
  isHiddenElement,
  queryAllDeep,
} from "./deep-dom";
import type { ImageDescriptionInput, ImageDimensions } from "../ai/types";

export const PAGE_IMAGE_MIN_DIMENSION_PX = 32;
export const PAGE_IMAGE_MAX_COUNT = 50;

export type PageImageSkipReason =
  | "decorative"
  | "hidden"
  | "too_small"
  | "tracking_pixel"
  | "boilerplate"
  | "no_source";

export type PageImageCandidateStatus = "discovered" | "skipped";

export interface PageImageCandidate {
  /** Stable id within a discovery pass (e.g. `img-0`). */
  id: string;
  status: PageImageCandidateStatus;
  skipReason?: PageImageSkipReason;
  alt?: string;
  src?: string;
  resolvedSrc?: string;
  role?: string;
  dimensions?: ImageDimensions;
  caption?: string;
  nearbyHeading?: string;
  surroundingText?: string;
}

export type PageImageDiscoveryStatus = "ok" | "empty" | "failed";

export interface PageImageDiscoveryResult {
  url: string;
  status: PageImageDiscoveryStatus;
  /** Images suitable for rich description. */
  images: PageImageCandidate[];
  /** Filtered-out images with skip reasons (for debugging / UX). */
  skipped: PageImageCandidate[];
  message?: string;
}

function resolveImageSrc(img: HTMLImageElement, doc: Document): string | undefined {
  const raw = img.currentSrc || img.src || img.getAttribute("src") || undefined;
  if (!raw?.trim()) return undefined;

  try {
    return new URL(raw, doc.location?.href ?? undefined).href;
  } catch {
    return raw;
  }
}

function readDimensions(img: HTMLImageElement): ImageDimensions | undefined {
  const rect = img.getBoundingClientRect();
  const displayWidth = Math.round(rect.width);
  const displayHeight = Math.round(rect.height);
  const naturalWidth = img.naturalWidth || undefined;
  const naturalHeight = img.naturalHeight || undefined;

  if (displayWidth <= 0 && displayHeight <= 0 && !naturalWidth && !naturalHeight) {
    return undefined;
  }

  return {
    displayWidth,
    displayHeight,
    naturalWidth,
    naturalHeight,
  };
}

function isTrackingPixel(dimensions: ImageDimensions | undefined): boolean {
  if (!dimensions) return false;
  const width = dimensions.naturalWidth ?? dimensions.displayWidth;
  const height = dimensions.naturalHeight ?? dimensions.displayHeight;
  return width <= 1 && height <= 1;
}

function isTooSmall(dimensions: ImageDimensions | undefined): boolean {
  if (!dimensions) return true;
  const width = Math.max(dimensions.displayWidth, dimensions.naturalWidth ?? 0);
  const height = Math.max(
    dimensions.displayHeight,
    dimensions.naturalHeight ?? 0,
  );
  return width < PAGE_IMAGE_MIN_DIMENSION_PX || height < PAGE_IMAGE_MIN_DIMENSION_PX;
}

function isDecorativeImage(img: HTMLImageElement): boolean {
  const role = img.getAttribute("role")?.toLowerCase();
  if (role === "presentation" || role === "none") return true;
  if (img.getAttribute("aria-hidden") === "true") return true;
  if (img.hasAttribute("alt") && img.getAttribute("alt") === "") return true;
  return false;
}

function isInBoilerplate(img: HTMLImageElement): boolean {
  return ancestorElements(img).some(isBoilerplateElement);
}

function findCaption(img: HTMLImageElement): string | undefined {
  const figure = img.closest("figure");
  const caption = figure?.querySelector("figcaption")?.textContent?.trim();
  return caption || undefined;
}

function findNearbyHeading(img: HTMLImageElement): string | undefined {
  const doc = img.ownerDocument;

  for (const ancestor of ancestorElements(img)) {
    const tag = ancestor.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      const text = ancestor.textContent?.trim();
      if (text) return text;
    }
  }

  let current: Element | null = img;
  while (current) {
    let sibling: Element | null = current.previousElementSibling;
    while (sibling) {
      const heading = sibling.matches("h1,h2,h3,h4,h5,h6")
        ? sibling
        : sibling.querySelector("h1,h2,h3,h4,h5,h6");
      const text = heading?.textContent?.trim();
      if (text) return text;
      sibling = sibling.previousElementSibling;
    }
    current = current.parentElement;
  }

  const title = doc.title?.trim();
  return title || undefined;
}

function findSurroundingText(img: HTMLImageElement): string | undefined {
  const paragraph = img.closest("p, li, td, th, blockquote, figcaption");
  if (paragraph) {
    const clone = paragraph.cloneNode(true) as Element;
    for (const nestedImg of clone.querySelectorAll("img")) {
      nestedImg.remove();
    }
    const text = clone.textContent?.replace(/\s+/g, " ").trim();
    if (text) return text;
  }

  const parent = img.parentElement;
  const text = parent?.textContent?.replace(/\s+/g, " ").trim();
  if (text && text.length <= 500) return text;
  if (text) return `${text.slice(0, 497)}…`;
  return undefined;
}

function classifyImage(
  img: HTMLImageElement,
  doc: Document,
  index: number,
): PageImageCandidate {
  const id = `img-${index}`;
  const base: PageImageCandidate = {
    id,
    status: "discovered",
    alt: img.getAttribute("alt")?.trim() || undefined,
    src: img.getAttribute("src")?.trim() || undefined,
    resolvedSrc: resolveImageSrc(img, doc),
    role: img.getAttribute("role")?.trim() || undefined,
    dimensions: readDimensions(img),
    caption: findCaption(img),
    nearbyHeading: findNearbyHeading(img),
    surroundingText: findSurroundingText(img),
  };

  const skip = (reason: PageImageSkipReason): PageImageCandidate => ({
    ...base,
    status: "skipped",
    skipReason: reason,
  });

  if (isHiddenElement(img)) return skip("hidden");
  if (isInBoilerplate(img)) return skip("boilerplate");
  if (isDecorativeImage(img)) return skip("decorative");
  if (!base.resolvedSrc && !base.src) return skip("no_source");
  if (isTrackingPixel(base.dimensions)) return skip("tracking_pixel");
  if (isTooSmall(base.dimensions)) return skip("too_small");

  return base;
}

/** Scan the page for `<img>` elements and classify them for description. */
export function discoverPageImages(
  doc: Document = document,
): PageImageDiscoveryResult {
  try {
    const url = doc.location?.href ?? "";
    const images: PageImageCandidate[] = [];
    const skipped: PageImageCandidate[] = [];

    const elements = queryAllDeep(doc, "img");
    for (let index = 0; index < elements.length; index++) {
      const element = elements[index];
      if (element.tagName.toLowerCase() !== "img") continue;
      const img = element as HTMLImageElement;

      const candidate = classifyImage(img, doc, index);
      if (candidate.status === "skipped") {
        skipped.push(candidate);
      } else if (images.length < PAGE_IMAGE_MAX_COUNT) {
        images.push(candidate);
      }
    }

    const status: PageImageDiscoveryStatus =
      images.length === 0 ? "empty" : "ok";

    return {
      url,
      status,
      images,
      skipped,
      message:
        status === "empty"
          ? skipped.length > 0
            ? "No meaningful images found on this page."
            : "This page has no images."
          : undefined,
    };
  } catch (error) {
    return {
      url: doc.location?.href ?? "",
      status: "failed",
      images: [],
      skipped: [],
      message:
        error instanceof Error
          ? error.message
          : "Could not discover images on this page.",
    };
  }
}

/** Find a discovered image element by id from a prior discovery pass. */
export function findPageImageElement(
  doc: Document,
  candidateId: string,
): HTMLImageElement | undefined {
  const elements = queryAllDeep(doc, "img");
  const match = /^img-(\d+)$/.exec(candidateId);
  if (!match) return undefined;
  const index = Number(match[1]);
  const el = elements[index];
  return el?.tagName.toLowerCase() === "img"
    ? (el as HTMLImageElement)
    : undefined;
}

/** Capture same-origin / CORS-safe image bytes as a data URL for providers. */
export async function captureImageDataUrl(
  img: HTMLImageElement,
): Promise<string | undefined> {
  if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
    return undefined;
  }

  try {
    const canvas = img.ownerDocument.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

/** Build provider input from a discovered candidate, optionally with image bytes. */
export function toImageDescriptionInput(
  candidate: PageImageCandidate,
  options: {
    pageUrl?: string;
    imageDataUrl?: string;
  } = {},
): ImageDescriptionInput {
  const contextParts = [
    candidate.caption ? `Caption: ${candidate.caption}` : undefined,
    candidate.nearbyHeading ? `Nearby heading: ${candidate.nearbyHeading}` : undefined,
    candidate.surroundingText
      ? `Surrounding text: ${candidate.surroundingText}`
      : undefined,
  ].filter(Boolean);

  return {
    id: candidate.id,
    alt: candidate.alt,
    src: candidate.resolvedSrc ?? candidate.src,
    role: candidate.role,
    dimensions: candidate.dimensions,
    caption: candidate.caption,
    nearbyHeading: candidate.nearbyHeading,
    surroundingText: candidate.surroundingText,
    pageUrl: options.pageUrl,
    imageDataUrl: options.imageDataUrl,
    context: contextParts.length > 0 ? contextParts.join("\n") : undefined,
  };
}

/** Resolve provider input for a candidate, capturing image bytes when possible. */
export async function resolveImageDescriptionInput(
  doc: Document,
  candidate: PageImageCandidate,
): Promise<ImageDescriptionInput> {
  const element = findPageImageElement(doc, candidate.id);
  const imageDataUrl = element
    ? await captureImageDataUrl(element)
    : undefined;

  return toImageDescriptionInput(candidate, {
    pageUrl: doc.location?.href,
    imageDataUrl,
  });
}
