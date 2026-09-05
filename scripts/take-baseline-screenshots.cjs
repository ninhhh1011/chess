const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:4176';
const OUT_DIR = path.resolve(__dirname, '../artifacts/ui-option-c/baseline');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function dismissOnboarding(page) {
  const skipBtn = page.getByRole('button', { name: /Bỏ qua/i });
  if ((await skipBtn.count()) > 0) {
    try {
      await skipBtn.first().click();
      await page.waitForTimeout(300);
    } catch {
      // ignore
    }
  }
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // 1. Home
    console.log(`Capturing Home (${vp.name})...`);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, `home-${vp.name}.png`), fullPage: false });

    // 2. Lobby
    console.log(`Capturing Lobby (${vp.name})...`);
    await page.goto(`${BASE_URL}/play`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await dismissOnboarding(page);
    await page.screenshot({ path: path.join(OUT_DIR, `lobby-${vp.name}.png`), fullPage: false });

    // 3. Play
    console.log(`Capturing Play (${vp.name})...`);
    const startBtn = page.getByRole('button', { name: /Bắt đầu ván/i });
    if ((await startBtn.count()) > 0) {
      await startBtn.first().click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: path.join(OUT_DIR, `play-${vp.name}.png`), fullPage: false });

    // 4. Review
    console.log(`Capturing Review (${vp.name})...`);
    // Click resign to trigger game over / review modal
    const resignBtn = page.locator('button[aria-label*="hàng"], button[aria-label*="Resign"], button:has-text("Đầu hàng")').first();
    if ((await resignBtn.count()) > 0 && (await resignBtn.isVisible())) {
      await resignBtn.click();
      await page.waitForTimeout(500);
      const confirmBtn = page.locator('button:has-text("Đồng ý"), button:has-text("Xác nhận"), button:has-text("Có")').first();
      if ((await confirmBtn.count()) > 0 && (await confirmBtn.isVisible())) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(OUT_DIR, `review-${vp.name}.png`), fullPage: false });

    // 5. Training
    console.log(`Capturing Training (${vp.name})...`);
    await page.goto(`${BASE_URL}/training`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, `training-${vp.name}.png`), fullPage: false });

    // 6. Login
    console.log(`Capturing Login (${vp.name})...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, `login-${vp.name}.png`), fullPage: false });

    await context.close();
  }

  await browser.close();
  console.log('Baseline screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
