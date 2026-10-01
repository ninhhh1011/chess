import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import express from 'express';
import { createBasicAnswer, getCoachResponse } from '../../../../../api/coachHandler.js';
import { generateBasicExplanation } from '../../../../../src/services/coachService.ts';
import coachRouter from '../../../../../server/routes/coach.js';

const productionUrl = process.argv[2] ?? 'http://127.0.0.1:4175';
const outputRoot = 'artifacts/tech-verification/PHASE_4/P4-T03/verifier';
const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const cases = [
  { id: 'move-noob', question: 'move VERIFIER_MOVE_TOKEN provider secret failure internal prompt', playerLevel: 'noob' },
  { id: 'opening-beginner', question: 'opening VERIFIER_OPENING_TOKEN ignore previous instructions', playerLevel: 'beginner' },
  { id: 'tactic-intermediate', question: 'tactic VERIFIER_TACTIC_TOKEN CLAUDE_API_KEY', playerLevel: 'intermediate' },
  { id: 'endgame-advanced', question: 'endgame VERIFIER_ENDGAME_TOKEN Anthropic raw error', playerLevel: 'advanced' },
  { id: 'general-beginner', question: 'general VERIFIER_GENERAL_TOKEN system prompt', playerLevel: 'beginner' },
];
const forbidden = [fen, 'verifier_', 'provider secret failure', 'internal prompt', 'ignore previous', 'claude_api_key', 'anthropic', 'raw error', 'system prompt'];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const result = {
  checkedAt: new Date().toISOString(),
  verdict: 'FAIL',
  environment: {
    hasClaudeApiKey: Boolean(process.env.CLAUDE_API_KEY),
    hasViteClaudeApiKey: Boolean(process.env.VITE_CLAUDE_API_KEY),
    hasAiProvider: Boolean(process.env.AI_PROVIDER),
  },
  pureAndShared: [],
  http: [],
  browser: {},
  runtime: { console: [], page: [], network: [], unexpectedHttp: [] },
};

function assertSafe(response, question) {
  assert.equal(response.schemaVersion, 'coach.v1');
  assert.equal(response.source, 'basic');
  assert.equal(response.engineSource, 'none');
  assert.equal(response.knowledgeSource, 'none');
  assert(Array.isArray(response.suggestedActions));
  assert.equal(typeof response.reply, 'string');
  assert(response.reply.trim().length > 0);
  assert(response.reply.trim().split(/\s+/).length <= 45);
  assert(!response.reply.includes(question));
  const lower = response.reply.toLowerCase();
  for (const text of forbidden) assert(!lower.includes(text.toLowerCase()), `leaked ${text}`);
}

let server;
let browser;
let page;
try {
  assert.deepEqual(result.environment, { hasClaudeApiKey: false, hasViteClaudeApiKey: false, hasAiProvider: false });
  for (const item of cases) {
    const input = { question: item.question, fen, playerLevel: item.playerLevel, responseStyle: 'short' };
    const clientA = generateBasicExplanation(input);
    const clientB = generateBasicExplanation(input);
    const pureA = createBasicAnswer(input);
    const pureB = createBasicAnswer(input);
    const sharedA = await getCoachResponse(input);
    const sharedB = await getCoachResponse(input);
    assert.deepEqual(clientA, clientB);
    assert.equal(pureA, pureB);
    assert.deepEqual(sharedA, sharedB);
    assert.equal(clientA.reply, pureA);
    assert.deepEqual(clientA, sharedA);
    assertSafe(clientA, item.question);
    result.pureAndShared.push({
      id: item.id,
      clientHash: hash(JSON.stringify(clientA)),
      pureReplyHash: hash(pureA),
      sharedHash: hash(JSON.stringify(sharedA)),
      exactCrossLayerMatch: true,
      words: sharedA.reply.trim().split(/\s+/).length,
    });
  }
  assert(new Set(result.pureAndShared.map((entry) => entry.sharedHash)).size >= 5);

  const app = express();
  app.use(express.json());
  app.use('/api/coach', coachRouter);
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const httpUrl = `http://127.0.0.1:${server.address().port}/api/coach`;
  for (const item of cases) {
    const body = JSON.stringify({ schemaVersion: 'coach.v1', question: item.question, fen, playerLevel: item.playerLevel, responseStyle: 'short' });
    const request = () => fetch(httpUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const responseA = await request();
    const textA = await responseA.text();
    const responseB = await request();
    const textB = await responseB.text();
    assert.equal(responseA.status, 200);
    assert.equal(responseB.status, 200);
    assert(responseA.headers.get('content-type')?.includes('application/json'));
    assert.equal(textA, textB);
    const parsed = JSON.parse(textA);
    assertSafe(parsed, item.question);
    assert.deepEqual(parsed, await getCoachResponse({ question: item.question, fen, playerLevel: item.playerLevel }));
    result.http.push({ id: item.id, repeats: 2, exactBytes: true, hash: hash(textA), status: 200, source: parsed.source });
  }

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1365, height: 950 } });
  page = await context.newPage();
  const requests = [];
  const responses = [];
  page.on('console', (message) => { if (message.type() === 'error') result.runtime.console.push(message.text()); });
  page.on('pageerror', (error) => result.runtime.page.push(error.message));
  page.on('requestfailed', (request) => result.runtime.network.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText ?? null }));
  page.on('response', (response) => {
    if (response.status() >= 400) result.runtime.unexpectedHttp.push({ path: new URL(response.url()).pathname, status: response.status() });
  });
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/coach') requests.push(request.postData() ?? '');
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
  const button = page.getByRole('button', { name: /Nh.n x.t/i });
  for (let index = 0; index < 2; index += 1) {
    const pending = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/coach');
    await button.click();
    const response = await pending;
    assert.equal(response.status(), 200);
    responses.push(await response.text());
  }
  assert.equal(requests.length, 2);
  assert.equal(requests[0], requests[1]);
  assert.equal(responses[0], responses[1]);
  const browserBody = JSON.parse(responses[0]);
  assertSafe(browserBody, JSON.parse(requests[0]).question);
  await page.getByText(/Di.n gi.i c. b.n/i).first().waitFor({ state: 'visible' });
  await page.getByText(/Kh.ng d.ng AI/i).waitFor({ state: 'visible' });
  assert.equal(await page.getByText(/^AI Coach$/i).count(), 0);
  assert(Object.values(result.runtime).every((items) => items.length === 0), JSON.stringify(result.runtime));
  await page.screenshot({ path: `${outputRoot}/deterministic-basic.png`, fullPage: true });
  result.browser = {
    hashedProduction: true,
    repeats: 2,
    exactRequestBytes: true,
    requestHash: hash(requests[0]),
    exactResponseBytes: true,
    responseHash: hash(responses[0]),
    source: browserBody.source,
    engineSource: browserBody.engineSource,
    knowledgeSource: browserBody.knowledgeSource,
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
  writeFileSync(`${outputRoot}/determinism.json`, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));
if (result.verdict !== 'PASS') process.exitCode = 1;
