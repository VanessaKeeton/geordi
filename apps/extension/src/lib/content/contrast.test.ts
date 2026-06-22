import { describe, it, expect } from "vitest";
import {
  blendOver,
  contrastRatio,
  pickHighlightColor,
  readableTextColor,
  resolveHighlightTextColor,
  rgbToCss,
} from "./contrast";

describe("contrastRatio", () => {
  it("returns 21:1 for black on white", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 0);
  });

  it("returns 1:1 for identical colors", () => {
    expect(contrastRatio([128, 128, 128], [128, 128, 128])).toBeCloseTo(1, 1);
  });
});

describe("pickHighlightColor", () => {
  it("picks a readable highlight for dark text on light background", () => {
    const color = pickHighlightColor([26, 26, 26], [255, 255, 255]);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrastRatio([26, 26, 26], hexToRgb(color))).toBeGreaterThanOrEqual(4.5);
  });

  it("picks a readable highlight for light text on dark background", () => {
    const color = pickHighlightColor([240, 240, 240], [26, 26, 26]);
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrastRatio([240, 240, 240], hexToRgb(color))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("blendOver", () => {
  it("returns the foreground when fully opaque", () => {
    expect(blendOver([255, 140, 0], [18, 18, 18], 1)).toEqual([255, 140, 0]);
  });

  it("returns the background when fully transparent", () => {
    expect(blendOver([255, 140, 0], [18, 18, 18], 0)).toEqual([18, 18, 18]);
  });

  it("composites a light fill over a dark page to a still-light color", () => {
    const result = blendOver([255, 238, 153], [18, 18, 18], 0.92);
    expect(result).toEqual([236, 220, 142]);
  });
});

describe("readableTextColor", () => {
  it("chooses black on a light background", () => {
    expect(readableTextColor([255, 238, 153])).toEqual([0, 0, 0]);
  });

  it("chooses white on a dark background", () => {
    expect(readableTextColor([18, 18, 18])).toEqual([255, 255, 255]);
  });
});

describe("resolveHighlightTextColor", () => {
  it("keeps page text when it already passes AA against the highlight", () => {
    // Dark page text on a light yellow highlight already reads well.
    const fg = resolveHighlightTextColor([17, 17, 17], [236, 220, 142]);
    expect(fg).toEqual([17, 17, 17]);
  });

  it("overrides light page text that fails against a light highlight", () => {
    // Light page text on a light yellow highlight would be unreadable.
    const fg = resolveHighlightTextColor([240, 240, 240], [236, 220, 142]);
    expect(fg).toEqual([0, 0, 0]);
    expect(contrastRatio(fg, [236, 220, 142])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("rgbToCss", () => {
  it("serializes an RGB tuple", () => {
    expect(rgbToCss([0, 0, 0])).toBe("rgb(0, 0, 0)");
    expect(rgbToCss([255, 140, 0])).toBe("rgb(255, 140, 0)");
  });
});

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}
