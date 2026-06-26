import type { SummaryStyle } from "../ai/summarization-options";

const INLINE_BULLET_SPLIT = /(?:^|\s+)\*\s+/;
const LINE_BULLET_PREFIX = /^[-*•]\s+/;

/** Split Chrome key-points plain-text into discrete bullet items. */
export function splitSummaryBulletItems(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    const fromLines = lines
      .map((line) => line.replace(LINE_BULLET_PREFIX, "").trim())
      .filter(Boolean);
    if (fromLines.length > 1 || LINE_BULLET_PREFIX.test(lines[0] ?? "")) {
      return fromLines;
    }
  }

  const inlineParts = trimmed
    .split(INLINE_BULLET_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);

  if (inlineParts.length > 1) {
    return inlineParts;
  }

  return [trimmed];
}

export function shouldRenderSummaryList(
  style: SummaryStyle,
  text: string,
): boolean {
  if (style === "paragraph") return false;
  return splitSummaryBulletItems(text).length > 1;
}

/** Render summary text into the side panel container. */
export function renderSummaryDisplay(
  container: HTMLElement,
  text: string,
  style: SummaryStyle,
): void {
  container.replaceChildren();

  if (!shouldRenderSummaryList(style, text)) {
    container.textContent = text.trim();
    return;
  }

  const list = document.createElement("ul");
  list.className = "summary-list";

  for (const item of splitSummaryBulletItems(text)) {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  }

  container.append(list);
}
