import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.P1_T01_BASE_URL || 'http://127.0.0.1:4181';
const mode = process.env.P1_T01_MODE || 'full';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T01/verifier';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const browserErrors = { console: [], page: [], network: [] };
const assetResponses = [];

function observe(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.console.push(`${label}: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserErrors.page.push(`${label}: ${error.message}`));
  page.on('requestfailed', (request) => {
    browserErrors.network.push(`${label}: ${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    if (/stockfish(?:-worker)?(?:\.js|\.wasm)/.test(response.url())) {
      assetResponses.push({ label, status: response.status(), url: response.url() });
    }
    if (response.status() >= 400) browserErrors.network.push(`${label}: ${response.status()} ${response.url()}`);
  });
}

function trackingScript({ delayFirstInit = false } = {}) {
  return ({ delayFirstInit }) => {
    const NativeWorker = window.Worker;
    window.__workerAudit = { created: [], terminated: [], sent: [], ready: [], searches: [] };
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.__auditId = window.__workerAudit.created.length + 1;
        this.__isOuterStockfish = String(url).includes('/stockfish-worker.js');
        if (this.__isOuterStockfish) {
          window.__workerAudit.created.push({ id: this.__auditId, url: String(url) });
          this.addEventListener('message', (event) => {
            if (event.data?.type === 'ready') window.__workerAudit.ready.push({ id: this.__auditId, ...event.data });
            if (event.data?.type !== 'output' || typeof event.data.data !== 'string') return;
            const search = window.__workerAudit.searches.findLast((entry) => entry.id === this.__auditId && !entry.bestmove);
            if (!search) return;
            const depth = event.data.data.match(/\bdepth (\d+)/);
            const time = event.data.data.match(/\btime (\d+)/);
            if (depth) search.depth = Math.max(search.depth, Number(depth[1]));
            if (time) search.engineTimeMs = Number(time[1]);
            if (event.data.data.startsWith('bestmove')) {
              search.bestmove = event.data.data.split(/\s+/)[1];
              search.wallTimeMs = Math.round(performance.now() - search.startedAt);
            }
          });
        }
      }

      postMessage(message, ...rest) {
        if (this.__isOuterStockfish) {
          window.__workerAudit.sent.push({ id: this.__auditId, message, at: performance.now() });
          if (typeof message === 'string' && message.startsWith('go ')) {
            window.__workerAudit.searches.push({
              id: this.__auditId,
              command: message,
              startedAt: performance.now(),
              depth: 0,
              engineTimeMs: null,
              wallTimeMs: null,
              bestmove: null,
            });
          }
          if (delayFirstInit && this.__auditId === 1 && message === 'init') {
            setTimeout(() => super.postMessage(message, ...rest), 15000);
            return;
          }
        }
        return super.postMessage(message, ...rest);
      }

      terminate() {
        if (this.__isOuterStockfish) window.__workerAudit.terminated.push(this.__auditId);
        return super.terminate();
      }
    };
  };
}

async function activeLifecycle() {
  const page = await browser.newPage();
  observe(page, 'active-lifecycle');
  await page.addInitScript(trackingScript(), { delayFirstInit: false });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const outcome = await page.evaluate(async () => {
    const engine = await import('/src/services/stockfishService.ts');
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    engine.disposeEngine();
    const warmup = await engine.analyzeFen({ fen, depth: 4, movetime: 100, purpose: 'verification' });
    const active = engine.analyzeFen({ fen, depth: 18, movetime: 5000, purpose: 'verification' });
    while (!window.__workerAudit.sent.some(({ message }) => message === 'go movetime 5000')) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const activeWorkerId = window.__workerAudit.created.at(-1).id;
    engine.disposeEngine();
    const disposed = await Promise.race([
      active.then((result) => ({ settled: true, result }), (error) => ({ settled: true, error: error.message })),
      new Promise((resolve) => setTimeout(() => resolve({ settled: false }), 1000)),
    ]);
    const restarted = await engine.analyzeFen({ fen, depth: 4, movetime: 100, purpose: 'verification' });
    return { warmup, disposed, restarted, activeWorkerId, state: engine.getEngineState(), ready: engine.isEngineReady(), audit: window.__workerAudit };
  });
  await page.close();
  const game = new Chess(outcome.restarted.fen);
  const legal = Boolean(game.move({ from: outcome.restarted.bestMove.slice(0, 2), to: outcome.restarted.bestMove.slice(2, 4), promotion: outcome.restarted.bestMove[4] }));
  return {
    ...outcome,
    restartedMoveLegal: legal,
    pass: outcome.disposed.settled
      && outcome.warmup.source === 'stockfish_wasm'
      && outcome.restarted.source === 'stockfish_wasm'
      && legal
      && outcome.audit.terminated.includes(outcome.activeWorkerId)
      && outcome.ready,
  };
}

