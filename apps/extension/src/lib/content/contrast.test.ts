import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  pickHighlightColor,
  pickHighlightTextColor,
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

describe("pickHighlightTextColor", () => {
  it("picks dark text for yellow/orange highlight fills", () => {
    expect(pickHighlightTextColor("#ffe082")).toBe("#111111");
    expect(pickHighlightTextColor("#ffcc80")).toBe("#111111");
  });

  it("picks light text for dark highlight fills", () => {
    expect(pickHighlightTextColor("#1565c0")).toBe("#ffffff");
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
