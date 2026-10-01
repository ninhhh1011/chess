import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const baseUrl = process.env.P3_T08_BASE_URL ?? 'http://127.0.0.1:4294';
const outputRoot = 'artifacts/tech-verification/PHASE_3/P3-T08/verifier';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('requestfailed', (request) => {
  const url = new URL(request.url());
  failedRequests.push({
    hostname: url.hostname,
    path: url.pathname,
    error: request.failure()?.errorText ?? null,
  });
});

await page.addInitScript(() => localStorage.setItem('chess-app-onboarding', 'true'));
await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await page.locator('input[type="email"]').fill('codex-p3t08-verifier@example.invalid');
await page.locator('input[type="password"]').fill('not-a-real-password');
await page.locator('button[type="submit"]').click();
await page.waitForFunction(
  () => /fetch failed|failed to fetch/i.test(document.body.innerText),
  undefined,
  { timeout: 20_000 },
).catch(() => undefined);
await page.screenshot({ path: `${outputRoot}/production-login.png`, fullPage: true });

const formAvailable = await page.locator('input[type="email"]').isVisible();
const errorVisible = await page.getByText(/fetch failed|failed to fetch/i).isVisible().catch(() => false);
const authFailures = failedRequests.filter((request) => request.path === '/auth/v1/token');
const result = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  formAvailable,
  errorVisible,
  pageErrors,
  consoleErrors,
  failedRequests,
  verdict:
    formAvailable &&
    errorVisible &&
    authFailures.some((request) => request.error?.includes('ERR_NAME_NOT_RESOLVED'))
      ? 'LIVE_CLOUD_BLOCKED'
      : 'INCONCLUSIVE',
};

writeFileSync(`${outputRoot}/production-login.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
