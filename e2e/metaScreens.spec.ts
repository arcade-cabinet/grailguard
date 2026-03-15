import { test, expect } from '@playwright/test';

test.describe('Meta Screens', () => {
  test('codex screen loads', async ({ page }) => {
    await page.goto('/grailguard/codex');
    await expect(page.getByRole('heading', { name: /codex/i })).toBeVisible();
  });

  test('doctrine screen loads', async ({ page }) => {
    await page.goto('/grailguard/doctrine');
    await expect(page.getByRole('heading', { name: /doctrine/i })).toBeVisible();
  });

  test('settings screen loads', async ({ page }) => {
    await page.goto('/grailguard/settings');
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('history screen loads', async ({ page }) => {
    await page.goto('/grailguard/history');
    await expect(page.getByRole('heading', { name: /history/i })).toBeVisible();
  });

  test('navigation back to main menu works', async ({ page }) => {
    await page.goto('/grailguard/');
    await expect(page.getByText('Grailguard')).toBeVisible();
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    await page.getByRole('button', { name: /back|return|court/i }).click();
    await page.waitForURL(/\/grailguard\/?$/);
    await expect(page.getByText('Grailguard')).toBeVisible();
  });
});
