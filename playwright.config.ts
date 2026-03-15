import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm preview',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
