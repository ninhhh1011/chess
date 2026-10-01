import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4175';
const output = 'artifacts/tech-verification/PHASE_3/GATE';
await mkdir(output, { recursive: true });
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#') && line.includes('='))
  .map((line) => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
  }));
const cloudUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
assert(cloudUrl && serviceKey, 'Live Supabase configuration is required');
const admin = createClient(cloudUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now();
const email = `codex-phase3-gate-${stamp}@example.invalid`;
const password = `Codex-${stamp}-Aa1!`;
const result = {
  checkedAt: new Date().toISOString(), verdict: 'FAIL', production: false,
  accountCreated: false, dailyPlan: {}, game: {}, review: {}, coach: {}, puzzle: {}, persistence: {},
  cloud: { uploadStatuses: [], rowCounts: [], cleanup: {} },
  errors: { console: [], page: [], network: [], http: [] },
};
let browser;
let page;
let userId;

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error('Disposable user creation failed');
  userId = created.data.user.id;
  result.accountCreated = true;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') result.errors.console.push(message.text()); });
  page.on('pageerror', (error) => result.errors.page.push(error.message));
  page.on('requestfailed', (request) => result.errors.network.push(`${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
  page.on('response', (response) => { if (response.status() >= 400) result.errors.http.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__phase3GateInitialized')) {
      localStorage.clear();
      sessionStorage.setItem('__phase3GateInitialized', 'true');
    }
    localStorage.setItem('chess-app-onboarding', 'true');
    const NativeWorker = window.Worker;
    window.__phase3GateEngine = { currentFen: null, searches: [] };
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.__stockfish = String(url).includes('stockfish-worker.js');
        if (!this.__stockfish) return;
        this.addEventListener('message', (event) => {
          const line = event.data?.type === 'output' ? event.data.data : null;
          if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
          const search = window.__phase3GateEngine.searches.findLast((item) => !item.bestmove);
          if (search) search.bestmove = line.split(/\s+/)[1];
        });
      }
      postMessage(message, ...rest) {
        if (this.__stockfish && typeof message === 'string') {
          if (message.startsWith('position fen ')) window.__phase3GateEngine.currentFen = message.slice(13);
          if (message.startsWith('go ')) window.__phase3GateEngine.searches.push({
            fen: window.__phase3GateEngine.currentFen, command: message, bestmove: null,
          });
        }
        return super.postMessage(message, ...rest);
      }
    };
  });

  const profile = () => page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')));
  const rawProfile = () => page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile'));
  const history = () => page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '').filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
  const waitForPly = (count) => page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30_000 });
  const dragMove = async (from, to) => {
    const source = await page.locator(`[data-square="${from}"]`).boundingBox();
    const target = await page.locator(`[data-square="${to}"]`).boundingBox();
    assert(source && target, `Missing drag squares ${from}-${to}`);
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
    await page.mouse.up();
  };
  const chooseWeakMove = (game) => {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    return game.moves({ verbose: true }).map((move) => {
      const next = new Chess(game.fen());
      next.move(move);
      const exposure = Math.max(0, ...next.moves({ verbose: true }).filter((reply) => reply.isCapture())
        .map((reply) => values[reply.captured] || 0));
      return { move, exposure };
    }).sort((a, b) => b.exposure - a.exposure)[0].move;
  };

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  const scripts = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.src));
  result.production = scripts.some((src) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.js$/.test(src))
    && scripts.every((src) => !src.includes('/src/'));
  assert(result.production, `Not a production build: ${scripts.join(', ')}`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/training', { timeout: 20_000 });
  const initial = await profile();
  assert(initial.dailyTrainingPlan.tasks.length > 0, 'Clean profile received zero tasks');
  result.dailyPlan = { initialId: initial.dailyTrainingPlan.planId, initialTasks: initial.dailyTrainingPlan.tasks.length };

  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /N.ng cao/ }).click();
  await page.getByRole('button', { name: /Tr.ng.*tr..c/ }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  while ((await history()).length < 14) {
    const moves = await history();
    const game = new Chess();
    moves.forEach((san) => game.move(san));
    if (game.turn() === 'w') {
      const move = chooseWeakMove(game);
      await dragMove(move.from, move.to);
      await waitForPly(moves.length + 1);
    }
    if ((await history()).length < 14) await waitForPly(moves.length + 2);
  }
  const played = await history();
  const legalReplay = new Chess();
  played.forEach((san) => legalReplay.move(san));
  result.game = { plies: played.length, legal: true, finalFen: legalReplay.fen() };

  await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
  await page.getByRole('button', { name: /M. v.n c./i }).click();
  await page.getByRole('button', { name: /.*ang m. v.n/ }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /M. v.n c./i }).waitFor({ state: 'visible', timeout: 120_000 });
  const evidence = page.locator('[data-evidence-id]').first();
  await evidence.waitFor({ state: 'visible' });
  const selected = await evidence.evaluate((node) => ({
    id: node.dataset.evidenceId, source: node.dataset.engineSource,
    playedUci: node.dataset.playedUci, bestUci: node.dataset.bestUci,
  }));
  await evidence.click();
  const afterReview = await profile();
  const trustedFact = afterReview.persistence.analysisFacts.find((fact) => `${fact.gameId}:ply:${fact.ply}` === selected.id);
  assert(trustedFact && trustedFact.engine.source === 'stockfish_wasm', 'Selected evidence is not a persisted trusted fact');
  result.review = { evidenceId: selected.id, engineSource: selected.source, bestUci: selected.bestUci };

  await page.getByRole('button', { name: /Hu.n luy.n/i }).click();
  await page.getByRole('button', { name: /Qu.n s.*v.n n.y/i }).click();
  const moveHint = await page.getByText(/N..c g.i .:/i).innerText();
  assert(moveHint.includes(trustedFact.bestMove.san), `Coach hint does not match fact: ${moveHint}`);
  result.coach = { factId: selected.id, hint: trustedFact.bestMove.san, grounded: true };

  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  await page.getByText('Lichess puzzle 00008').waitFor({ timeout: 30_000 });
  const beforePuzzle = await profile();
  await dragMove('e6', 'f6');
  await page.waitForFunction(() => {
    const attempt = JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')).persistence.puzzleAttempts.at(-1);
    return attempt?.events.length === 1 && attempt.events[0].type === 'wrong';
  });
  await page.getByRole('button', { name: /L.m l.i/i }).click();
  await page.waitForFunction(() => {
    const events = JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile')).persistence.puzzleAttempts.at(-1)?.events;
    return events?.length === 2 && events.at(-1).type === 'retry';
  });
  await dragMove('e6', 'e7');
  await page.getByText(/ti.p t.c/i).waitFor();
  await dragMove('b3', 'c1');
  await page.getByText(/ti.p t.c/i).waitFor();
  await dragMove('h6', 'c1');
  await page.getByText(/^Ch.nh x.c!/i).waitFor();
  await page.waitForTimeout(250);
  const durableRaw = await rawProfile();
  const durable = JSON.parse(durableRaw);
  const attempt = durable.persistence.puzzleAttempts.at(-1);
  assert.deepEqual(attempt.events.map((event) => event.type), ['wrong', 'retry', 'correct', 'correct', 'correct']);
  assert.equal(attempt.status, 'solved');
  assert(durable.persistence.skillStates.every((state) => state.evidenceIds.length > 0));
  assert.notEqual(durable.dailyTrainingPlan.planId, beforePuzzle.dailyTrainingPlan.planId);
  assert(durable.dailyTrainingPlan.tasks.length > 0);
  const evidenceTask = durable.dailyTrainingPlan.tasks.find((task) => task.evidenceIds?.length);
  const skillEvidence = new Set(durable.persistence.skillStates.flatMap((state) => state.evidenceIds));
  assert(evidenceTask?.evidenceIds.every((id) => skillEvidence.has(id)), 'Daily plan is not backed by persisted evidence');
  result.puzzle = { id: attempt.puzzleId, status: attempt.status, events: attempt.events.length };
  result.dailyPlan.afterPuzzleId = durable.dailyTrainingPlan.planId;
  result.dailyPlan.afterPuzzleTasks = durable.dailyTrainingPlan.tasks.length;
  result.dailyPlan.evidenceTask = { id: evidenceTask.id, evidenceIds: evidenceTask.evidenceIds };

  await page.reload({ waitUntil: 'networkidle' });
  const reloadedRaw = await rawProfile();
  assert.equal(reloadedRaw, durableRaw, 'Reload changed durable profile bytes');
  result.persistence = { exactReload: true, reviewFacts: durable.persistence.analysisFacts.length, skillStates: durable.persistence.skillStates.length };
  await page.goto(`${baseUrl}/training`, { waitUntil: 'networkidle' });
  await page.getByText(evidenceTask.title, { exact: true }).waitFor();

  const upload = page.getByRole('button', { name: /cloud/i });
  let firstRowId;
  let firstProfileHash;
  for (let retry = 0; retry < 2; retry += 1) {
    const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/rest/v1/user_progress');
    await upload.click();
    const response = await responsePromise;
    result.cloud.uploadStatuses.push(response.status());
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll('button')].find((item) => /cloud/i.test(item.textContent ?? ''));
      return Boolean(button && !button.disabled);
    });
    const readback = await admin.from('user_progress').select('id,profile_data').eq('user_id', userId);
    if (readback.error) throw readback.error;
    result.cloud.rowCounts.push(readback.data.length);
    assert.equal(readback.data.length, 1);
    assert.deepEqual(readback.data[0].profile_data, durable);
    if (retry === 0) {
      firstRowId = readback.data[0].id;
      firstProfileHash = hash(readback.data[0].profile_data);
    } else {
      result.cloud.sameRow = firstRowId === readback.data[0].id;
      result.cloud.sameProfile = firstProfileHash === hash(readback.data[0].profile_data);
    }
  }
  assert(result.cloud.sameRow && result.cloud.sameProfile);
  await page.screenshot({ path: `${output}/phase3-flow.png`, fullPage: true });
  assert(Object.values(result.errors).every((items) => items.length === 0), JSON.stringify(result.errors));
  result.verdict = 'PASS';
} catch (error) {
  result.failure = error instanceof Error ? error.stack : String(error);
  if (page && !page.isClosed()) {
    const raw = await page.evaluate(() => localStorage.getItem('vuaCoUserTrainingProfile')).catch(() => null);
    result.diagnostic = {
      url: page.url(),
      body: await page.locator('body').innerText().catch(() => null),
      attempt: raw ? JSON.parse(raw).persistence?.puzzleAttempts?.at(-1) ?? null : null,
      squares: await page.locator('[data-square="e6"], [data-square="f6"]').count().catch(() => -1),
    };
    await page.screenshot({ path: `${output}/phase3-flow-failure.png`, fullPage: true }).catch(() => {});
  }
} finally {
  if (browser) await browser.close();
  if (userId) {
    const deleted = await admin.from('user_progress').delete().eq('user_id', userId);
    result.cloud.cleanup.profile = !deleted.error;
    const remaining = await admin.from('user_progress').select('id').eq('user_id', userId);
    result.cloud.cleanup.rowsRemaining = remaining.data?.length ?? -1;
    const account = await admin.auth.admin.deleteUser(userId);
    result.cloud.cleanup.account = !account.error;
  }
  writeFileSync(`${output}/phase3-flow.json`, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));
if (result.verdict !== 'PASS' || !result.cloud.cleanup.profile || result.cloud.cleanup.rowsRemaining !== 0 || !result.cloud.cleanup.account) process.exitCode = 1;
