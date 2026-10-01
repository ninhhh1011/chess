import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import express from 'express';
import edgeHandler from '../../../../../api/coach.js';
import coachRouter from '../../../../../server/routes/coach.js';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4175';
const outputRoot = 'artifacts/tech-verification/PHASE_4/P4-T01/verifier';
const payload = {
  schemaVersion: 'coach.v1',
  question: 'quick',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  history: [],
  pgn: '',
  playerLevel: 'beginner',
  responseStyle: 'short',
};
const responseKeys = ['engineSource', 'knowledgeSource', 'reply', 'schemaVersion', 'source', 'suggestedActions'];
const result = {
  checkedAt: new Date().toISOString(),
  verdict: 'FAIL',
  edge: {},
  express: {},
  browser: {},
  runtime: { console: [], page: [], network: [], unexpectedHttp: [] },
};
const assertCanonical = (body) => {
  assert.deepEqual(Object.keys(body).sort(), responseKeys);
  assert.equal(body.schemaVersion, 'coach.v1');
  assert(['llm', 'basic', 'unavailable'].includes(body.source));
  assert(['stockfish_wasm', 'fallback', 'none'].includes(body.engineSource));
  assert.equal(body.knowledgeSource, 'none');
  assert.equal(typeof body.reply, 'string');
  assert(body.reply.length > 0);
  assert(Array.isArray(body.suggestedActions));
  assert(body.suggestedActions.every((action) => action && typeof action.type === 'string' && typeof action.label === 'string'));
};

let server;
let browser;
let page;
try {
  const edgeValid = await edgeHandler(new Request('http://verifier.invalid/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
  const edgeBody = await edgeValid.json();
  assert.equal(edgeValid.status, 200);
  assertCanonical(edgeBody);
  assert.equal(edgeBody.source, 'basic');
  assert.equal(edgeBody.engineSource, 'none');
  assert(!edgeBody.reply.includes(payload.fen));
  const edgeInvalid = await edgeHandler(new Request('http://verifier.invalid/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, schemaVersion: 'coach.v0' }),
  }));
  assert.equal(edgeInvalid.status, 400);
  assert.deepEqual(await edgeInvalid.json(), { error: 'Unsupported schema version', supported: 'coach.v1' });
  result.edge = { validStatus: 200, invalidSchemaStatus: 400, responseKeys, source: edgeBody.source };

  const app = express();
  app.use(express.json());
  app.use('/api/coach', coachRouter);
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  assert(address && typeof address === 'object');
  const expressUrl = `http://127.0.0.1:${address.port}/api/coach`;
  const expressValid = await fetch(expressUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const expressBody = await expressValid.json();
  assert.equal(expressValid.status, 200);
  assertCanonical(expressBody);
  assert.equal(expressBody.source, 'basic');
  const expressInvalid = await fetch(expressUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, schemaVersion: 'legacy.v1' }),
  });
  assert.equal(expressInvalid.status, 400);
  assert.deepEqual(await expressInvalid.json(), { error: 'Unsupported schema version', supported: 'coach.v1' });
  result.express = { validStatus: 200, invalidSchemaStatus: 400, responseKeys, source: expressBody.source };

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1365, height: 950 } });
  page = await context.newPage();
  const requests = [];
  page.on('console', (message) => { if (message.type() === 'error') result.runtime.console.push(message.text()); });
  page.on('pageerror', (error) => result.runtime.page.push(error.message));
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    result.runtime.network.push({ method: request.method(), hostname: url.hostname, path: url.pathname, error: request.failure()?.errorText ?? null });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      const url = new URL(response.url());
      result.runtime.unexpectedHttp.push({ method: response.request().method(), hostname: url.hostname, path: url.pathname, status: response.status() });
    }
  });
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/coach') {
      requests.push(JSON.parse(request.postData() ?? '{}'));
    }
  });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('chess-app-onboarding', 'true');
  });
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  const scripts = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.src));
  assert(scripts.some((src) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.js$/.test(src)));
  assert(scripts.every((src) => !src.includes('/src/')));
  await page.getByRole('button', { name: /Tr.ng.*tr..c/i }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/i, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Hu.n luy.n/i }).click();
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/api/coach');
  await page.getByRole('button', { name: /Nh.n x.t/i }).click();
  const coachResponse = await responsePromise;
  const coachBody = await coachResponse.json();
  assert.equal(coachResponse.status(), 200);
  assertCanonical(coachBody);
  assert.equal(coachBody.source, 'basic');
  assert.equal(coachBody.engineSource, 'none');
  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]).sort(), ['fen', 'history', 'pgn', 'playerLevel', 'question', 'responseStyle', 'schemaVersion']);
  assert.equal(requests[0].schemaVersion, 'coach.v1');
  assert.equal(requests[0].question, 'Nhận xét nhanh');
  assert.equal(requests[0].responseStyle, 'short');
  assert(Array.isArray(requests[0].history));
  assert.equal(typeof requests[0].pgn, 'string');
  await page.getByText(/Di.n gi.i c. b.n/i).first().waitFor({ state: 'visible' });
  await page.getByText(/Kh.ng d.ng AI/i).waitFor({ state: 'visible' });
  assert.equal(await page.getByText(/^AI Coach$/i).count(), 0);
  assert(Object.values(result.runtime).every((items) => items.length === 0), JSON.stringify(result.runtime));
  await page.screenshot({ path: `${outputRoot}/coach-basic.png`, fullPage: true });
  result.browser = {
    hashedProduction: true,
    requestCount: 1,
    requestKeys: Object.keys(requests[0]).sort(),
    requestSchema: requests[0].schemaVersion,
    responseStatus: coachResponse.status(),
    responseSchema: coachBody.schemaVersion,
    responseSource: coachBody.source,
    responseHash: createHash('sha256').update(JSON.stringify(coachBody)).digest('hex'),
    truthfulBasicLabel: true,
    aiProviderClaimed: false,
  };
  result.verdict = 'PASS';
} catch (error) {
  result.failure = error instanceof Error ? error.stack : String(error);
  if (page && !page.isClosed()) await page.screenshot({ path: `${outputRoot}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  writeFileSync(`${outputRoot}/contract.json`, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));
if (result.verdict !== 'PASS') process.exitCode = 1;
