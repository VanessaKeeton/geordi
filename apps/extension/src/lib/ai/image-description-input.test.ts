import { describe, it, expect } from "vitest";
import {
  buildImageDescriptionPrompt,
  dataUrlToBlob,
  inaccessibleImageDataMessage,
  validateImageDescriptionInput,
} from "./image-description-input";

describe("validateImageDescriptionInput", () => {
  it("rejects missing input", () => {
    const result = validateImageDescriptionInput(undefined);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_input");
  });

  it("rejects images without source or bytes", () => {
    const result = validateImageDescriptionInput({ alt: "Chart" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("unsuitable_image");
  });

  it("rejects src-only input when pixels are inaccessible", () => {
    const result = validateImageDescriptionInput({
      src: "https://cdn.example.net/chart.png",
      pageUrl: "https://www.example.com/page",
      alt: "Revenue chart",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("inaccessible_image_data");
    expect(result.message).toContain("could not read");
  });

  it("uses a clearer message when capture fails", () => {
    const message = inaccessibleImageDataMessage({
      src: "https://example.com/chart.png",
      pageUrl: "https://example.com/article",
      alt: "Chart",
    });
    expect(message).toContain("could not read");
  });

  it("accepts a live img element without serialized bytes", () => {
    const result = validateImageDescriptionInput({
      alt: "Chart",
      imageElement: { tagName: "IMG" } as HTMLImageElement,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts locally captured image bytes", () => {
    const result = validateImageDescriptionInput({
      imageDataUrl: "data:image/png;base64,abc",
      alt: "Diagram",
    });
    expect(result.ok).toBe(true);
  });
});

describe("buildImageDescriptionPrompt", () => {
  it("includes page context in the prompt", () => {
    const prompt = buildImageDescriptionPrompt({
      alt: "Sales chart",
      caption: "Q1 results",
      nearbyHeading: "Overview",
    });
    expect(prompt).toContain("Sales chart");
    expect(prompt).toContain("Q1 results");
    expect(prompt).toContain("Overview");
  });

  it("does not duplicate context when structured fields are present", () => {
    const prompt = buildImageDescriptionPrompt({
      alt: "Chart",
      caption: "Q1 results",
      nearbyHeading: "Overview",
      context: "Caption: Q1 results\nNearby heading: Overview",
    });

    expect(prompt.match(/Caption: Q1 results/g)?.length).toBe(1);
    expect(prompt.match(/Nearby heading: Overview/g)?.length).toBe(1);
  });

  it("falls back to combined context when structured fields are absent", () => {
    const prompt = buildImageDescriptionPrompt({
      context: "Caption: Legacy context only",
    });
    expect(prompt).toContain("Caption: Legacy context only");
  });
});

describe("dataUrlToBlob", () => {
  it("decodes a PNG data URL locally", () => {
    const blob = dataUrlToBlob("data:image/png;base64,AQID");
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(3);
  });
});
