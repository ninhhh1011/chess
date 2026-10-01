import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const output = path.resolve('artifacts/tech-verification/PHASE_3/P3-T01');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
const errors = { console: [], page: [], network: [] };
page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', (error) => errors.page.push(error.message));
page.on('requestfailed', (request) => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });
await page.addInitScript(() => {
  if (!sessionStorage.getItem('__p3t01Initialized')) {
    localStorage.clear();
    sessionStorage.setItem('__p3t01Initialized', 'true');
  }
  localStorage.setItem('chess-app-onboarding', 'true');
  const NativeWorker = window.Worker;
  window.__p3t01Stockfish = { starts: [], ready: [], bestmoves: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      if (!String(url).includes('stockfish-worker.js')) return;
      window.__p3t01Stockfish.starts.push(String(url));
      this.addEventListener('message', (event) => {
        if (event.data?.type === 'ready') window.__p3t01Stockfish.ready.push(event.data);
        if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) {
          window.__p3t01Stockfish.bestmoves.push(event.data.data);
        }
      });
    }
  };
});

const profileKey = 'vuaCoUserTrainingProfile';
const readProfile = () => page.evaluate((key) => localStorage.getItem(key), profileKey);
const history = () => page.locator('button span').evaluateAll((spans) => spans
  .map((span) => span.textContent?.trim() || '').filter((value) => /^\d+\.\s+\S+/.test(value))
  .map((value) => value.replace(/^\d+\.\s+/, '')));

try {
  await page.goto(`${baseUrl}/training`, { waitUntil: 'networkidle' });
  await page.waitForFunction((key) => localStorage.getItem(key), profileKey);
  const beforeRaw = await readProfile();
  assert(beforeRaw);
  const before = JSON.parse(beforeRaw);
  assert.equal(before.schemaVersion, 'profile.v2');
  assert.match(before.profileId, /^profile:/);
  assert.equal(before.persistence.schemaVersion, 'learningPersistence.v1');
  assert.equal(before.persistence.profileId, before.profileId);
  assert.equal(before.persistence.sync.syncId, `sync:${before.profileId}`);
  assert.equal(before.persistence.sync.revision, before.revision);
  assert(before.dailyTrainingPlan.planId && before.dailyTrainingPlan.generatedAt && before.dailyTrainingPlan.updatedAt);

  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  async function clickSquare(square) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    assert(box, `Missing square ${square}`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  const replay = new Chess();
  for (const preferred of ['e2e4', 'g1f3', 'd2d3']) {
    const legal = replay.moves({ verbose: true });
    const move = legal.find((candidate) => `${candidate.from}${candidate.to}` === preferred)
      || legal.find((candidate) => !candidate.promotion);
    assert(move);
    const beforePlies = (await history()).length;
    await clickSquare(move.from);
    await clickSquare(move.to);
    await page.waitForFunction((count) => [...document.querySelectorAll('button span')]
      .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= count,
    beforePlies + 2, { timeout: 30000 });
    replay.reset();
    for (const san of await history()) replay.move(san);
  }
  const moves = await history();
  const worker = await page.evaluate(() => window.__p3t01Stockfish);
  assert(moves.length >= 6 && worker.starts.length && worker.ready.some(({ success }) => success) && worker.bestmoves.length >= 3);

  await page.reload({ waitUntil: 'networkidle' });
  await page.goto(`${baseUrl}/training`, { waitUntil: 'networkidle' });
  const afterRaw = await readProfile();
  assert.equal(afterRaw, beforeRaw, 'A read/reload changed persisted profile bytes');
  const after = JSON.parse(afterRaw);
  assert.equal(after.profileId, before.profileId);
  assert.equal(after.revision, before.revision);
  assert.equal(after.updatedAt, before.updatedAt);
  assert.equal(after.dailyTrainingPlan.planId, before.dailyTrainingPlan.planId);
  assert(!Object.values(errors).some((items) => items.length));
  await page.screenshot({ path: path.join(output, 'profile-after-reload.png'), fullPage: true });

  const result = {
    verdict: 'PASS', baseUrl,
    profile: {
      schemaVersion: after.schemaVersion, profileId: after.profileId, revision: after.revision,
      createdAt: after.createdAt, updatedAt: after.updatedAt, planId: after.dailyTrainingPlan.planId,
      persistenceSchema: after.persistence.schemaVersion, syncId: after.persistence.sync.syncId,
      bytesStableAcrossReadReload: afterRaw === beforeRaw,
    },
    selfPlay: { plies: moves.length, moves, finalFen: replay.fen(), engineSource: 'stockfish_wasm', worker },
    errors,
  };
  await writeFile(path.join(output, 'self-play.json'), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await context.close();
  await browser.close();
}
