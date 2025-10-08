import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary'],
      provider: 'v8'
    },
    globals: true,
    include: ['tests/**/*.test.ts']
  }
});
