import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
    exclude: ['node_modules', 'screenshots'],
    globals: true,
    reporters: 'default',
    testTimeout: 30000,
    setupFiles: ["./vitest.setup.js"],
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
    sequence: {
      concurrent: false,
    },
  },
});
