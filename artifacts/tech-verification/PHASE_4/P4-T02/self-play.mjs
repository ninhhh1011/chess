import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4175';
const serverUrl = process.argv[3] || 'http://127.0.0.1:3001';
const output = 'artifacts/tech-verification/PHASE_4/P4-T02';
await mkdir(output, { recursive: true });
const request = { schemaVersion: 'coach.v1', question: 'Nhận xét nhanh', playerLevel: 'beginner' };

const call = async (method, body) => {
  const response = await fetch(`${serverUrl}/api/coach`, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, type: response.headers.get('content-type'), body: await response.json() };
};
const http = {
  valid: await call('POST', request),
  invalidSchema: await call('POST', { ...request, schemaVersion: 'coach.v0' }),
  missingQuestion: await call('POST', { schemaVersion: 'coach.v1', playerLevel: 'beginner' }),
  invalidMethod: await call('GET'),
};
assert.equal(http.valid.status, 200);
assert.equal(http.valid.body.schemaVersion, 'coach.v1');
assert.equal(http.valid.body.source, 'basic');
assert.deepEqual(Object.keys(http.valid.body).sort(), ['engineSource', 'knowledgeSource', 'reply', 'schemaVersion', 'source', 'suggestedActions']);
assert.equal(http.invalidSchema.status, 400);
assert.equal(http.missingQuestion.status, 400);
assert.equal(http.invalidMethod.status, 405);
assert(Object.values(http).every(({ type }) => type?.includes('application/json')));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = { console: [], page: [], network: [], http: [] };
page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', (error) => errors.page.push(error.message));
page.on('requestfailed', (failed) => errors.network.push(`${failed.method()} ${new URL(failed.url()).pathname}`));
page.on('response', (response) => { if (response.status() >= 400) errors.http.push(`${response.status()} ${new URL(response.url()).pathname}`); });
await page.addInitScript(() => {
  localStorage.clear();
  localStorage.setItem('chess-app-onboarding', 'true');
});

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  const scripts = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.src));
  assert(scripts.some((src) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.js$/.test(src)));
  assert(scripts.every((src) => !src.includes('/src/')));
  await page.getByRole('button', { name: /Tr.ng.*tr..c/ }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Hu.n luy.n/i }).click();
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/api/coach');
  await page.getByRole('button', { name: /Nh.n x.t/i }).click();
  const response = await responsePromise;
  const body = await response.json();
  await page.getByText(/Di.n gi.i c. b.n/i).first().waitFor();
  assert.equal(response.status(), 200);
  assert.equal(body.schemaVersion, 'coach.v1');
  assert.equal(body.source, 'basic');
  assert.deepEqual(errors, { console: [], page: [], network: [], http: [] });
  await page.screenshot({ path: `${output}/self-play.png`, fullPage: true });
  const result = {
    checkedAt: new Date().toISOString(), verdict: 'PASS', endpoint: '/api/coach',
    http: Object.fromEntries(Object.entries(http).map(([name, value]) => [name, { status: value.status, contentType: value.type, source: value.body.source ?? null }])),
    browser: { production: true, status: response.status(), schemaVersion: body.schemaVersion, source: body.source },
    errors,
  };
  await writeFile(`${output}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
