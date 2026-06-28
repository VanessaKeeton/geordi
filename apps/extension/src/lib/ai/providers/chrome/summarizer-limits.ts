/** Languages supported by Chrome's on-device summarizer (Gemini Nano). */
export const CHROME_SUMMARIZER_LANGUAGES = new Set(["en", "es", "ja"]);

/** Languages supported by Chrome Prompt API text output. */
export const CHROME_PROMPT_OUTPUT_LANGUAGES = new Set(["de", "en", "es", "fr", "ja"]);

/** Chrome summarizer context is ~1k tokens (~4k characters). */
export const CHROME_SUMMARIZER_MAX_CHARS = 4_000;

/** Pick a supported output language for Chrome Summarizer availability checks. */
export function resolveChromeOutputLanguage(lang?: string): string {
  if (!lang) return "en";
  const base = lang.split("-")[0]?.toLowerCase();
  if (base && CHROME_SUMMARIZER_LANGUAGES.has(base)) return base;
  return "en";
}

/** Pick a supported output language for Chrome Prompt API sessions. */
export function resolveChromePromptOutputLanguage(lang?: string): string {
  if (!lang) return "en";
  const base = lang.split("-")[0]?.toLowerCase();
  if (base && CHROME_PROMPT_OUTPUT_LANGUAGES.has(base)) return base;
  return "en";
}

/** Trim page text to a size the on-device model can handle. */
export function trimTextForChromeSummarizer(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= CHROME_SUMMARIZER_MAX_CHARS) return trimmed;

  const slice = trimmed.slice(0, CHROME_SUMMARIZER_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > CHROME_SUMMARIZER_MAX_CHARS * 0.8) {
    return slice.slice(0, lastSpace).trim();
  }
  return slice.trim();
}
