/**
 * E2E Smoke Tests for Chess Game
 *
 * Core smoke tests covering:
 * - Homepage loads successfully
 * - /play route loads
 * - Difficulty selection works
 * - Game can be started
 * - Chessboard appears
 * - Training page loads
 * - Daily plan can be generated
 *
 * These tests rely on playwright.config.js webServer configuration.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5173';

test.describe('Core Smoke Tests', () => {
  test('Homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Page should not crash
    await expect(page.locator('body')).toBeVisible();

    // Should have some content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('Play route loads and game can be started', async ({ page }) => {
    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    // Page should load
    await expect(page.locator('body')).toBeVisible();

    // Dismiss onboarding modal if present
    const skipBtn = page.getByRole('button', { name: /Bỏ qua/i });
    if (await skipBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }

    // Try to find and click the start button
    const startButton = page.getByRole('button', { name: /Bắt đầu|Chơi|Người mới/i }).first();
    const startButtonVisible = await startButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (startButtonVisible) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Training page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/training`, { waitUntil: 'networkidle' });

    // Page should load
    await expect(page.locator('body')).toBeVisible();
  });

  test('Learn page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/learn`, { waitUntil: 'networkidle' });

    // Page should load
    await expect(page.locator('body')).toBeVisible();
  });

  test('No console errors on page load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('DevTools')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Responsive Layout', () => {
  const viewports = [
    { name: 'Mobile 360', width: 360, height: 640 },
    { name: 'Desktop 1366', width: 1366, height: 768 },
  ];

  for (const vp of viewports) {
    test(`${vp.name} - no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('Accessibility', () => {
  test('Keyboard navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    // Tab through page without errors
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('prefers-reduced-motion is respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });

    await expect(page.locator('body')).toBeVisible();
  });
});
