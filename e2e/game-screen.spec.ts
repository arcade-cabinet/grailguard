import { expect, test } from '@playwright/test';

test.describe('Game Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to game directly to bypass baseUrl issues on root
    await page.goto('/game');
    // Wait for game screen to load
    await page.waitForLoadState('networkidle');
  });

  test('navigates to game screen when EMBARK is clicked', async ({ page }) => {
    // Wait a bit for the game screen to render
    await page.waitForTimeout(3000);
    await expect(page).toHaveScreenshot('game-screen-initial.png', { maxDiffPixels: 500 });
  });

  test('ai governor plays the game automatically', async ({ page }) => {
    // Wait for the 3D scene and HUD to load
    await page.waitForTimeout(2000);

    // Click the AI Gov toggle button (it's the one with the robot emoji)
    const aiGovBtn = page.getByText('🤖', { exact: false }).first();
    await aiGovBtn.waitFor({ state: 'visible' });
    await aiGovBtn.click();

    // The AI should now build walls and trigger a wave. Un-pause the game speed just in case.
    // Wait 15 seconds to let the AI build and fight
    await page.waitForTimeout(15000);

    // Save proof of work
    await expect(page).toHaveScreenshot('ai-governor-action.png', { maxDiffPixels: 500 });
  });
});
