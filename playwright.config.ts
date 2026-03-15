import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

/**
 * GPU-accelerated WebGL flags for headed Chrome.
 * CI runs headed under xvfb-run, which provides a virtual X11 display
 * and activates the real GPU rendering pipeline (vs SwiftShader in headless).
 */
const GPU_ARGS = [
  '--no-sandbox',
  '--use-angle=default',
  '--enable-features=WebGL,WebGL2',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-gl=angle',
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
        headless: false,
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
        browserName: 'chromium',
        headless: false,
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
