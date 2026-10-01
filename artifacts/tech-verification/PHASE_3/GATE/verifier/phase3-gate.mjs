import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { Chess } from 'chess.js';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4175';
const out = 'artifacts/tech-verification/PHASE_3/GATE/verifier';
const storageKey = 'vuaCoUserTrainingProfile';
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
    }),
);
const cloudUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
assert(cloudUrl && serviceKey, 'Live Supabase configuration is required');

const admin = createClient(cloudUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = randomUUID();
const email = `codex-phase3-verifier-${runId}@example.invalid`;
const password = `Codex-${runId}-Aa1!`;
const digest = (value) => createHash('sha256').update(value).digest('hex');
const result = {
  checkedAt: new Date().toISOString(),
  verdict: 'FAIL',
  production: {},
  initialPlan: {},
  game: {},
  review: {},
  coach: {},
  puzzle: {},
  skills: {},
  finalPlan: {},
  persistence: {},
  cloud: { statuses: [], rowCounts: [], rowHashes: [], profileHashes: [], cleanup: {} },
  runtime: { pageErrors: [], consoleErrors: [], failedRequests: [], unexpectedHttp: [] },
};
let browser;
let page;
let userId;

const readProfile = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
const readRawProfile = () => page.evaluate((key) => localStorage.getItem(key), storageKey);
const moveList = () => page.locator('button span').evaluateAll((nodes) => nodes
  .map((node) => node.textContent?.trim() ?? '')
  .filter((text) => /^\d+\.\s+\S+/.test(text))
  .map((text) => text.replace(/^\d+\.\s+/, '')));
const waitForPlies = (count) => page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
  .filter((node) => /^\d+\.\s+\S+/.test(node.textContent?.trim() ?? '')).length >= expected, count, { timeout: 30_000 });
const drag = async (from, to) => {
  const source = await page.locator(`[data-square="${from}"]`).boundingBox();
  const target = await page.locator(`[data-square="${to}"]`).boundingBox();
  assert(source && target, `Missing board squares for ${from}${to}`);
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  await page.mouse.up();
};
const exposedMove = (game) => {
  const pieceValue = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const ranked = game.moves({ verbose: true }).map((move) => {
    const next = new Chess(game.fen());
    next.move(move);
    const exposure = next.moves({ verbose: true })
      .filter((reply) => reply.isCapture())
      .reduce((max, reply) => Math.max(max, pieceValue[reply.captured] ?? 0), 0);
    return { move, exposure };
  });
  ranked.sort((a, b) => b.exposure - a.exposure || a.move.san.localeCompare(b.move.san));
  return ranked[0].move;
};

