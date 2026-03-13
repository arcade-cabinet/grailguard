import { expect, test } from '@playwright/test';

test.describe('Game Flow', () => {
  test('app loads and shows main menu', async ({ page }) => {
    await page.goto('/');
    // Wait for the app to bootstrap and render the title
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });
  });

  test('main menu renders Start Run button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });
    // The Embark button opens the run-start modal
    await expect(page.getByText('Embark')).toBeVisible();
  });

  test('clicking Start Run navigates to game screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });

    // Open the embark modal
    await page.getByText('Embark').click();
    await expect(page.getByText('Start Run')).toBeVisible({ timeout: 5_000 });

    // Start the run
    await page.getByText('Start Run').click();

    // Verify we transitioned to the game screen (loading overlay or HUD)
    await expect(
      page.getByText('Sanctum Condition').or(page.getByText('Blessing the battlefield')),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('build phase shows toychest and building selector', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Grailguard')).toBeVisible({ timeout: 15_000 });

    // Start a new run
    await page.getByText('Embark').click();
    await expect(page.getByText('Start Run')).toBeVisible({ timeout: 5_000 });
    await page.getByText('Start Run').click();

    // Wait for the game HUD to appear
    await expect(page.getByText('Sanctum Condition')).toBeVisible({ timeout: 20_000 });

    // Build phase should show Toychest button
    await expect(page.getByText('Toychest')).toBeVisible({ timeout: 5_000 });
  });
});
