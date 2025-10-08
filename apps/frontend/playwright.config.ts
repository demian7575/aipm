import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  timeout: 120_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command: 'pnpm --filter @ai-pm/backend dev',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      cwd: '../../'
    },
    {
      command: 'pnpm --filter @ai-pm/frontend dev -- --host',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      cwd: '../../'
    }
  ]
});
