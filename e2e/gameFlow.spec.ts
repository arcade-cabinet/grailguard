import { expect, test } from '@playwright/test';

/**
 * Wait for the loading overlay (3D asset progress) to fully disappear.
 * The overlay stays visible after bootstrapping while drei useProgress
 * tracks GLB loading. Must be called before interacting with game buttons.
 */
async function waitForGameReady(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-testid="loading-overlay"]', {
    state: 'detached',
    timeout: 60000,
  });
}

/**
 * Dismiss the tutorial overlay if it appears. Waits for the overlay to
 * fully detach from the DOM before returning, ensuring no z-index:9999
 * element blocks subsequent interactions.
 */
async function dismissTutorialIfVisible(page: import('@playwright/test').Page) {
  const skipBtn = page.getByRole('button', { name: /skip tutorial/i });
  const isVisible = await skipBtn.isVisible({ timeout: 8000 }).catch(() => false);
  if (isVisible) {
    await skipBtn.click({ force: true });
    // Wait for the tutorial overlay (role="alert") to fully detach from DOM
    await page.waitForSelector('[role="alert"]', { state: 'detached', timeout: 10000 });
  }
}

/**
 * Click the "Start Run" button reliably across all viewports.
 * On mobile the button may be outside the viewport even after scrolling
 * (the embark modal overflows on small screens). We use a JS-dispatched
 * click which bypasses Playwright's viewport requirement.
 */
async function clickStartRun(page: import('@playwright/test').Page) {
  const startBtn = page.getByRole('button', { name: /start run/i });
  await expect(startBtn).toBeVisible({ timeout: 5000 });
  // Scroll into view, then dispatch a JS click (bypasses viewport check)
  await startBtn.scrollIntoViewIfNeeded();
  await startBtn.evaluate((el: HTMLElement) => el.click());
}

test.describe('Game Flow', () => {
  test('app loads and shows main menu', async ({ page }) => {
    await page.goto('/grailguard/');
    await expect(page.getByText('Grailguard')).toBeVisible();
    await expect(page.getByRole('button', { name: /embark/i })).toBeVisible();
  });

  test('main menu has all navigation buttons', async ({ page }) => {
    await page.goto('/grailguard/');
    await expect(page.getByRole('button', { name: /royal market/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /codex/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /doctrine/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /history/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
  });

  test('embark modal opens with biome selection', async ({ page }) => {
    await page.goto('/grailguard/');
    await page.getByRole('button', { name: /embark/i }).click();
    await expect(page.getByRole('button', { name: /king's road/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /frost peaks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start run/i })).toBeVisible();
  });

  test('starting a run navigates to game screen', async ({ page }) => {
    await page.goto('/grailguard/');
    await page.getByRole('button', { name: /embark/i }).click();
    await clickStartRun(page);
    await page.waitForURL(/\/game/);
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 30000,
    });
  });

  test('game screen shows HUD elements', async ({ page }) => {
    await page.goto(
      '/grailguard/game?mode=fresh&biome=kings-road&challenge=pilgrim&spells=smite&mapSize=100',
    );
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 30000,
    });
  });

  test('calling a wave starts battle phase and game stays responsive', async ({ page }) => {
    await page.goto(
      '/grailguard/game?mode=fresh&biome=kings-road&challenge=pilgrim&spells=smite&mapSize=100',
    );
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 30000,
    });
    // Wait for 3D assets to finish loading (loading overlay blocks clicks)
    await waitForGameReady(page);
    await dismissTutorialIfVisible(page);
    // Verify Call Wave button works
    const callWaveBtn = page.getByRole('button', { name: /call wave/i });
    await expect(callWaveBtn).toBeEnabled({ timeout: 5000 });
    await callWaveBtn.click();
    // Battle phase starts — wave system is functional
    await expect(page.getByRole('heading', { name: /battle phase/i })).toBeVisible({
      timeout: 15000,
    });
    // Verify game stays responsive during battle (no crash/freeze)
    await page.waitForTimeout(3000);
    await expect(page.getByRole('heading', { name: /battle phase/i })).toBeVisible();
  });

  test('leaving game returns to main menu', async ({ page }) => {
    await page.goto(
      '/grailguard/game?mode=fresh&biome=kings-road&challenge=pilgrim&spells=smite&mapSize=100',
    );
    // Wait for build phase heading (confirms game engine is fully loaded)
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 30000,
    });
    // Wait for 3D assets to finish loading (loading overlay blocks clicks)
    await waitForGameReady(page);
    await dismissTutorialIfVisible(page);
    // Click Leave to exit the game — verify it's actionable
    const leaveBtn = page.getByRole('button', { name: /leave/i });
    await expect(leaveBtn).toBeEnabled({ timeout: 5000 });
    await leaveBtn.click();
    // Verify we return to the main menu
    await page.waitForURL(/\/grailguard\/?$/);
    await expect(page.getByText('Grailguard')).toBeVisible();
  });
});
