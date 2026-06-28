import { describe, it, expect } from "vitest";
import {
  isPageImageUrl,
  isSameOriginImageResource,
} from "./image-origin";

describe("isSameOriginImageResource", () => {
  it("matches exact origins", () => {
    expect(
      isSameOriginImageResource(
        "https://example.com/chart.png",
        "https://example.com/page",
      ),
    ).toBe(true);
  });

  it("rejects sibling CDN hosts", () => {
    expect(
      isSameOriginImageResource(
        "https://cdn.example.com/chart.png",
        "https://www.example.com/page",
      ),
    ).toBe(false);
  });
});

describe("isPageImageUrl", () => {
  it("accepts http(s), data, and blob URLs", () => {
    expect(isPageImageUrl("https://cdn.example.com/photo.jpg")).toBe(true);
    expect(isPageImageUrl("http://images.example.net/a.png")).toBe(true);
    expect(isPageImageUrl("data:image/png;base64,abc")).toBe(true);
    expect(isPageImageUrl("blob:https://example.com/uuid")).toBe(true);
  });

  it("rejects non-fetchable schemes", () => {
    expect(isPageImageUrl("javascript:alert(1)")).toBe(false);
    expect(isPageImageUrl("")).toBe(false);
    expect(isPageImageUrl("not-a-url")).toBe(false);
  });
});
