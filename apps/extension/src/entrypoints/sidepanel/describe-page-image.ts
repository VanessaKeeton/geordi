import { isUsable } from "../../lib/ai/availability";
import { createProviderRegistry } from "../../lib/ai/create-registry";
import type { GeordiMessage } from "../../lib/messages";
import type { PageImageCandidate } from "../../lib/content/page-images";

export interface DescribePageImageOptions {
  candidateId: string;
  requestFromActiveTab: (message: GeordiMessage) => Promise<GeordiMessage>;
  onStatus: (message: string) => void;
}

export interface DescribePageImageResult {
  description: string;
  providerId: string;
  label: string;
}

/** Short status line for the images section header. */
export async function getImageDescriptionAvailabilityMessage(): Promise<string> {
  const registry = createProviderRegistry();
  const availability = await registry.bestAvailability("imageDescription");

  if (!availability) {
    return "Image descriptions are not available in this browser.";
  }

  switch (availability.state) {
    case "available":
      return "On-device image descriptions are ready.";
    case "downloadable":
      return (
        availability.message ??
        "A one-time on-device model download may be required."
      );
    case "downloading":
      return availability.message ?? "The on-device model is downloading.";
    case "unsupported":
      return (
        availability.message ??
        "Rich image descriptions are not available in this browser yet."
      );
    default:
      return availability.message ?? "Image description is not ready.";
  }
}

export async function canDescribeImages(): Promise<boolean> {
  const registry = createProviderRegistry();
  const availability = await registry.bestAvailability("imageDescription");
  if (!availability) return false;
  return (
    isUsable(availability.state) || availability.state === "downloadable"
  );
}

/** Load discovered images from the active tab. */
export async function discoverImagesOnActivePage(
  requestFromActiveTab: (message: GeordiMessage) => Promise<GeordiMessage>,
): Promise<PageImageCandidate[]> {
  const response = await requestFromActiveTab({ type: "GET_PAGE_IMAGES" });

  if (response.type === "ERROR") {
    throw new Error(response.message);
  }
  if (response.type !== "PAGE_IMAGES") {
    throw new Error("Unexpected response from content script");
  }

  if (response.discovery.status === "failed") {
    throw new Error(
      response.discovery.message ?? "Could not discover images on this page.",
    );
  }

  return response.discovery.images;
}

/** Describe an image in the active tab (capture + on-device AI run in content script). */
export async function describeActivePageImage(
  options: DescribePageImageOptions,
): Promise<DescribePageImageResult> {
  options.onStatus("Preparing image…");

  const response = await options.requestFromActiveTab({
    type: "DESCRIBE_PAGE_IMAGE",
    candidateId: options.candidateId,
  });

  if (response.type === "ERROR") {
    throw new Error(response.message);
  }
  if (response.type !== "IMAGE_DESCRIPTION_RESULT") {
    throw new Error("Unexpected response from content script");
  }

  options.onStatus("Describing image…");

  return {
    description: response.description,
    label: response.label,
    providerId: response.providerId,
  };
}
