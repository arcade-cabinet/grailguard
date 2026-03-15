import { expect, test } from '@playwright/test';

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
    await expect(page.getByRole('button', { name: /dark forest/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start run/i })).toBeVisible();
  });

  test('starting a run navigates to game screen', async ({ page }) => {
    await page.goto('/grailguard/');
    await page.getByRole('button', { name: /embark/i }).click();
    await page.getByRole('button', { name: /start run/i }).click();
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
    // Click Start Run
    await page.getByRole('button', { name: /start run/i }).click();
    await page.waitForURL(/\/game/);
    // Dismiss tutorial overlay (blocks all other interactions)
    await page.getByRole('button', { name: /skip tutorial/i }).click({ timeout: 15000 });
    // Wait for tutorial overlay to disappear
    await expect(page.getByRole('alert')).toBeHidden({ timeout: 5000 });
    // Wait for build phase
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 15000,
    });
    // Click Call Wave
    await page.getByRole('button', { name: /call wave/i }).click();
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
    // Dismiss tutorial overlay (blocks all other interactions)
    await page.getByRole('button', { name: /skip tutorial/i }).click({ timeout: 15000 });
    // Wait for tutorial overlay to disappear
    await expect(page.getByRole('alert')).toBeHidden({ timeout: 5000 });
    // Verify we are in the game (build phase heading visible)
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({
      timeout: 15000,
    });
    // Click Leave to exit the game and return to main menu
    await page.getByRole('button', { name: /leave/i }).click();
    // Verify we return to the main menu
    await page.waitForURL(/\/grailguard\/?$/);
    await expect(page.getByText('Grailguard')).toBeVisible();
  });
});
