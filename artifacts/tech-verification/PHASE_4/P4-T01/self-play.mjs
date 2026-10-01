import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import edgeCoachHandler from '../../../../api/coach.js';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4175';
const output = 'artifacts/tech-verification/PHASE_4/P4-T01';
await mkdir(output, { recursive: true });

const canonicalPayload = {
  schemaVersion: 'coach.v1',
  question: 'Nên phát triển quân nào?',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  playerLevel: 'beginner',
};
const direct = await edgeCoachHandler(new Request('http://localhost/api/coach', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(canonicalPayload),
}));
const directBody = await direct.json();
assert.equal(direct.status, 200);
assert.deepEqual(Object.keys(directBody).sort(), ['engineSource', 'knowledgeSource', 'reply', 'schemaVersion', 'source', 'suggestedActions']);
assert.equal(directBody.schemaVersion, 'coach.v1');
assert.equal(directBody.source, 'basic');
assert.equal(directBody.engineSource, 'none');
assert.equal(directBody.knowledgeSource, 'none');
assert.equal(typeof directBody.reply, 'string');
assert(Array.isArray(directBody.suggestedActions));
assert(!directBody.reply.includes(canonicalPayload.fen));

const invalid = await edgeCoachHandler(new Request('http://localhost/api/coach', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...canonicalPayload, schemaVersion: 'coach.v0' }),
}));
assert.equal(invalid.status, 400);
assert.equal((await invalid.json()).supported, 'coach.v1');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = { console: [], page: [], network: [] };
const requests = [];
page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', (error) => errors.page.push(error.message));
page.on('requestfailed', (request) => errors.network.push(`${request.method()} ${new URL(request.url()).pathname}`));
page.on('request', (request) => {
  if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/coach') {
    requests.push(JSON.parse(request.postData() || '{}'));
  }
});
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
  const browserResponse = await responsePromise;
  const browserBody = await browserResponse.json();
  await page.getByText(/Di.n gi.i c. b.n/i).first().waitFor();
  assert.equal(browserResponse.status(), 200);
  assert.equal(browserBody.schemaVersion, 'coach.v1');
  assert.equal(browserBody.source, 'basic');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].schemaVersion, 'coach.v1');
  assert.equal(typeof requests[0].question, 'string');
  assert(['noob', 'beginner', 'intermediate', 'advanced'].includes(requests[0].playerLevel));
  assert.equal(requests[0].responseStyle, 'short');
  assert.deepEqual(errors, { console: [], page: [], network: [] });
  await page.screenshot({ path: `${output}/self-play.png`, fullPage: true });
  const result = {
    checkedAt: new Date().toISOString(), verdict: 'PASS', production: true,
    directContract: { status: direct.status, requestSchema: canonicalPayload.schemaVersion, responseSchema: directBody.schemaVersion, source: directBody.source },
    invalidVersionStatus: invalid.status,
    browserContract: { requests: requests.length, status: browserResponse.status(), schemaVersion: browserBody.schemaVersion, source: browserBody.source, sourceLabel: 'basic' },
    errors,
  };
  await writeFile(`${output}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
