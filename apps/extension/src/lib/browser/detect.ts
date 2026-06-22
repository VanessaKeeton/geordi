/** Known browser targets for provider selection. */
export type BrowserId = "chrome" | "firefox" | "edge" | "safari" | "unknown";

/**
 * Best-effort browser detection for provider wiring.
 * Uses user agent only — does not imply any capability is available.
 */
export function detectBrowser(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): BrowserId {
  if (!userAgent) return "unknown";
  if (/Firefox\//.test(userAgent)) return "firefox";
  if (/Edg\//.test(userAgent)) return "edge";
  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return "chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "safari";
  return "unknown";
}
