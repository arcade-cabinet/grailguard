import { test, expect } from '@playwright/test';

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
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({ timeout: 15000 });
  });

  test('game screen shows HUD elements', async ({ page }) => {
    await page.goto('/grailguard/game?mode=fresh&biome=kings-road&challenge=pilgrim&spells=smite&mapSize=100');
    await expect(page.getByRole('heading', { name: /build phase/i })).toBeVisible({ timeout: 15000 });
  });
});
