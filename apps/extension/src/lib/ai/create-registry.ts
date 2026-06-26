import type { BrowserId } from "../browser/detect";
import { detectBrowser } from "../browser/detect";
import { ByokSummarizationProvider } from "./providers/byok";
import { ChromeImageDescriptionProvider } from "./providers/chrome/image-description";
import { ChromeSummarizationProvider } from "./providers/chrome/summarization";
import {
  UnsupportedImageDescriptionProvider,
  UnsupportedSummarizationProvider,
} from "./providers/unsupported";
import { ProviderRegistry } from "./registry";
import { WebSpeechReadAloudProvider } from "../speech/read-aloud-provider";

export interface CreateProviderRegistryOptions {
  /** Override browser detection (useful in tests). */
  browser?: BrowserId;
}

/**
 * Builds the default provider registry for the current browser.
 * Chrome-specific modules are only registered on Chrome; other browsers get
 * explicit unsupported fallbacks so feature code stays browser-agnostic.
 */
export function createProviderRegistry(
  options: CreateProviderRegistryOptions = {},
): ProviderRegistry {
  const browser = options.browser ?? detectBrowser();
  const registry = new ProviderRegistry();

  registry.registerReadAloud(new WebSpeechReadAloudProvider());

  if (browser === "chrome" || browser === "edge") {
    registry
      .registerSummarization(new ChromeSummarizationProvider())
      .registerSummarization(new ByokSummarizationProvider())
      .registerImageDescription(new ChromeImageDescriptionProvider());
  } else {
    registry
      .registerSummarization(new UnsupportedSummarizationProvider())
      .registerSummarization(new ByokSummarizationProvider())
      .registerImageDescription(new UnsupportedImageDescriptionProvider());
  }

  return registry;
}
