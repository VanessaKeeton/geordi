import { describe, it, expect } from "vitest";
import {
  availability,
  isUsable,
  pickBestAvailability,
  unsupported,
} from "./availability";

describe("availability helpers", () => {
  it("pickBestAvailability prefers available over unsupported", () => {
    const best = pickBestAvailability([
      unsupported("a"),
      availability("b", "available"),
      availability("c", "downloadable"),
    ]);
    expect(best?.providerId).toBe("b");
  });

  it("isUsable treats available and downloading as usable", () => {
    expect(isUsable("available")).toBe(true);
    expect(isUsable("downloading")).toBe(true);
    expect(isUsable("unsupported")).toBe(false);
  });
});
