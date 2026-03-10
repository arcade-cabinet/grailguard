import { expect, test } from '@playwright/test';

test.describe('Main Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the React app to render
    await page.waitForLoadState('networkidle');
  });

  test('renders the title "GRAILGUARD"', async ({ page }) => {
    const title = page.getByText('GRAILGUARD', { exact: false });
    await expect(title).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'e2e-results/main-menu-title.png', fullPage: true });
  });

  test('renders the EMBARK button', async ({ page }) => {
    const embark = page.getByText('EMBARK', { exact: false });
    await expect(embark).toBeVisible({ timeout: 15_000 });
  });

  test('renders the Market button', async ({ page }) => {
    const market = page.getByText('Market', { exact: false });
    await expect(market).toBeVisible({ timeout: 15_000 });
  });

  test('renders coin display', async ({ page }) => {
    const coins = page.getByText('coins', { exact: false });
    await expect(coins).toBeVisible({ timeout: 15_000 });
  });

  test('renders lore text', async ({ page }) => {
    const lore = page.getByText('Sacred Grail', { exact: false });
    await expect(lore).toBeVisible({ timeout: 15_000 });
  });

  test('takes a full-page screenshot of the main menu', async ({ page }) => {
    // Wait for all content to render
    await page.getByText('GRAILGUARD', { exact: false }).waitFor({ timeout: 15_000 });
    await page.screenshot({
      path: 'e2e-results/main-menu-full.png',
      fullPage: true,
    });
  });

  test('Market modal opens when tapping Market', async ({ page }) => {
    const marketBtn = page.getByText('Market', { exact: false });
    await marketBtn.waitFor({ timeout: 15_000 });
    await marketBtn.click();

    // Market modal should appear with "Market" title
    const modalTitle = page.getByText('⚜ Market ⚜', { exact: false });
    await expect(modalTitle).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'e2e-results/market-modal-open.png', fullPage: true });
  });

  test('Market modal shows building unlocks', async ({ page }) => {
    const marketBtn = page.getByText('Market', { exact: false });
    await marketBtn.waitFor({ timeout: 15_000 });
    await marketBtn.click();

    // Should show building names
    await expect(page.getByText('Archery Range', { exact: false })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Cleric Temple', { exact: false })).toBeVisible();
    await expect(page.getByText('Knight Keep', { exact: false })).toBeVisible();
  });

  test('Market modal can be closed', async ({ page }) => {
    const marketBtn = page.getByText('Market', { exact: false });
    await marketBtn.waitFor({ timeout: 15_000 });
    await marketBtn.click();

    const closeBtn = page.getByText('Close', { exact: true });
    await closeBtn.waitFor({ timeout: 10_000 });
    await closeBtn.click();

    // Modal title should disappear
    await expect(page.getByText('⚜ Market ⚜', { exact: false })).not.toBeVisible({
      timeout: 5_000,
    });
  });
});
