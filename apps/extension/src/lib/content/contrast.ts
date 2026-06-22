const LIGHT_TEXT_PALETTE = [
  "#ffe082",
  "#90caf9",
  "#a5d6a7",
  "#f48fb1",
  "#ffcc80",
  "#ce93d8",
] as const;

const DARK_TEXT_PALETTE = [
  "#1565c0",
  "#4527a0",
  "#2e7d32",
  "#6d4c41",
  "#00838f",
  "#ad1457",
] as const;

const MIN_CONTRAST = 4.5;
const TEXT_LUMINANCE_THRESHOLD = 0.5;

function parseColor(color: string): [number, number, number] | null {
  const trimmed = color.trim().toLowerCase();
  if (trimmed === "transparent") return null;

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/,
  );
  if (rgbMatch) {
    return [
      Number(rgbMatch[1]),
      Number(rgbMatch[2]),
      Number(rgbMatch[3]),
    ];
  }

  const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  return null;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** WCAG 2.x contrast ratio between two sRGB colors. */
export function contrastRatio(
  fg: [number, number, number],
  bg: [number, number, number],
): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function isDarkScheme(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Walk ancestors for the first non-transparent background color. */
export function resolveBackgroundColor(el: Element): [number, number, number] {
  let current: Element | null = el;
  while (current) {
    const view = current.ownerDocument.defaultView;
    if (!view) break;
    const bg = view.getComputedStyle(current).backgroundColor;
    const parsed = parseColor(bg);
    if (parsed) return parsed;
    current = current.parentElement;
  }
  return isDarkScheme() ? [26, 26, 26] : [255, 255, 255];
}

/** Resolve text color from an element. */
export function resolveTextColor(el: Element): [number, number, number] {
  const view = el.ownerDocument.defaultView;
  if (!view) return [0, 0, 0];
  const parsed = parseColor(view.getComputedStyle(el).color);
  return parsed ?? [0, 0, 0];
}

/** Pick a highlight fill color with sufficient contrast against text and page bg. */
export function pickHighlightColor(
  textColor: [number, number, number],
  backgroundColor: [number, number, number],
): string {
  const palette =
    relativeLuminance(textColor) > TEXT_LUMINANCE_THRESHOLD
      ? DARK_TEXT_PALETTE
      : LIGHT_TEXT_PALETTE;

  let best = palette[0];
  let bestScore = -1;

  for (const candidate of palette) {
    const fill = parseColor(candidate);
    if (!fill) continue;

    const textOnFill = contrastRatio(textColor, fill);
    const fillVsBg = contrastRatio(fill, backgroundColor);

    if (textOnFill < MIN_CONTRAST) continue;

    const score = textOnFill + fillVsBg * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/** Pick black or white text for the chosen highlight fill. */
export function pickHighlightTextColor(highlightColor: string): string {
  const fill = parseColor(highlightColor);
  if (!fill) return "#000000";

  const darkText: [number, number, number] = [0, 0, 0];
  const lightText: [number, number, number] = [255, 255, 255];

  return contrastRatio(darkText, fill) >= contrastRatio(lightText, fill)
    ? "#000000"
    : "#ffffff";
}
