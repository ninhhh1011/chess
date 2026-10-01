import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
    }),
);

const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Live Supabase URL/service credential is unavailable');

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stamp = Date.now();
const email = `codex-p3t08-${stamp}@example.invalid`;
const password = `Codex-${stamp}-Aa1!`;
const result = {
  checkedAt: new Date().toISOString(),
  hostname: new URL(url).hostname,
  accountCreated: false,
  login: false,
  uploadStatuses: [],
  rowCounts: [],
  sameRowAfterRetry: false,
  pageErrors: [],
  consoleErrors: [],
  cleanup: { profile: false, account: false },
};

let browser;
let userId;
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error('Test account was not created');
  userId = created.data.user.id;
  result.accountCreated = true;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('chess-app-onboarding', 'true'));
  page.on('pageerror', (error) => result.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });

  await page.goto('http://127.0.0.1:4175/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/training', { timeout: 20_000 });
  result.login = true;

  const upload = page.getByRole('button', { name: /cloud/i });
  await upload.waitFor();
  let firstRowId;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const responsePromise = page.waitForResponse((response) => {
      const request = response.request();
      return request.method() === 'POST' && new URL(response.url()).pathname === '/rest/v1/user_progress';
    });
    await upload.click();
    const response = await responsePromise;
    result.uploadStatuses.push(response.status());
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find((item) => /cloud/i.test(item.textContent ?? ''));
      return Boolean(button && !button.disabled);
    });

    const readback = await admin.from('user_progress').select('id,user_id').eq('user_id', userId);
    if (readback.error) throw readback.error;
    result.rowCounts.push(readback.data.length);
    if (attempt === 0) firstRowId = readback.data[0]?.id;
    if (attempt === 1) result.sameRowAfterRetry = Boolean(firstRowId && firstRowId === readback.data[0]?.id);
  }

  await page.screenshot({
    path: 'artifacts/tech-verification/PHASE_3/P3-T08/live-idempotency.png',
    fullPage: true,
  });
} catch (error) {
  result.error = error.message;
} finally {
  if (browser) await browser.close();
  if (userId) {
    const profileCleanup = await admin.from('user_progress').delete().eq('user_id', userId);
    result.cleanup.profile = !profileCleanup.error;
    const accountCleanup = await admin.auth.admin.deleteUser(userId);
    result.cleanup.account = !accountCleanup.error;
  }
}

result.pass = result.login
  && result.uploadStatuses.length === 2
  && result.uploadStatuses.every((status) => status >= 200 && status < 300)
  && result.rowCounts.every((count) => count === 1)
  && result.sameRowAfterRetry
  && result.pageErrors.length === 0
  && result.cleanup.profile
  && result.cleanup.account;

writeFileSync(
  'artifacts/tech-verification/PHASE_3/P3-T08/live-idempotency.json',
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
