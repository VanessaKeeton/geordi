import { isPageImageUrl } from "./image-origin";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read image bytes."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image bytes."));
    reader.readAsDataURL(blob);
  });
}

/** Fetch bytes for a page-discovered image URL (extension background; bypasses page CSP). */
async function fetchSameOriginImageInBackground(
  imageUrl: string,
  _pageUrl: string,
): Promise<string> {
  if (!isPageImageUrl(imageUrl)) {
    throw new Error("This image URL cannot be fetched.");
  }

  if (imageUrl.startsWith("data:")) return imageUrl;

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not read image (${response.status}).`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error("Image file was empty.");
  }

  return blobToDataUrl(blob);
}

export { fetchSameOriginImageInBackground };
