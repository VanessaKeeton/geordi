import { createProviderRegistry } from "../ai/create-registry";
import {
  ensureImageElementReady,
  findPageImageElement,
  formatPageImageLabel,
  prepareImageDescriptionInput,
  resolvePageImageCandidate,
} from "./page-images";

export interface DescribePageImageInTabResult {
  description: string;
  label: string;
  providerId: string;
}

/** Describe a discovered page image from the content script (live DOM + local AI). */
export async function describePageImageInTab(
  doc: Document,
  candidateId: string,
): Promise<DescribePageImageInTabResult> {
  const candidate = resolvePageImageCandidate(doc, candidateId);
  if (!candidate) {
    throw new Error("Selected image was not found on this page.");
  }

  const element = findPageImageElement(doc, candidateId);
  if (element) {
    await ensureImageElementReady(element);
  }

  const input = await prepareImageDescriptionInput(doc, candidate, element);
  const registry = createProviderRegistry();
  const provider = await registry.getImageDescriptionProvider();
  if (!provider) {
    throw new Error("No image description provider is available.");
  }

  const result = await provider.describeImage(input);
  if (!result.ok) {
    throw new Error(result.message);
  }

  return {
    description: result.value,
    label: formatPageImageLabel(candidate),
    providerId: provider.id,
  };
}