try {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error('Disposable user creation failed');
  userId = created.data.user.id;
  result.cloud.accountCreated = true;
  result.cloud.userHash = digest(userId);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  page = await context.newPage();
  page.on('pageerror', (error) => result.runtime.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') result.runtime.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    result.runtime.failedRequests.push({ method: request.method(), hostname: url.hostname, path: url.pathname, error: request.failure()?.errorText ?? null });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      const url = new URL(response.url());
      result.runtime.unexpectedHttp.push({ method: response.request().method(), hostname: url.hostname, path: url.pathname, status: response.status() });
    }
  });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__p3IndependentGate')) {
      localStorage.clear();
      sessionStorage.setItem('__p3IndependentGate', 'ready');
    }
    localStorage.setItem('chess-app-onboarding', 'true');
    const NativeWorker = window.Worker;
    window.__p3VerifierEngine = { fen: null, searches: [] };
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.stockfishVerifier = String(url).includes('stockfish-worker.js');
        if (this.stockfishVerifier) this.addEventListener('message', (event) => {
          const line = event.data?.type === 'output' ? event.data.data : null;
          if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
          const pending = window.__p3VerifierEngine.searches.findLast((search) => !search.bestmove);
          if (pending) pending.bestmove = line.split(/\s+/)[1];
        });
      }
      postMessage(message, ...args) {
        if (this.stockfishVerifier && typeof message === 'string') {
          if (message.startsWith('position fen ')) window.__p3VerifierEngine.fen = message.slice(13);
          if (message.startsWith('go ')) window.__p3VerifierEngine.searches.push({ fen: window.__p3VerifierEngine.fen, go: message, bestmove: null });
        }
        return super.postMessage(message, ...args);
      }
    };
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  const scriptSources = await page.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => node.src));
  assert(scriptSources.some((src) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.js$/.test(src)), 'No hashed production asset found');
  assert(scriptSources.every((src) => !src.includes('/src/')), 'Development source asset detected');
  result.production = { hashedAssets: true, scripts: scriptSources.length };

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/training', { timeout: 20_000 });
  const clean = await readProfile();
  assert.equal(clean.schemaVersion, 'profile.v2');
  assert(clean.dailyTrainingPlan.tasks.length > 0, 'Clean profile has no daily tasks');
  result.initialPlan = { id: clean.dailyTrainingPlan.planId, tasks: clean.dailyTrainingPlan.tasks.length };

  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /N.ng cao/i }).click();
  await page.getByRole('button', { name: /Tr.ng.*tr..c/i }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/i, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  while ((await moveList()).length < 12) {
    const sans = await moveList();
    const game = new Chess();
    sans.forEach((san) => game.move(san));
    if (game.turn() === 'w') {
      const move = exposedMove(game);
      await drag(move.from, move.to);
      await waitForPlies(sans.length + 1);
    }
    if ((await moveList()).length < 12) await waitForPlies(sans.length + 2);
  }
  const sans = await moveList();
  const replay = new Chess();
  sans.forEach((san) => replay.move(san));
  const engineTrace = await page.evaluate(() => window.__p3VerifierEngine.searches);
  assert(engineTrace.filter((search) => search.bestmove).length >= 6, 'Real Stockfish bestmove trace is incomplete');
  result.game = { plies: sans.length, legalReplay: true, finalFen: replay.fen(), stockfishBestmoves: engineTrace.filter((search) => search.bestmove).length };

  await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
  await page.getByRole('button', { name: /M. v.n c./i }).click();
  const evidenceNodes = page.locator('[data-evidence-id]');
  await evidenceNodes.first().waitFor({ state: 'visible', timeout: 180_000 });
  const evidenceItems = await evidenceNodes.evaluateAll((nodes) => nodes.map((node, index) => ({
    index,
    id: node.dataset.evidenceId,
    source: node.dataset.engineSource,
    playedUci: node.dataset.playedUci,
    bestUci: node.dataset.bestUci,
  })));
  const selected = evidenceItems.find((item) => item.playedUci && item.bestUci && item.playedUci !== item.bestUci) ?? evidenceItems[0];
  assert(selected?.id, 'Review did not expose selectable evidence');
  await evidenceNodes.nth(selected.index).click();
  await page.waitForFunction(({ key, id }) => {
    const profile = JSON.parse(localStorage.getItem(key));
    return profile.persistence.analysisFacts.some((fact) => `${fact.gameId}:ply:${fact.ply}` === id);
  }, { key: storageKey, id: selected.id });
  const reviewed = await readProfile();
  const fact = reviewed.persistence.analysisFacts.find((item) => `${item.gameId}:ply:${item.ply}` === selected.id);
  assert(fact && fact.engine.source === 'stockfish_wasm', 'Selected fact is not trusted Stockfish evidence');
  assert(reviewed.persistence.gameReviews.some((review) => review.gameId === fact.gameId && review.factIds.includes(selected.id)));
  result.review = {
    evidenceId: selected.id,
    ply: fact.ply,
    playedSan: fact.playedMove.san,
    bestSan: fact.bestMove.san,
    classification: fact.classification,
    engineSource: fact.engine.source,
  };

  await page.getByRole('button', { name: /Hu.n luy.n/i }).click();
  const coachButton = page.getByRole('button', { name: /Qu.n s.*v.n n.y/i });
  await coachButton.click();
  const coachRegion = coachButton.locator('xpath=..');
  await coachRegion.getByText(/N..c g.i .:/i).waitFor({ state: 'visible' });
  const coachText = await coachRegion.innerText();
  assert(coachText.includes(fact.bestMove.san), 'Coach hint is not grounded in the selected fact');
  assert(coachText.includes(fact.engine.source), 'Focused Coach context omits the trusted engine source');
  assert(coachText.includes(fact.classification), 'Focused Coach context omits the fact classification');
  result.coach = { evidenceId: selected.id, groundedBestMove: fact.bestMove.san, explanationVisible: coachText.length > 40 };

  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  await page.getByText('Lichess puzzle 00008').waitFor({ timeout: 30_000 });
  const beforePuzzle = await readProfile();
  await drag('e6', 'f6');
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).persistence.puzzleAttempts.at(-1)?.events.at(-1)?.type === 'wrong', storageKey);
  await page.getByRole('button', { name: /L.m l.i/i }).click();
  await page.waitForFunction((key) => {
    const events = JSON.parse(localStorage.getItem(key)).persistence.puzzleAttempts.at(-1)?.events;
    return events?.length === 2 && events.at(-1).type === 'retry';
  }, storageKey);
  await page.waitForTimeout(300);
  await drag('e6', 'e7');
  await page.getByText(/ti.p t.c/i).waitFor();
  await drag('b3', 'c1');
  await page.getByText(/ti.p t.c/i).waitFor();
  await drag('h6', 'c1');
  await page.getByText(/^Ch.nh x.c!/i).waitFor();
  await page.waitForTimeout(250);

  const durableRaw = await readRawProfile();
  const durable = JSON.parse(durableRaw);
  const attempt = durable.persistence.puzzleAttempts.at(-1);
  assert.equal(attempt.puzzleId, 'lichess-00008');
  assert.deepEqual(attempt.events.map((event) => event.type), ['wrong', 'retry', 'correct', 'correct', 'correct']);
  assert.equal(new Set(attempt.events.map((event) => event.eventId)).size, 5);
  assert.equal(attempt.status, 'solved');
  result.puzzle = { id: attempt.puzzleId, sourcePuzzleId: attempt.sourcePuzzleId, attemptHash: digest(attempt.attemptId), events: attempt.events.map((event) => event.type), uniqueEvents: true };

  const factEvidence = new Map(durable.persistence.analysisFacts.map((item) => [`${item.gameId}:ply:${item.ply}`, item]));
  const eventOwners = new Map(durable.persistence.puzzleAttempts.flatMap((item) => item.events.map((event) => [event.eventId, item])));
  for (const skill of durable.persistence.skillStates) {
    for (const evidenceId of skill.evidenceIds) {
      const factOwner = factEvidence.get(evidenceId);
      const attemptOwner = eventOwners.get(evidenceId);
      assert(Number(Boolean(factOwner)) + Number(Boolean(attemptOwner)) === 1, `Evidence ${evidenceId} does not resolve uniquely`);
      if (factOwner) assert(factOwner.skillTags.includes(skill.skillId));
      if (attemptOwner) assert(attemptOwner.skillTags.includes(skill.skillId));
    }
  }
  result.skills = { states: durable.persistence.skillStates.length, evidenceIds: durable.persistence.skillStates.reduce((count, skill) => count + skill.evidenceIds.length, 0), allResolveUniquely: true };

  assert.notEqual(durable.dailyTrainingPlan.planId, beforePuzzle.dailyTrainingPlan.planId);
  const evidenceTask = durable.dailyTrainingPlan.tasks.find((task) => task.evidenceIds?.length > 0);
  assert(evidenceTask, 'Final daily plan has no evidence-backed task');
  const matchingSkill = durable.persistence.skillStates.find((skill) => skill.skillId === evidenceTask.skillTag);
  assert(matchingSkill && evidenceTask.evidenceIds.every((id) => matchingSkill.evidenceIds.includes(id)));
  assert.equal(durable.persistence.trainingPlans.filter((plan) => plan.planId === durable.dailyTrainingPlan.planId).length, 1);
  result.finalPlan = { id: durable.dailyTrainingPlan.planId, changed: durable.dailyTrainingPlan.planId !== result.initialPlan.id, taskId: evidenceTask.id, skillTag: evidenceTask.skillTag, evidenceCount: evidenceTask.evidenceIds.length, uniqueInHistory: true };

  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await readRawProfile(), durableRaw, 'Production reload changed persisted profile bytes');
  result.persistence = { byteExactReload: true, rawSha256: digest(durableRaw), revision: durable.revision, profileIdHash: digest(durable.profileId) };
  await page.goto(`${baseUrl}/training`, { waitUntil: 'networkidle' });
  await page.getByText(evidenceTask.title, { exact: true }).waitFor();

  const upload = page.getByRole('button', { name: /cloud/i });
  for (let retry = 0; retry < 2; retry += 1) {
    const responsePromise = page.waitForResponse((response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/rest/v1/user_progress');
    await upload.click();
    const response = await responsePromise;
    result.cloud.statuses.push(response.status());
    await page.waitForFunction(() => [...document.querySelectorAll('button')]
      .some((button) => /cloud/i.test(button.textContent ?? '') && !button.disabled));
    const readback = await admin.from('user_progress').select('id,profile_data').eq('user_id', userId);
    if (readback.error) throw readback.error;
    result.cloud.rowCounts.push(readback.data.length);
    assert.equal(readback.data.length, 1);
    assert.deepEqual(readback.data[0].profile_data, durable);
    result.cloud.rowHashes.push(digest(readback.data[0].id));
    result.cloud.profileHashes.push(digest(JSON.stringify(readback.data[0].profile_data)));
  }
  assert.deepEqual(result.cloud.statuses, [201, 200]);
  assert.deepEqual(result.cloud.rowCounts, [1, 1]);
  assert.equal(new Set(result.cloud.rowHashes).size, 1);
  assert.equal(new Set(result.cloud.profileHashes).size, 1);
  result.cloud.sameRow = true;
  result.cloud.sameProfile = true;

  await page.screenshot({ path: `${out}/phase3-gate.png`, fullPage: true });
  assert(Object.values(result.runtime).every((items) => items.length === 0), JSON.stringify(result.runtime));
  result.verdict = 'PASS';
} catch (error) {
  result.failure = error instanceof Error ? error.stack : String(error);
  if (page && !page.isClosed()) {
    result.failureContext = {
      url: page.url(),
      profileAvailable: Boolean(await readRawProfile().catch(() => null)),
    };
    await page.screenshot({ path: `${out}/phase3-gate-failure.png`, fullPage: true }).catch(() => {});
  }
} finally {
  if (browser) await browser.close();
  if (userId) {
    const eventsDelete = await admin.from('training_events').delete().eq('user_id', userId);
    result.cloud.cleanup.eventsDelete = !eventsDelete.error;
    const rowDelete = await admin.from('user_progress').delete().eq('user_id', userId);
    result.cloud.cleanup.rowDelete = !rowDelete.error;
    const rows = await admin.from('user_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    result.cloud.cleanup.rowsRemaining = rows.error ? null : (rows.count ?? 0);
    const userDelete = await admin.auth.admin.deleteUser(userId);
    result.cloud.cleanup.accountDelete = !userDelete.error;
    const lookup = await admin.auth.admin.getUserById(userId);
    result.cloud.cleanup.accountAbsent = Boolean(lookup.error || !lookup.data.user);
  }
  writeFileSync(`${out}/phase3-gate.json`, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify(result, null, 2));
const cleanupPass = result.cloud.cleanup.eventsDelete
  && result.cloud.cleanup.rowDelete
  && result.cloud.cleanup.rowsRemaining === 0
  && result.cloud.cleanup.accountDelete
  && result.cloud.cleanup.accountAbsent;
if (result.verdict !== 'PASS' || !cleanupPass) process.exitCode = 1;
