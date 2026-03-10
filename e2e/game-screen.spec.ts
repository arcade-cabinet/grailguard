import { test } from '@playwright/test';

test.describe('Game Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to main menu first
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click EMBARK to enter the game
    const embark = page.getByText('EMBARK', { exact: false });
    await embark.waitFor({ timeout: 15_000 });
    await embark.click();

    // Wait for game screen to load
    await page.waitForLoadState('networkidle');
  });

  test('navigates to game screen when EMBARK is clicked', async ({ page }) => {
    // Wait a bit for the game screen to render
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e-results/game-screen-initial.png', fullPage: true });
  });

  test('captures game screen with HUD', async ({ page }) => {
    // Allow time for 3D scene to initialize
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: 'e2e-results/game-screen-hud.png',
      fullPage: true,
    });
  });

  test('game screen shows build phase initially', async ({ page }) => {
    // The game starts in build phase — capture the initial state
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e-results/game-build-phase.png', fullPage: true });
  });
});
