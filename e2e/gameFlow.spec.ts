import { expect, test } from '@playwright/test';

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
    // Scroll the Start Run button into view (may be off-screen on mobile)
    const startBtn = page.getByRole('button', { name: /start run/i });
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();
    await page.waitForURL(/\/game/);
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('game screen shows HUD elements', async ({ page }) => {
    await page.goto(
      '/grailguard/game?mode=fresh&biome=kings-road&challenge=pilgrim&spells=smite&mapSize=100',
    );
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('player can build and survive a wave', async ({ page }) => {
    await page.goto('/grailguard/');
    // Click Embark
    await page.getByRole('button', { name: /embark/i }).click();
    // Scroll Start Run into view (off-screen on mobile viewports)
    const startBtn = page.getByRole('button', { name: /start run/i });
    await startBtn.scrollIntoViewIfNeeded();
    await startBtn.click();
    await page.waitForURL(/\/game/);
    await dismissTutorialIfVisible(page);
    // Wait for build phase heading (confirms game engine is running)
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 15000,
    });
    // Click Call Wave — verify button is actionable (not behind overlay)
    const callWaveBtn = page.getByRole('button', { name: /call wave/i });
    await expect(callWaveBtn).toBeEnabled({ timeout: 5000 });
    await callWaveBtn.click();
    // Wait for enemies to spawn (battle phase)
    await expect(page.getByRole('heading', { name: /battle phase/i })).toBeVisible({
      timeout: 10000,
    });
    // Wait for wave to complete (back to build phase)
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 60000,
    });
    // Verify wave counter incremented (use exact match to avoid strict mode)
    await expect(page.getByText('2', { exact: true })).toBeVisible();
  });

  test('leaving game returns to main menu', async ({ page }) => {
    await page.goto(
      '/grailguard/game?mode=fresh&biome=kings-road&challenge=pilgrim&spells=smite&mapSize=100',
    );
    await dismissTutorialIfVisible(page);
    // Verify we are in the game (build phase heading visible)
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 15000,
    });
    // Click Leave to exit the game — verify it's actionable
    const leaveBtn = page.getByRole('button', { name: /leave/i });
    await expect(leaveBtn).toBeEnabled({ timeout: 5000 });
    await leaveBtn.click();
    // Verify we return to the main menu
    await page.waitForURL(/\/grailguard\/?$/);
    await expect(page.getByText('Grailguard')).toBeVisible();
  });
});
