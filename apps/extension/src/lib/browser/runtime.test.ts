import { describe, it, expect } from "vitest";
import { getExtensionRuntime, hasExtensionRuntime } from "./runtime";

describe("browser runtime shim", () => {
  it("prefers chrome when both chrome and browser are mocked", () => {
    const chromeStorage = {
      get: async () => ({}),
      set: async () => undefined,
    };

    (globalThis as { chrome?: unknown; browser?: unknown }).chrome = {
      storage: { local: chromeStorage },
    };
    (globalThis as { browser?: unknown }).browser = {
      storage: {
        local: {
          get: async () => ({ from: "browser" }),
          set: async () => undefined,
        },
      },
    };

    expect(hasExtensionRuntime()).toBe(true);
    expect(getExtensionRuntime()?.storage?.local).toBe(chromeStorage);

    delete (globalThis as { chrome?: unknown }).chrome;
    delete (globalThis as { browser?: unknown }).browser;
  });

  it("falls back to browser when chrome is absent", () => {
    const browserStorage = {
      get: async () => ({}),
      set: async () => undefined,
    };

    (globalThis as { browser?: unknown }).browser = {
      storage: { local: browserStorage },
    };

    expect(getExtensionRuntime()?.storage?.local).toBe(browserStorage);

    delete (globalThis as { browser?: unknown }).browser;
  });
});
