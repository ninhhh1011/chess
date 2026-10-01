import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import express from 'express';
import edgeHandler from '../../../../../api/coach.js';
import coachRouter from '../../../../../server/routes/coach.js';

const productionUrl = process.argv[2] ?? 'http://127.0.0.1:4175';
const outputRoot = 'artifacts/tech-verification/PHASE_4/P4-T02/verifier';
const endpoint = '/api/coach';
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
  endpoint,
  edgeHttp: {},
  expressHttp: {},
  productionProxyHttp: {},
  browser: {},
  runtime: { console: [], page: [], network: [], unexpectedHttp: [] },
};

const jsonRequest = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

function assertCanonical(body) {
  assert.deepEqual(Object.keys(body).sort(), responseKeys);
  assert.equal(body.schemaVersion, 'coach.v1');
  assert.equal(typeof body.reply, 'string');
  assert(body.reply.length > 0);
  assert(['llm', 'basic', 'unavailable'].includes(body.source));
  assert(['stockfish_wasm', 'fallback', 'none'].includes(body.engineSource));
  assert.equal(body.knowledgeSource, 'none');
  assert(Array.isArray(body.suggestedActions));
}

async function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function close(server) {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function probe(baseUrl) {
  const valid = await fetch(`${baseUrl}${endpoint}`, jsonRequest(payload));
  const validBody = await valid.json();
  assert.equal(valid.status, 200);
  assert(valid.headers.get('content-type')?.includes('application/json'));
  assertCanonical(validBody);
  assert.equal(validBody.source, 'basic');

  const invalid = await fetch(`${baseUrl}${endpoint}`, jsonRequest({ ...payload, schemaVersion: 'coach.v0' }));
  assert.equal(invalid.status, 400);
  assert(invalid.headers.get('content-type')?.includes('application/json'));
  assert.deepEqual(await invalid.json(), { error: 'Unsupported schema version', supported: 'coach.v1' });

  const missing = await fetch(`${baseUrl}${endpoint}`, jsonRequest({ schemaVersion: 'coach.v1', playerLevel: 'beginner' }));
  assert.equal(missing.status, 400);
  assert(missing.headers.get('content-type')?.includes('application/json'));
  assert.deepEqual(await missing.json(), { error: 'Question is required', schemaVersion: 'coach.v1' });

  const method = await fetch(`${baseUrl}${endpoint}`);
  assert.equal(method.status, 405);
  assert(method.headers.get('content-type')?.includes('application/json'));
  assert.deepEqual(await method.json(), { error: 'Method not allowed' });

  return {
    validStatus: valid.status,
    invalidSchemaStatus: invalid.status,
    missingQuestionStatus: missing.status,
    unsupportedMethodStatus: method.status,
    allJsonContentType: true,
    responseKeys,
    responseSource: validBody.source,
    responseHash: createHash('sha256').update(JSON.stringify(validBody)).digest('hex'),
  };
}

let edgeServer;
let expressServer;
let browser;
let page;
try {
  edgeServer = createServer(async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const init = { method: request.method, headers: request.headers };
      if (request.method !== 'GET' && request.method !== 'HEAD') init.body = body;
      const edgeResponse = await edgeHandler(new Request(`http://127.0.0.1${request.url}`, init));
      response.writeHead(edgeResponse.status, Object.fromEntries(edgeResponse.headers));
      response.end(Buffer.from(await edgeResponse.arrayBuffer()));
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ verifierError: String(error) }));
    }
  });
  await new Promise((resolve) => edgeServer.listen(0, '127.0.0.1', resolve));
  result.edgeHttp = await probe(`http://127.0.0.1:${edgeServer.address().port}`);

  const app = express();
  app.use(express.json());
  app.use(endpoint, coachRouter);
  expressServer = await listen(app);
  result.expressHttp = await probe(`http://127.0.0.1:${expressServer.address().port}`);

  result.productionProxyHttp = await probe(productionUrl);
  assert.deepEqual(result.edgeHttp.responseKeys, result.expressHttp.responseKeys);
  assert.deepEqual(result.edgeHttp.responseKeys, result.productionProxyHttp.responseKeys);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1365, height: 950 } });
  page = await context.newPage();
  const coachRequests = [];
  page.on('console', (message) => { if (message.type() === 'error') result.runtime.console.push(message.text()); });
  page.on('pageerror', (error) => result.runtime.page.push(error.message));
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    result.runtime.network.push({ method: request.method(), path: url.pathname, error: request.failure()?.errorText ?? null });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      const url = new URL(response.url());
      result.runtime.unexpectedHttp.push({ method: response.request().method(), path: url.pathname, status: response.status() });
    }
  });
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === endpoint) {
      coachRequests.push(JSON.parse(request.postData() ?? '{}'));
    }
  });
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('chess-app-onboarding', 'true');
  });
  await page.goto(`${productionUrl}/play`, { waitUntil: 'networkidle' });
  const scripts = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.src));
  assert(scripts.some((src) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.js$/.test(src)));
  assert(scripts.every((src) => !src.includes('/src/')));
  await page.getByRole('button', { name: /Tr.ng.*tr..c/i }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/i, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Hu.n luy.n/i }).click();
  const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST'
    && new URL(response.url()).pathname === endpoint);
  await page.getByRole('button', { name: /Nh.n x.t/i }).click();
  const coachResponse = await responsePromise;
  const coachBody = await coachResponse.json();
  assert.equal(coachResponse.status(), 200);
  assert(coachResponse.headers()['content-type']?.includes('application/json'));
  assertCanonical(coachBody);
  assert.equal(coachBody.source, 'basic');
  assert.equal(coachRequests.length, 1);
  assert.equal(coachRequests[0].schemaVersion, 'coach.v1');
  assert.equal(coachRequests[0].question, 'Nhận xét nhanh');
  await page.getByText(/Di.n gi.i c. b.n/i).first().waitFor({ state: 'visible' });
  await page.getByText(/Kh.ng d.ng AI/i).waitFor({ state: 'visible' });
  assert.equal(await page.getByText(/^AI Coach$/i).count(), 0);
  assert(Object.values(result.runtime).every((items) => items.length === 0), JSON.stringify(result.runtime));
  await page.screenshot({ path: `${outputRoot}/coach-endpoint.png`, fullPage: true });
  result.browser = {
    hashedProduction: true,
    endpoint,
    requestCount: coachRequests.length,
    responseStatus: coachResponse.status(),
    responseContentType: coachResponse.headers()['content-type'],
    responseSchema: coachBody.schemaVersion,
    responseSource: coachBody.source,
    truthfulBasicLabel: true,
    aiProviderClaimed: false,
  };
  result.verdict = 'PASS';
} catch (error) {
  result.failure = error instanceof Error ? error.stack : String(error);
  if (page && !page.isClosed()) await page.screenshot({ path: `${outputRoot}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  if (browser) await browser.close();
  await close(expressServer);
  await close(edgeServer);
  writeFileSync(`${outputRoot}/endpoint.json`, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));
if (result.verdict !== 'PASS') process.exitCode = 1;
