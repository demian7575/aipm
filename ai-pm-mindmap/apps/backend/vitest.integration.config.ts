import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.ts'],
    coverage: {
      reporter: ['text'],
    },
    testTimeout: 15000,
  },
});
