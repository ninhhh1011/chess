import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4177';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T01';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});

await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__engineEvidence = { workers: [], terminated: [], ready: [], searches: [] };
  window.Worker = class extends NativeWorker {
    constructor(workerUrl, options) {
      super(workerUrl, options);
      this.__engineWorkerId = window.__engineEvidence.workers.length + 1;
      if (String(workerUrl).includes('stockfish-worker.js')) {
        window.__engineEvidence.workers.push({ id: this.__engineWorkerId, url: String(workerUrl) });
        this.addEventListener('message', (event) => {
          const message = event.data;
          if (message?.type === 'ready') window.__engineEvidence.ready.push(message);
          if (message?.type !== 'output' || typeof message.data !== 'string') return;
          const search = window.__engineEvidence.searches.findLast((item) => item.workerId === this.__engineWorkerId && !item.bestmove);
          if (!search) return;
          const depth = message.data.match(/\bdepth (\d+)/);
          const time = message.data.match(/\btime (\d+)/);
          if (depth) search.depth = Math.max(search.depth || 0, Number(depth[1]));
          if (time) search.engineTimeMs = Number(time[1]);
          if (message.data.startsWith('bestmove')) {
            search.bestmove = message.data.split(/\s+/)[1];
            search.wallTimeMs = Math.round(performance.now() - search.startedAt);
            search.source = 'stockfish_wasm';
          }
        });
      }
    }

    postMessage(message, ...rest) {
      if (typeof message === 'string' && message.startsWith('go ')) {
        window.__engineEvidence.searches.push({
          workerId: this.__engineWorkerId,
          command: message,
          startedAt: performance.now(),
          depth: 0,
          engineTimeMs: null,
          wallTimeMs: null,
          bestmove: null,
          source: null,
        });
      }
      return super.postMessage(message, ...rest);
    }

    terminate() {
      window.__engineEvidence.terminated.push(this.__engineWorkerId);
      return super.terminate();
    }
  };
});

function history() {
  return page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '')
    .filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
}

async function replayHistory() {
  const moves = await history();
  const replay = new Chess();
  for (const san of moves) replay.move(san);
  return { moves, replay };
}

async function clickMove(move) {
  for (const square of [move.from, move.to]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    if (!box) throw new Error(`Square ${square} is not visible`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

async function waitForHistoryAtLeast(count) {
  await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected, count, { timeout: 30000 });
}

async function startGame(color) {
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: color === 'w' ? /^Trắng -/ : /^Đen -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Ván đấu', exact: true }).click();
  if (color === 'b') await waitForHistoryAtLeast(1);
}

async function playTenPlus(color) {
  const firstSearch = await page.evaluate(() => window.__engineEvidence.searches.length);
  while ((await history()).length < 10) {
    const { moves, replay } = await replayHistory();
    if (replay.isGameOver()) throw new Error(`${color} game ended before 10 plies`);
    if (replay.turn() !== color) {
      await waitForHistoryAtLeast(moves.length + 1);
      continue;
    }
    const legal = replay.moves({ verbose: true });
    const move = legal.find((candidate) => !candidate.isCapture() && !candidate.promotion)
      || legal.find((candidate) => !candidate.promotion)
      || legal[0];
    const before = moves.length;
    await clickMove(move);
    await waitForHistoryAtLeast(before + 1);
    if ((await history()).length < 10) await waitForHistoryAtLeast(before + 2);
  }

  const { moves, replay } = await replayHistory();
  const searches = await page.evaluate((start) => window.__engineEvidence.searches.slice(start), firstSearch);
  const completed = searches.filter((search) => search.source === 'stockfish_wasm');
  if (!completed.length || completed.some((search) => !search.bestmove || search.depth <= 0 || search.wallTimeMs === null)) {
    throw new Error(`Incomplete Stockfish telemetry: ${JSON.stringify(searches)}`);
  }
  return { color, plies: moves.length, sanMoves: moves, finalFen: replay.fen(), pgnReplay: 'PASS', searches: completed };
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skip.isVisible({ timeout: 500 }).catch(() => false)) await skip.click();

  await startGame('w');
  const white = await playTenPlus('w');
  await page.screenshot({ path: `${outputDir}/white-10-plies.png`, fullPage: true });

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi cấp độ', exact: true }).click();
  await startGame('b');
  const black = await playTenPlus('b');
  await page.screenshot({ path: `${outputDir}/black-10-plies.png`, fullPage: true });

  const engine = await page.evaluate(() => window.__engineEvidence);
  if (!engine.ready.some((entry) => entry.success === true)) throw new Error('No successful worker ready handshake');
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  const evidence = {
    verdict: 'PASS',
    browser: 'Chromium',
    viewport: '1440x900',
    white,
    black,
    engine,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
