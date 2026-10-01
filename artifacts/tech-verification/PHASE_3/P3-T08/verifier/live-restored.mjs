import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const outputRoot = 'artifacts/tech-verification/PHASE_3/P3-T08/verifier';
const baseUrl = 'http://127.0.0.1:4175';
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
    }),
);
const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error('Configured live Supabase admin access is unavailable');

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const stableJson = (value) => JSON.stringify(value, Object.keys(value).sort());
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const runId = randomUUID();
const email = `codex-p3t08-verifier-${runId}@example.invalid`;
const password = `Codex-${runId}-Aa1!`;
const result = {
  checkedAt: new Date().toISOString(),
  hostname: new URL(supabaseUrl).hostname,
  accountCreated: false,
  login: false,
  manualUploadStatuses: [],
  rowCounts: [],
  rowIdentityHashes: [],
  profileHashes: [],
  trainingEventCounts: [],
  sameRowAfterRetry: false,
  sameProfileAfterRetry: false,
  pageErrors: [],
  consoleErrors: [],
  failedRequests: [],
  unexpectedHttpResponses: [],
  cleanup: {
    profileDeleteSucceeded: false,
    profileRowsRemaining: null,
    accountDeleteSucceeded: false,
    accountAbsentAfterDelete: false,
  },
};

let browser;
let userId;
try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error('Disposable account creation failed');
  userId = created.data.user.id;
  result.accountCreated = true;
  result.userIdentityHash = sha256(userId);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('chess-app-onboarding', 'true'));
  page.on('pageerror', (error) => result.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    result.failedRequests.push({ method: request.method(), hostname: url.hostname, path: url.pathname, error: request.failure()?.errorText ?? null });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      const url = new URL(response.url());
      result.unexpectedHttpResponses.push({ method: response.request().method(), hostname: url.hostname, path: url.pathname, status: response.status() });
    }
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/training', { timeout: 20_000 });
  result.login = true;

  const upload = page.getByRole('button', { name: /cloud/i });
  await upload.waitFor({ state: 'visible' });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const responsePromise = page.waitForResponse((response) => {
      const request = response.request();
      return request.method() === 'POST' && new URL(response.url()).pathname === '/rest/v1/user_progress';
    });
    await upload.click();
    const response = await responsePromise;
    result.manualUploadStatuses.push(response.status());
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find((item) => /cloud/i.test(item.textContent ?? ''));
      return Boolean(button && !button.disabled);
    });

    const readback = await admin
      .from('user_progress')
      .select('id,user_id,profile_data')
      .eq('user_id', userId);
    if (readback.error) throw readback.error;
    result.rowCounts.push(readback.data.length);
    if (readback.data[0]) {
      result.rowIdentityHashes.push(sha256(readback.data[0].id));
      result.profileHashes.push(sha256(stableJson(readback.data[0].profile_data)));
    }

    const events = await admin.from('training_events').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (events.error) throw events.error;
    result.trainingEventCounts.push(events.count ?? 0);
  }

  result.sameRowAfterRetry = result.rowIdentityHashes.length === 2 && result.rowIdentityHashes[0] === result.rowIdentityHashes[1];
  result.sameProfileAfterRetry = result.profileHashes.length === 2 && result.profileHashes[0] === result.profileHashes[1];
  await page.screenshot({ path: `${outputRoot}/live-restored.png`, fullPage: true });
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
} finally {
  if (browser) await browser.close();
  if (userId) {
    const deletedRows = await admin.from('user_progress').delete().eq('user_id', userId);
    result.cleanup.profileDeleteSucceeded = !deletedRows.error;
    const remainingRows = await admin.from('user_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    result.cleanup.profileRowsRemaining = remainingRows.error ? null : (remainingRows.count ?? 0);
    const deletedUser = await admin.auth.admin.deleteUser(userId);
    result.cleanup.accountDeleteSucceeded = !deletedUser.error;
    const lookup = await admin.auth.admin.getUserById(userId);
    result.cleanup.accountAbsentAfterDelete = Boolean(lookup.error || !lookup.data.user);
  }
}

result.pass = result.accountCreated
  && result.login
  && result.manualUploadStatuses.length === 2
  && result.manualUploadStatuses.every((status) => status >= 200 && status < 300)
  && result.rowCounts.length === 2
  && result.rowCounts.every((count) => count === 1)
  && result.sameRowAfterRetry
  && result.sameProfileAfterRetry
  && result.trainingEventCounts.every((count) => count === 0)
  && result.pageErrors.length === 0
  && result.consoleErrors.length === 0
  && result.failedRequests.length === 0
  && result.unexpectedHttpResponses.length === 0
  && result.cleanup.profileDeleteSucceeded
  && result.cleanup.profileRowsRemaining === 0
  && result.cleanup.accountDeleteSucceeded
  && result.cleanup.accountAbsentAfterDelete;

writeFileSync(`${outputRoot}/live-restored.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
