import { findPageImageElement } from "./page-images";

export const PAGE_IMAGE_HIGHLIGHT_CLASS = "geordi-page-image-highlight";
export const PAGE_IMAGE_HIGHLIGHT_OVERLAY_ID = "geordi-page-image-highlight-overlay";

const OUTLINE = "3px solid #ff8c00";
const OUTLINE_OFFSET = "4px";
const BOX_SHADOW = "0 0 0 6px rgba(255, 140, 0, 0.35)";

interface ActiveHighlight {
  img: HTMLImageElement;
  overlay: HTMLDivElement;
  savedOutline: string;
  savedOutlineOffset: string;
  savedBoxShadow: string;
  syncPosition: () => void;
}

let activeHighlight: ActiveHighlight | null = null;
let scrollListener: ((event: Event) => void) | null = null;
let resizeListener: (() => void) | null = null;

function removeWindowListeners(): void {
  if (scrollListener) {
    window.removeEventListener("scroll", scrollListener, true);
    scrollListener = null;
  }
  if (resizeListener) {
    window.removeEventListener("resize", resizeListener);
    resizeListener = null;
  }
}

function syncOverlayPosition(overlay: HTMLDivElement, img: HTMLImageElement): void {
  const rect = img.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) {
    overlay.hidden = true;
    return;
  }

  overlay.hidden = false;
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

function createOverlay(doc: Document): HTMLDivElement {
  const existing = doc.getElementById(PAGE_IMAGE_HIGHLIGHT_OVERLAY_ID);
  if (existing instanceof HTMLDivElement) {
    return existing;
  }

  const overlay = doc.createElement("div");
  overlay.id = PAGE_IMAGE_HIGHLIGHT_OVERLAY_ID;
  overlay.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
  Object.assign(overlay.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483646",
    border: OUTLINE,
    boxShadow: BOX_SHADOW,
    borderRadius: "4px",
    boxSizing: "border-box",
    margin: "0",
    padding: "0",
  });
  doc.documentElement.append(overlay);
  return overlay;
}

function applyInlineHighlight(img: HTMLImageElement): void {
  img.classList.add(PAGE_IMAGE_HIGHLIGHT_CLASS);
  img.style.setProperty("outline", OUTLINE, "important");
  img.style.setProperty("outline-offset", OUTLINE_OFFSET, "important");
  img.style.setProperty("box-shadow", BOX_SHADOW, "important");
}

function restoreInlineHighlight(
  img: HTMLImageElement,
  savedOutline: string,
  savedOutlineOffset: string,
  savedBoxShadow: string,
): void {
  img.classList.remove(PAGE_IMAGE_HIGHLIGHT_CLASS);
  if (savedOutline) img.style.outline = savedOutline;
  else img.style.removeProperty("outline");
  if (savedOutlineOffset) img.style.outlineOffset = savedOutlineOffset;
  else img.style.removeProperty("outline-offset");
  if (savedBoxShadow) img.style.boxShadow = savedBoxShadow;
  else img.style.removeProperty("box-shadow");
}

/** Remove the on-page outline from the previously highlighted image. */
export function clearPageImageHighlight(): void {
  removeWindowListeners();

  if (activeHighlight) {
    restoreInlineHighlight(
      activeHighlight.img,
      activeHighlight.savedOutline,
      activeHighlight.savedOutlineOffset,
      activeHighlight.savedBoxShadow,
    );
    activeHighlight.overlay.hidden = true;
    activeHighlight = null;
  }
}

/** Outline a discovered page image and optionally scroll it into view. */
export function highlightPageImage(
  doc: Document,
  candidateId: string,
  options: { scrollIntoView?: boolean } = { scrollIntoView: true },
): boolean {
  clearPageImageHighlight(doc);

  const img = findPageImageElement(doc, candidateId);
  if (!img) return false;

  const overlay = createOverlay(doc);
  const savedOutline = img.style.outline;
  const savedOutlineOffset = img.style.outlineOffset;
  const savedBoxShadow = img.style.boxShadow;

  applyInlineHighlight(img);

  const syncPosition = () => syncOverlayPosition(overlay, img);
  syncPosition();

  activeHighlight = {
    img,
    overlay,
    savedOutline,
    savedOutlineOffset,
    savedBoxShadow,
    syncPosition,
  };

  scrollListener = () => activeHighlight?.syncPosition();
  resizeListener = () => activeHighlight?.syncPosition();
  window.addEventListener("scroll", scrollListener, true);
  window.addEventListener("resize", resizeListener);

  if (options.scrollIntoView !== false) {
    img.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }

  return true;
}
