import { expect, test } from '@playwright/test';

test.describe('Meta Screens', () => {
  test('navigate to codex screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });

    await page.getByText('Codex').click();
    await expect(page.getByText('Court Archives')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Codex', { exact: true })).toBeVisible();
  });

  test('navigate to doctrine screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });

    await page.getByText('Doctrine').click();
    await expect(page.getByText('Permanent Blessings')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Doctrine Tree')).toBeVisible();
  });

  test('navigate to settings screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });

    await page.getByText('Settings').click();
    await expect(page.getByText('Sanctum Preferences')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Settings', { exact: true })).toBeVisible();
  });

  test('settings persist across page reload', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });

    // Navigate to settings
    await page.getByText('Settings').click();
    await expect(page.getByText('Sanctum Preferences')).toBeVisible({ timeout: 5_000 });

    // Toggle a setting (Sound is "On" by default, toggle it off)
    const soundToggle = page.getByText('On').first();
    await soundToggle.click();

    // Wait for the toggle to take effect
    await page.waitForTimeout(500);

    // Return to main menu
    await page.getByText('Return to Court').click();
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 5_000 });

    // Reload the page
    await page.reload();
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });

    // Navigate back to settings
    await page.getByText('Settings').click();
    await expect(page.getByText('Sanctum Preferences')).toBeVisible({ timeout: 5_000 });

    // Verify that at least one toggle shows "Off" (the one we toggled)
    await expect(page.getByText('Off')).toBeVisible();
  });
});
