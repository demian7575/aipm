import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @ai-pm-mindmap/backend dev',
      port: 3333,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @ai-pm-mindmap/frontend dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
