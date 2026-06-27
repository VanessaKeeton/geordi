import type {
  ImageDescriptionInput,
  ImageDescriptionInputValidation,
} from "./types";

/** Validate provider input before calling a local image description model. */
export function validateImageDescriptionInput(
  input: ImageDescriptionInput | undefined | null,
): ImageDescriptionInputValidation {
  if (!input) {
    return {
      ok: false,
      reason: "missing_input",
      message: "No image was provided for description.",
    };
  }

  const hasImageBytes = Boolean(input.imageDataUrl?.trim());

  if (!hasImageBytes && !input.src?.trim()) {
    return {
      ok: false,
      reason: "unsuitable_image",
      message: "This image has no usable source or captured image data.",
    };
  }

  if (!hasImageBytes) {
    return {
      ok: false,
      reason: "inaccessible_image_data",
      message:
        "Image pixels could not be read locally. Cross-origin images stay private and are not fetched over the network.",
    };
  }

  return { ok: true };
}

export function buildImageDescriptionPrompt(
  input: ImageDescriptionInput,
): string {
  const lines = [
    "Describe this web page image for a blind or low-vision user.",
    "Use clear, plain English with enough detail to understand charts, diagrams, screenshots, artwork, and photos.",
    "For charts and diagrams, explain labels, trends, and relationships.",
    "For UI screenshots, describe layout, controls, and visible text.",
    "Do not begin with phrases like \"This image shows\" or \"The image depicts\".",
  ];

  if (input.alt) lines.push(`Existing alt text: ${input.alt}`);

  const hasStructuredContext = Boolean(
    input.caption?.trim() ||
      input.nearbyHeading?.trim() ||
      input.surroundingText?.trim(),
  );

  if (hasStructuredContext) {
    if (input.caption) lines.push(`Caption: ${input.caption}`);
    if (input.nearbyHeading) lines.push(`Nearby heading: ${input.nearbyHeading}`);
    if (input.surroundingText) {
      lines.push(`Surrounding text: ${input.surroundingText}`);
    }
  } else if (input.context) {
    lines.push(input.context);
  }

  return lines.join("\n");
}

/** Convert a data URL into a Blob without network access. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64 = ""] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}
