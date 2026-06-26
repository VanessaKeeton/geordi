import {
  clearReadingStyles,
  getWrappedSpeakableText,
  highlightAtCharIndex,
  unwrapReadingMarkup,
  wrapForReading,
} from "../../lib/content/wrap-for-reading";
import { renderSummaryDisplay } from "../../lib/content/summary-display";
import type { SummaryStyle } from "../../lib/ai/summarization-options";

/** Wrap summary text for charIndex-aligned highlighting in the side panel. */
export function prepareSummaryForReading(
  container: HTMLElement,
  text: string,
  style: SummaryStyle,
): string {
  renderSummaryDisplay(container, text, style);
  wrapForReading(container, {
    skipFormControls: false,
    skipBoilerplate: false,
  });
  return getWrappedSpeakableText(container);
}

export function highlightSummaryAtChar(
  container: HTMLElement,
  charIndex: number,
  scrollContainer: HTMLElement,
): void {
  highlightAtCharIndex(container, charIndex, {
    scrollMode: "contained",
    scrollContainer,
  });
}

export function clearSummaryHighlight(container: HTMLElement): void {
  clearReadingStyles(container);
}

export function teardownSummaryMarkup(container: HTMLElement): void {
  clearReadingStyles(container);
  unwrapReadingMarkup(container);
}
