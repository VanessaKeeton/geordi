import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["apps/extension/src/lib/content/**", "jsdom"],
    ],
    include: ["apps/extension/src/**/*.test.ts"],
    exclude: ["node_modules", "apps/extension/.output"],
    globals: true,
    testTimeout: 30000,
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
    sequence: {
      concurrent: false,
    },
  },
});
