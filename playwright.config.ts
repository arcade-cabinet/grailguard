import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Grailguard E2E tests.
 * Serves the pre-built Expo web bundle from dist/ and runs Chromium-only.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  outputDir: 'e2e-results',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npx serve dist -l 4173 -s',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
