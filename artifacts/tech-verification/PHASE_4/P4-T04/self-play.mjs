import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4175';
const output = 'artifacts/tech-verification/PHASE_4/P4-T04';
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
const email = `codex-p4-t04-${stamp}@example.invalid`;
const password = `Codex-${stamp}-Aa1!`;
const result = {
  checkedAt: new Date().toISOString(), verdict: 'FAIL', production: false,
  accountCreated: false, game: {}, engine: {}, trust: {}, persistence: {},
  cleanup: {}, errors: { console: [], page: [], network: [], http: [] },
};
let browser;
let page;
let userId;

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
    if (!sessionStorage.getItem('__p4t04Initialized')) {
      localStorage.clear();
      sessionStorage.setItem('__p4t04Initialized', 'true');
    }
    localStorage.setItem('chess-app-onboarding', 'true');
    const NativeWorker = window.Worker;
    window.__p4t04Engine = { currentFen: null, searches: [] };
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.__stockfish = String(url).includes('stockfish-worker.js');
        if (!this.__stockfish) return;
        this.addEventListener('message', (event) => {
          const line = event.data?.type === 'output' ? event.data.data : null;
          if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
          const search = window.__p4t04Engine.searches.findLast((item) => !item.bestmove);
          if (search) search.bestmove = line.split(/\s+/)[1];
        });
      }
      postMessage(message, ...rest) {
        if (this.__stockfish && typeof message === 'string') {
          if (message.startsWith('position fen ')) window.__p4t04Engine.currentFen = message.slice(13);
          if (message.startsWith('go ')) window.__p4t04Engine.searches.push({
            fen: window.__p4t04Engine.currentFen, command: message, bestmove: null,
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

  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /N.ng cao/ }).click();
  await page.getByRole('button', { name: /Tr.ng.*tr..c/ }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  while ((await history()).length < 12) {
    const moves = await history();
    const game = new Chess();
    moves.forEach((san) => game.move(san));
    if (game.turn() === 'w') {
      const move = chooseWeakMove(game);
      await dragMove(move.from, move.to);
      await waitForPly(moves.length + 1);
    }
    if ((await history()).length < 12) await waitForPly(moves.length + 2);
  }
  const played = await history();
  const replay = new Chess();
  played.forEach((san) => replay.move(san));
  result.game = { plies: played.length, legal: true, finalFen: replay.fen() };

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
  const afterReviewRaw = await rawProfile();
  const afterReview = JSON.parse(afterReviewRaw);
  const trustedFact = afterReview.persistence.analysisFacts.find((fact) => `${fact.gameId}:ply:${fact.ply}` === selected.id);
  assert(trustedFact, 'Selected evidence is not persisted');
  assert.equal(trustedFact.engine.source, 'stockfish_wasm');
  assert.equal(selected.source, trustedFact.engine.source);
  assert.equal(selected.playedUci, trustedFact.playedMove.uci);
  assert.equal(selected.bestUci, trustedFact.bestMove.uci);
  const review = afterReview.persistence.gameReviews.find((item) => item.gameId === trustedFact.gameId);
  assert(review?.factIds.includes(selected.id), 'Game review does not reference the selected trusted fact');
  const searches = await page.evaluate(() => window.__p4t04Engine.searches);
  assert(searches.length >= played.length, 'Review did not run a real Stockfish search for every ply');
  assert(searches.every((search) => search.fen && search.bestmove), 'Stockfish search trace is incomplete');
  result.engine = { searches: searches.length, completed: searches.filter((item) => item.bestmove).length };

  await evidence.evaluate((node) => {
    node.dataset.playedUci = 'h1h8';
    node.dataset.bestUci = 'a1a8';
    node.dataset.engineSource = 'forged_dom';
  });
  await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile'));
    profile.persistence.gameReviews = [];
    localStorage.setItem('vuaCoUserTrainingProfile', JSON.stringify(profile));
  });
  await page.getByRole('button', { name: /Hu.n luy.n/i }).click();
  assert.equal(await page.getByRole('button', { name: /Qu.n s.*v.n n.y/i }).count(), 0,
    'Coach remained available without an owning persisted game review');
  await page.evaluate((raw) => localStorage.setItem('vuaCoUserTrainingProfile', raw), afterReviewRaw);
  await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
  await page.getByRole('button', { name: /Hu.n luy.n/i }).click();
  await page.getByRole('button', { name: /Qu.n s.*v.n n.y/i }).click();
  const hintText = await page.getByText(/N..c g.i .:/i).innerText();
  assert(hintText.includes(trustedFact.bestMove.san), `Coach hint does not match trusted fact: ${hintText}`);
  assert(!hintText.includes('a1a8') && !hintText.includes('h1h8'), 'Coach trusted forged DOM metadata');
  result.trust = {
    evidenceId: selected.id, source: trustedFact.engine.source,
    playedSan: trustedFact.playedMove.san, bestSan: trustedFact.bestMove.san,
    reviewId: review.reviewId, reviewReferencesFact: true,
    missingReviewRejected: true, forgedDomIgnored: true, coachGrounded: true,
  };
  await page.screenshot({ path: `${output}/self-play.png`, fullPage: true });

  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await rawProfile(), afterReviewRaw, 'Reload changed durable trusted facts');
  result.persistence = {
    exactReload: true,
    factCount: afterReview.persistence.analysisFacts.length,
    reviewCount: afterReview.persistence.gameReviews.length,
  };
  assert(Object.values(result.errors).every((items) => items.length === 0), JSON.stringify(result.errors));
  result.verdict = 'PASS';
} catch (error) {
  result.failure = error instanceof Error ? error.stack : String(error);
  if (page && !page.isClosed()) {
    result.diagnostic = { url: page.url(), body: await page.locator('body').innerText().catch(() => null) };
    await page.screenshot({ path: `${output}/self-play-failure.png`, fullPage: true }).catch(() => {});
  }
} finally {
  if (browser) await browser.close();
  if (userId) {
    const deleted = await admin.from('user_progress').delete().eq('user_id', userId);
    result.cleanup.profile = !deleted.error;
    const remaining = await admin.from('user_progress').select('id').eq('user_id', userId);
    result.cleanup.rowsRemaining = remaining.data?.length ?? -1;
    const account = await admin.auth.admin.deleteUser(userId);
    result.cleanup.account = !account.error;
  }
  writeFileSync(`${output}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));
if (result.verdict !== 'PASS' || !result.cleanup.profile || result.cleanup.rowsRemaining !== 0 || !result.cleanup.account) process.exitCode = 1;
