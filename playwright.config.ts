import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

/** GPU-accelerated WebGL/WebGPU flags for headless Chrome */
const GPU_ARGS = [
  '--no-sandbox',
  '--use-angle=gl',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  timeout: 60_000,

  reporter: [['list'], ['html', { open: isCI ? 'never' : 'on-failure' }]],

  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
    },
  },

  use: {
    baseURL: 'http://localhost:4173/grailguard',
    trace: isCI ? 'on-first-retry' : 'on',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'gameplay-desktop',
      testMatch: '**/*.spec.ts',
      testIgnore: '**/components/**',
      use: {
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: GPU_ARGS,
        },
      },
    },
    {
      name: 'ui-mobile',
      testMatch: '**/*.spec.ts',
      testIgnore: '**/components/**',
      use: {
        ...devices['iPhone 14'],
        headless: true,
        launchOptions: { args: GPU_ARGS },
      },
    },
  ],

  webServer: {
    command: 'pnpm preview',
    port: 4173,
    reuseExistingServer: !isCI,
    timeout: 30_000,
  },
});
