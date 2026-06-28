/** URL checks for page image capture. */

export function isSameOriginImageResource(
  imageUrl: string,
  pageUrl: string,
): boolean {
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
    return true;
  }

  try {
    return new URL(imageUrl).origin === new URL(pageUrl).origin;
  } catch {
    return false;
  }
}

/** True when a discovered image URL can be fetched for description (http(s), data, blob). */
export function isPageImageUrl(imageUrl: string): boolean {
  const trimmed = imageUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return true;

  try {
    const protocol = new URL(trimmed).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
