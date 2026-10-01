import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4174';
const output = path.resolve('artifacts/tech-verification/PHASE_3/P3-T02/verifier');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = { console: [], page: [], network: [] };
page.on('console', (message) => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', (error) => errors.page.push(error.message));
page.on('requestfailed', (request) => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });

await page.addInitScript(() => {
  if (!sessionStorage.getItem('__p3t02Initialized')) {
    localStorage.clear();
    sessionStorage.setItem('__p3t02Initialized', 'true');
  }
  localStorage.setItem('chess-app-onboarding', 'true');
  const NativeWorker = window.Worker;
  window.__p3t02Engine = { currentFen: null, searches: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('stockfish-worker.js');
      if (!this.__stockfish) return;
      this.addEventListener('message', (event) => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
        const search = window.__p3t02Engine.searches.findLast((item) => !item.bestmove);
        if (search) search.bestmove = line.split(/\s+/)[1];
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        if (message.startsWith('position fen ')) window.__p3t02Engine.currentFen = message.slice(13);
        if (message.startsWith('go ')) {
          window.__p3t02Engine.searches.push({
            fen: window.__p3t02Engine.currentFen,
            command: message,
            bestmove: null,
            source: 'stockfish_wasm',
          });
        }
      }
      return super.postMessage(message, ...rest);
    }
  };
});

const history = () => page.locator('button span').evaluateAll((spans) => spans
  .map((span) => span.textContent?.trim() || '')
  .filter((value) => /^\d+\.\s+\S+/.test(value))
  .map((value) => value.replace(/^\d+\.\s+/, '')));

async function clickMove(move) {
  for (const square of [move.from, move.to]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    assert(box, `Missing square ${square}`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

function chooseBadMove(game) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const scored = game.moves({ verbose: true }).map((move) => {
    const next = new Chess(game.fen());
    next.move(move);
    const exposed = Math.max(0, ...next.moves({ verbose: true })
      .filter((reply) => reply.isCapture())
      .map((reply) => values[reply.captured] || 0));
    return { move, exposed };
  }).sort((a, b) => b.exposed - a.exposed);
  return scored[0].exposed > 0 ? scored[0].move : scored.find(({ move }) => move.piece === 'q')?.move || scored[0].move;
}

async function waitForPly(count) {
  await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30000 });
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /N.ng cao/ }).click();
  await page.getByRole('button', { name: /Tr.ng.*tr..c/ }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  while ((await history()).length < 14) {
    const moves = await history();
    const replay = new Chess();
    moves.forEach((san) => replay.move(san));
    if (replay.turn() === 'w') {
      await clickMove(chooseBadMove(replay));
      await waitForPly(moves.length + 1);
    }
    if ((await history()).length < 14) await waitForPly(moves.length + 2);
  }

  const played = await history();
  const replay = new Chess();
  const positions = [];
  played.forEach((san) => { positions.push(replay.fen()); replay.move(san); });
  const searchStart = await page.evaluate(() => window.__p3t02Engine.searches.length);

  await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
  await page.getByRole('button', { name: /M. v.n c./i }).click();
  await page.getByRole('button', { name: /.*ang m. v.n/ }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /M. v.n c./i }).waitFor({ state: 'visible', timeout: 120000 });

  const evidence = page.locator('[data-evidence-id]').first();
  await evidence.waitFor({ state: 'visible' });
  const selected = await evidence.evaluate((element) => ({
    evidenceId: element.getAttribute('data-evidence-id'),
    engineSource: element.getAttribute('data-engine-source'),
    skillTags: element.getAttribute('data-skill-tags'),
    turn: element.getAttribute('data-turn'),
    centipawnLoss: element.getAttribute('data-centipawn-loss'),
    classification: element.getAttribute('data-classification'),
    evalBefore: element.getAttribute('data-eval-before'),
    evalAfter: element.getAttribute('data-eval-after'),
    playedUci: element.getAttribute('data-played-uci'),
    bestUci: element.getAttribute('data-best-uci'),
    text: element.textContent?.trim(),
  }));
  await evidence.click();

  const match = selected.evidenceId?.match(/^(game:[0-9a-f-]+):ply:(\d+)$/i);
  assert(match, `Invalid evidence identity: ${selected.evidenceId}`);
  const [, gameId, plyText] = match;
  const ply = Number(plyText);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile') || 'null'));
  const review = profile.persistence.gameReviews.find((item) => item.factIds.includes(selected.evidenceId));
  const fact = profile.persistence.analysisFacts.find((item) => `${item.gameId}:ply:${item.ply}` === selected.evidenceId);
  assert(review && fact, 'Selected evidence did not resolve through persisted review and fact records');
  assert.equal(review.gameId, gameId);
  assert.equal(fact.gameId, gameId);
  assert.equal(fact.ply, ply);
  assert.equal(fact.engine.source, 'stockfish_wasm');
  assert.equal(selected.engineSource, fact.engine.source);
  assert.equal(fact.playedMove.uci, selected.playedUci);
  assert.equal(fact.bestMove.uci, selected.bestUci);
  assert.equal(fact.turn, selected.turn);
  assert.equal(String(fact.centipawnLoss), selected.centipawnLoss);
  assert.equal(fact.classification, selected.classification);
  assert.equal(`${fact.evalBefore.type}:${fact.evalBefore.value}`, selected.evalBefore);
  assert.equal(`${fact.evalAfter.type}:${fact.evalAfter.value}`, selected.evalAfter);
  assert.equal(fact.skillTags.join(','), selected.skillTags);
  assert(fact.candidates.length > 0 && fact.candidates.every((candidate) => candidate.pv.length > 0));
  assert.equal(new Date(fact.analyzedAt).toISOString(), fact.analyzedAt);
  assert.match(review.reviewId, /^review:/);
  assert.equal(new Date(review.createdAt).toISOString(), review.createdAt);

  const searches = await page.evaluate((start) => window.__p3t02Engine.searches.slice(start), searchStart);
  const selectedSearches = searches.filter((search) => search.fen === positions[ply - 1]);
  assert(selectedSearches.some((search) => search.bestmove === fact.bestMove.uci), 'Persisted best move lacks matching Stockfish search');
  assert(!Object.values(errors).some((items) => items.length), JSON.stringify(errors));
  await page.screenshot({ path: path.join(output, 'selected-persisted-fact.png'), fullPage: true });

  const result = {
    verdict: 'PASS', baseUrl, playedPlies: played.length, played, finalFen: replay.fen(), selected,
    trace: {
      profileId: profile.profileId, reviewId: review.reviewId, gameId, evidenceId: selected.evidenceId,
      ply, engineSource: fact.engine.source, analyzedAt: fact.analyzedAt,
    },
    review, fact, selectedStockfishSearches: selectedSearches, errors,
  };
  await writeFile(path.join(output, 'self-play.json'), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await context.close();
  await browser.close();
}