async function coldInitLifecycle() {
  const page = await browser.newPage();
  observe(page, 'cold-init');
  await page.addInitScript(trackingScript({ delayFirstInit: true }), { delayFirstInit: true });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const outcome = await page.evaluate(async () => {
    const engine = await import('/src/services/stockfishService.ts');
    engine.disposeEngine();
    const firstStartedAt = performance.now();
    const firstInit = engine.initEngine();
    while (engine.getEngineState() !== 'loading') await new Promise((resolve) => setTimeout(resolve, 1));
    const firstWorkerId = window.__workerAudit.created.at(-1).id;
    engine.disposeEngine();
    const firstPrompt = await Promise.race([
      firstInit.then((value) => ({ settled: true, value, elapsedMs: Math.round(performance.now() - firstStartedAt) })),
      new Promise((resolve) => setTimeout(() => resolve({ settled: false, elapsedMs: Math.round(performance.now() - firstStartedAt) }), 500)),
    ]);
    const secondInit = await Promise.race([
      engine.initEngine().then((value) => ({ settled: true, value })),
      new Promise((resolve) => setTimeout(() => resolve({ settled: false }), 5000)),
    ]);
    const secondWorkerId = window.__workerAudit.created.at(-1).id;
    const firstFinal = await firstInit.then((value) => ({ value, elapsedMs: Math.round(performance.now() - firstStartedAt) }));
    await new Promise((resolve) => setTimeout(resolve, 10500));
    return {
      firstWorkerId,
      secondWorkerId,
      firstPrompt,
      firstFinal,
      secondInit,
      finalState: engine.getEngineState(),
      finalReady: engine.isEngineReady(),
      audit: window.__workerAudit,
    };
  });
  await page.close();
  return {
    ...outcome,
    pass: outcome.firstPrompt.settled
      && outcome.firstPrompt.value === false
      && outcome.secondInit.settled
      && outcome.secondInit.value === true
      && outcome.finalState === 'ready'
      && outcome.finalReady
      && !outcome.audit.terminated.includes(outcome.secondWorkerId),
  };
}

function history(page) {
  return page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '')
    .filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
}

async function waitForPlies(page, count) {
  await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected, count, { timeout: 30000 });
}

async function clickMove(page, move) {
  for (const square of [move.from, move.to]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    if (!box) throw new Error(`Missing square ${square}`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

async function selfPlay(color) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  observe(page, `self-play-${color}`);
  await page.addInitScript(trackingScript(), { delayFirstInit: false });
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skip.isVisible({ timeout: 500 }).catch(() => false)) await skip.click();
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: color === 'w' ? /^Trắng -/ : /^Đen -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Ván đấu', exact: true }).click();
  if (color === 'b') await waitForPlies(page, 1);

  while ((await history(page)).length < 10) {
    const moves = await history(page);
    const replay = new Chess();
    for (const san of moves) replay.move(san);
    if (replay.isGameOver()) throw new Error(`${color} game ended before 10 plies`);
    if (replay.turn() !== color) {
      await waitForPlies(page, moves.length + 1);
      continue;
    }
    const move = replay.moves({ verbose: true }).find((candidate) => !candidate.isCapture() && !candidate.promotion)
      || replay.moves({ verbose: true }).find((candidate) => !candidate.promotion)
      || replay.moves({ verbose: true })[0];
    const before = moves.length;
    await clickMove(page, move);
    await waitForPlies(page, before + 1);
    if (before + 1 < 10) await waitForPlies(page, before + 2);
  }

  const sanMoves = await history(page);
  const replay = new Chess();
  for (const san of sanMoves) replay.move(san);
  await page.screenshot({ path: `${outputDir}/self-play-${color}.png`, fullPage: true });
  const audit = await page.evaluate(() => window.__workerAudit);
  await page.close();
  const completed = audit.searches.filter((search) => search.bestmove && search.depth > 0 && search.wallTimeMs !== null);
  return {
    color,
    plies: sanMoves.length,
    sanMoves,
    finalFen: replay.fen(),
    pgn: replay.pgn(),
    pgnReplay: true,
    workerUrls: audit.created.map(({ url }) => url),
    ready: audit.ready,
    searches: completed,
    pass: sanMoves.length >= 10
      && audit.created.some(({ url }) => url.includes('/stockfish-worker.js'))
      && audit.ready.some(({ success }) => success)
      && completed.length >= 5,
  };
}

let result;
try {
  if (mode === 'preview-self-play') {
    const white = await selfPlay('w');
    const black = await selfPlay('b');
    result = {
      verdict: white.pass && black.pass && !browserErrors.console.length && !browserErrors.page.length && !browserErrors.network.length ? 'PASS' : 'FAIL',
      mode,
      selfPlay: { white, black },
      assetResponses,
      browserErrors,
    };
  } else {
    const active = await activeLifecycle();
    const coldInit = await coldInitLifecycle();
    const white = await selfPlay('w');
    const black = await selfPlay('b');
    result = {
      verdict: active.pass && coldInit.pass && white.pass && black.pass && !browserErrors.console.length && !browserErrors.page.length && !browserErrors.network.length ? 'PASS' : 'FAIL',
      active,
      coldInit,
      selfPlay: { white, black },
      assetResponses,
      browserErrors,
    };
  }
} catch (error) {
  result = { verdict: 'FAIL', error: error instanceof Error ? error.stack : String(error), assetResponses, browserErrors };
} finally {
  await browser.close();
}

const outputPrefix = mode === 'preview-self-play' ? 'preview-' : '';
await writeFile(`${outputDir}/${outputPrefix}browser.json`, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(`${outputDir}/${outputPrefix}browser-console.json`, `${JSON.stringify(browserErrors.console, null, 2)}\n`);
await writeFile(`${outputDir}/${outputPrefix}page-errors.json`, `${JSON.stringify(browserErrors.page, null, 2)}\n`);
await writeFile(`${outputDir}/${outputPrefix}network-errors.json`, `${JSON.stringify(browserErrors.network, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (result.verdict !== 'PASS') process.exitCode = 1;
