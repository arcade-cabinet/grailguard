// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html'], ['github']] : 'html',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:8085',
    trace: 'on-first-retry',
    screenshot: 'on',
    headless: !!process.env.CI,
    launchOptions: {
      args: ['--enable-webgl', '--use-gl=angle', '--ignore-gpu-blocklist'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'e2e-results/',
  webServer: {
    command: 'pnpm exec expo start --web --port 8085 -c',
    url: 'http://localhost:8085',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
