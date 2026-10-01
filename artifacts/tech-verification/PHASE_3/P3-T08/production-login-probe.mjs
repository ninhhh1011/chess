import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.addInitScript(() => localStorage.setItem('chess-app-onboarding', 'true'));
const pageErrors = [];
const failedRequests = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => {
  const url = new URL(request.url());
  failedRequests.push({ hostname: url.hostname, path: url.pathname, error: request.failure()?.errorText });
});

await page.goto('http://127.0.0.1:4175/login', { waitUntil: 'networkidle' });
await page.locator('input[type="email"]').fill('codex-p3t08@example.invalid');
await page.locator('input[type="password"]').fill('not-a-real-password');
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(15_000);
await page.screenshot({
  path: 'artifacts/tech-verification/PHASE_3/P3-T08/production-login.png',
  fullPage: true,
});

const result = {
  checkedAt: new Date().toISOString(),
  url: page.url(),
  formAvailable: await page.locator('input[type="email"]').isVisible(),
  errorVisible: await page.getByText(/fetch failed|failed to fetch/i).isVisible().catch(() => false),
  pageErrors,
  failedRequests,
};

writeFileSync(
  'artifacts/tech-verification/PHASE_3/P3-T08/production-login.json',
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
