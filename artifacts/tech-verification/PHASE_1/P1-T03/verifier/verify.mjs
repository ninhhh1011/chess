import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VERIFIER_BASE_URL || 'http://127.0.0.1:4179';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T03/verifier';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
const engineResponses = [];

function moveHistory(page) {
  return page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '')
    .filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
}

async function playMove(page, move, drag) {
  const source = page.locator(`[data-square="${move.from}"]`);
  const target = page.locator(`[data-square="${move.to}"]`);
  if (drag) await source.dragTo(target);
  else {
    for (const square of [source, target]) {
      const box = await square.boundingBox();
      if (!box) throw new Error(`Missing board square for ${move.from}${move.to}`);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  }
}

async function waitForBotSearch(page, start, oldWorkerId = null) {
  await page.waitForFunction(({ startIndex, excludedWorker }) => window.__p1t03.searches
    .slice(startIndex)
    .some((search) => search.command === 'go movetime 1200'
      && search.bestmove
      && search.workerId !== excludedWorker),
  { startIndex: start, excludedWorker: oldWorkerId }, { timeout: 30000 });
  return page.evaluate(({ startIndex, excludedWorker }) => window.__p1t03.searches
    .slice(startIndex)
    .find((search) => search.command === 'go movetime 1200'
      && search.bestmove
      && search.workerId !== excludedWorker),
  { startIndex: start, excludedWorker: oldWorkerId });
}

async function createPage(label, shortenFirstBotTimeout = false) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(`${label}: ${error.message}`));
  page.on('requestfailed', (request) => networkErrors.push(`${label}: ${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (/stockfish-worker\.js|stockfish(?:-[^/]+)?\.(?:js|wasm)/.test(response.url())) {
      engineResponses.push({ label, url: response.url(), status: response.status() });
    }
    if (response.status() >= 400) networkErrors.push(`${label}: ${response.status()} ${response.url()}`);
  });

  await page.addInitScript(({ shorten }) => {
    localStorage.setItem('chess-app-onboarding', 'true');
    const NativeWorker = window.Worker;
    const nativeSetTimeout = window.setTimeout.bind(window);
    let hookTimeouts = 0;
    window.__p1t03 = { workers: [], terminated: [], searches: [], hookTimeouts: [] };
    if (shorten) {
      window.setTimeout = (callback, delay, ...args) => {
        if (delay !== 15000) return nativeSetTimeout(callback, delay, ...args);
        hookTimeouts += 1;
        const effectiveDelay = hookTimeouts === 1 ? 250 : delay;
        window.__p1t03.hookTimeouts.push({ requested: delay, effective: effectiveDelay });
        return nativeSetTimeout(callback, effectiveDelay, ...args);
      };
    }
    window.Worker = class TrackedWorker extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.__stockfish = String(url).includes('/stockfish-worker.js');
        this.__workerId = window.__p1t03.workers.length + 1;
        if (!this.__stockfish) return;
        window.__p1t03.workers.push({ id: this.__workerId, url: String(url) });
        this.addEventListener('message', (event) => {
          const line = event.data?.type === 'output' ? event.data.data : null;
          if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
          const search = window.__p1t03.searches
            .findLast((item) => item.workerId === this.__workerId && !item.bestmove);
          if (search) search.bestmove = line.split(/\s+/)[1];
        });
      }

      postMessage(message, ...rest) {
        if (this.__stockfish && typeof message === 'string' && message.startsWith('go ')) {
          window.__p1t03.searches.push({
            workerId: this.__workerId,
            command: message,
            bestmove: null,
          });
        }
        return super.postMessage(message, ...rest);
      }

      terminate() {
        if (this.__stockfish) window.__p1t03.terminated.push(this.__workerId);
        return super.terminate();
      }
    };
  }, { shorten: shortenFirstBotTimeout });
  return page;
}

async function startGame(page, color) {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.locator('div[aria-label] button').nth(3).click();
  await page.getByRole('button', {
    name: color === 'white' ? 'Trắng - Bạn được đi trước' : 'Đen - Máy đi trước',
  }).click();
  await page.locator('.pt-2 button').click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
}

async function runLifecycle(color) {
  const page = await createPage(color);
  await startGame(page, color);
  if (color === 'white') await playMove(page, { from: 'e2', to: 'e4' }, false);

  await page.waitForFunction(() => window.__p1t03.searches
    .some((search) => search.command === 'go movetime 1200' && !search.bestmove));
  const oldWorkerId = await page.evaluate(() => window.__p1t03.searches
    .findLast((search) => search.command === 'go movetime 1200' && !search.bestmove).workerId);
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.waitForFunction((id) => window.__p1t03.terminated.includes(id), oldWorkerId);

  await page.waitForTimeout(1500);
  const historyAfterReset = await moveHistory(page);
  if (color === 'white' && historyAfterReset.length !== 0) {
    throw new Error(`white: stale move reached reset game ${historyAfterReset}`);
  }
  if (color === 'white') await playMove(page, { from: 'e2', to: 'e4' }, false);
  const replacement = await waitForBotSearch(page, 0, oldWorkerId);
  const expectedPlies = color === 'white' ? 2 : 1;
  await page.waitForFunction((count) => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length === count,
  expectedPlies, { timeout: 30000 });

  const history = await moveHistory(page);
  const game = new Chess();
  for (const san of history) game.move(san);
  const state = await page.evaluate(() => window.__p1t03);
  const oldSearch = state.searches.find((search) => search.workerId === oldWorkerId
    && search.command === 'go movetime 1200');
  if (!oldSearch || oldSearch.bestmove !== null) throw new Error(`${color}: stale worker returned a bestmove`);
  const expectedBotMove = new Chess(color === 'white'
    ? 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    : undefined).move({
      from: replacement.bestmove.slice(0, 2),
      to: replacement.bestmove.slice(2, 4),
      promotion: replacement.bestmove[4] || 'q',
    });
  if (!expectedBotMove || history.at(-1) !== expectedBotMove.san) {
    throw new Error(`${color}: replacement bestmove does not match exact UI history`);
  }
  await page.screenshot({ path: `${outputDir}/${color}-lifecycle.png`, fullPage: true });
  await page.close();
  return {
    color,
    oldWorkerId,
    oldSearch,
    workerTerminated: state.terminated.includes(oldWorkerId),
    replacementWorkers: state.workers.filter(({ id }) => id !== oldWorkerId),
    replacement,
    historyAfterReset,
    exactHistory: history,
    finalFen: game.fen(),
    finalPgn: game.pgn(),
    plies: history.length,
    realBotSearches: state.searches.filter((search) => search.command === 'go movetime 1200' && search.bestmove),
  };
}

async function runTimeoutIsolation() {
  const page = await createPage('timeout', true);
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__p1t03.searches.length > 0
    && window.__p1t03.searches.every((search) => search.bestmove), null, { timeout: 30000 });
  await page.locator('div[aria-label] button').nth(3).click();
  await page.getByRole('button', { name: 'Đen - Máy đi trước' }).click();
  await page.locator('.pt-2 button').click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.waitForFunction(() => window.__p1t03.searches
    .some((search) => search.command === 'go movetime 1200' && !search.bestmove));
  const oldWorkerId = await page.evaluate(() => window.__p1t03.searches
    .findLast((search) => search.command === 'go movetime 1200' && !search.bestmove).workerId);
  await page.waitForFunction((id) => window.__p1t03.terminated.includes(id), oldWorkerId, { timeout: 5000 });
  await page.waitForTimeout(200);
  const historyAfterTimeout = await moveHistory(page);
  if (historyAfterTimeout.length !== 0) throw new Error(`Timed-out result reached UI: ${historyAfterTimeout}`);

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  const replacement = await waitForBotSearch(page, 0, oldWorkerId);
  await page.waitForFunction(() => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length === 1,
  null, { timeout: 30000 });
  const game = new Chess();
  const legalMove = game.move({
    from: replacement.bestmove.slice(0, 2),
    to: replacement.bestmove.slice(2, 4),
    promotion: replacement.bestmove[4] || 'q',
  });
  const state = await page.evaluate(() => window.__p1t03);
  const oldSearch = state.searches.find((search) => search.workerId === oldWorkerId
    && search.command === 'go movetime 1200');
  const finalHistory = await moveHistory(page);
  if (!legalMove || oldSearch.bestmove !== null || finalHistory.length !== 1) {
    throw new Error(`Timeout isolation failed: ${JSON.stringify({ legalMove, oldSearch, finalHistory })}`);
  }
  await page.screenshot({ path: `${outputDir}/timeout-isolation.png`, fullPage: true });
  await page.close();
  return {
    shortenedOnlyForFailureTest: state.hookTimeouts,
    oldWorkerId,
    oldSearch,
    workerTerminated: state.terminated.includes(oldWorkerId),
    historyAfterTimeout,
    replacement,
    replacementLegal: Boolean(legalMove),
    exactHistoryAfterRecovery: finalHistory,
  };
}

try {
  const lifecycles = [await runLifecycle('white'), await runLifecycle('black')];
  const timeoutIsolation = await runTimeoutIsolation();
  const successfulEngineResponses = engineResponses.filter(({ status }) => status === 200);
  if (!successfulEngineResponses.some(({ url }) => url.includes('stockfish-worker.js'))
    || !successfulEngineResponses.some(({ url }) => url.endsWith('.wasm'))
    || consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ engineResponses, consoleErrors, pageErrors, networkErrors }));
  }
  const result = {
    verdict: 'PASS',
    browser: 'Chromium',
    productionBuildUrl: baseUrl,
    engineSource: 'stockfish_wasm',
    engineResponses,
    lifecycles,
    timeoutIsolation,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await writeFile(`${outputDir}/browser.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
