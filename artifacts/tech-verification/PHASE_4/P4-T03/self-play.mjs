import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createBasicAnswer, getCoachResponse } from '../../../../api/coachHandler.js';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4175';
const serverUrl = process.argv[3] || 'http://127.0.0.1:3001';
const output = 'artifacts/tech-verification/PHASE_4/P4-T03';
await mkdir(output, { recursive: true });
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const question = 'Nhận xét nhanh';
const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const categories = ['move', 'opening', 'tactic', 'endgame', question];
const pure = categories.map((item) => {
  const first = createBasicAnswer({ playerLevel: 'beginner', question: item });
  const second = createBasicAnswer({ playerLevel: 'beginner', question: item });
  assert.equal(first, second);
  assert(!first.includes(fen));
  return { input: item, hash: hash(first) };
});
const handlerResponses = await Promise.all([0, 1, 2].map(() => getCoachResponse({ question, fen, playerLevel: 'beginner' })));
assert(handlerResponses.every((response) => hash(response) === hash(handlerResponses[0])));
assert(handlerResponses.every((response) => response.source === 'basic' && !response.reply.includes(fen)));

const payload = { schemaVersion: 'coach.v1', question, fen, playerLevel: 'beginner' };
const httpResponses = await Promise.all([0, 1, 2].map(async () => {
  const response = await fetch(`${serverUrl}/api/coach`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  assert.equal(response.status, 200);
  return response.json();
}));
assert(httpResponses.every((response) => hash(response) === hash(httpResponses[0])));
assert(httpResponses.every((response) => response.source === 'basic' && !response.reply.includes(fen)));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = { console: [], page: [], network: [], http: [] };
page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', (error) => errors.page.push(error.message));
page.on('requestfailed', (request) => errors.network.push(`${request.method()} ${new URL(request.url()).pathname}`));
page.on('response', (response) => { if (response.status() >= 400) errors.http.push(`${response.status()} ${new URL(response.url()).pathname}`); });
await page.addInitScript(() => {
  localStorage.clear();
  localStorage.setItem('chess-app-onboarding', 'true');
});

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  const scripts = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.src));
  assert(scripts.some((src) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.js$/.test(src)));
  await page.getByRole('button', { name: /Tr.ng.*tr..c/ }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Hu.n luy.n/i }).click();
  const button = page.getByRole('button', { name: /Nh.n x.t/i });
  const browserBodies = [];
  for (let run = 0; run < 2; run += 1) {
    const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/coach');
    await button.click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    browserBodies.push(await response.json());
    await page.getByText(/Di.n gi.i c. b.n/i).first().waitFor();
  }
  assert.equal(hash(browserBodies[0]), hash(browserBodies[1]));
  assert(browserBodies.every((response) => response.source === 'basic'));
  assert.deepEqual(errors, { console: [], page: [], network: [], http: [] });
  await page.screenshot({ path: `${output}/self-play.png`, fullPage: true });
  const result = {
    checkedAt: new Date().toISOString(), verdict: 'PASS', production: true,
    pure, handler: { runs: handlerResponses.length, responseHash: hash(handlerResponses[0]) },
    http: { runs: httpResponses.length, responseHash: hash(httpResponses[0]) },
    browser: { runs: browserBodies.length, responseHash: hash(browserBodies[0]), source: 'basic', truthfulLabel: true },
    noFenLeakage: true, errors,
  };
  await writeFile(`${output}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
