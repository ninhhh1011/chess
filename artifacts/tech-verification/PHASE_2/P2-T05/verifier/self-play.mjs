import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { writeFile } from 'node:fs/promises';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4205';
const outputDir = 'artifacts/tech-verification/PHASE_2/P2-T05/verifier';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
const productionAssets = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
  if (/\/assets\/[^/]+-[A-Za-z0-9_-]+\.(?:js|css)$/.test(response.url())) productionAssets.push(response.url());
});
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__p2t05Stockfish = { starts: [], ready: [], bestmoves: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      if (String(url).includes('stockfish-worker.js')) {
        window.__p2t05Stockfish.starts.push(String(url));
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'ready') window.__p2t05Stockfish.ready.push(event.data);
          if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) window.__p2t05Stockfish.bestmoves.push(event.data.data);
        });
      }
    }
  };
});

function moveHistory() {
  return page.locator('button span').evaluateAll((spans) => spans.map((span) => span.textContent?.trim() || '')
    .filter((value) => /^\d+\.\s+\S+/.test(value)).map((value) => value.replace(/^\d+\.\s+/, '')));
}

async function clickSquare(square) {
  const board = await page.locator('.chess-board-container').boundingBox();
  if (!board) throw new Error('Chessboard is not visible');
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  await page.mouse.click(board.x + (file + 0.5) * board.width / 8, board.y + (8 - rank + 0.5) * board.height / 8);
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  const skipOnboarding = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skipOnboarding.isVisible().catch(() => false)) await skipOnboarding.click();
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  const replay = new Chess();
  const counts = [];
  for (const preferred of ['e2e4', 'g1f3', 'd2d3']) {
    const legal = replay.moves({ verbose: true });
    const move = legal.find((candidate) => `${candidate.from}${candidate.to}` === preferred)
      || legal.find((candidate) => !candidate.promotion);
    if (!move) throw new Error(`No legal player move for ${preferred}`);
    const before = (await moveHistory()).length;
    await clickSquare(move.from);
    await clickSquare(move.to);
    await page.waitForFunction((count) => [...document.querySelectorAll('button span')]
      .map((span) => span.textContent?.trim() || '').filter((value) => /^\d+\.\s+\S+/.test(value)).length >= count,
    before + 2, { timeout: 30000 });
    const history = await moveHistory();
    counts.push(history.length);
    replay.reset();
    for (const san of history) replay.move(san);
    if (replay.turn() !== 'w') throw new Error(`Expected White after ${history.length} plies`);
  }
  const sanMoves = await moveHistory();
  const worker = await page.evaluate(() => window.__p2t05Stockfish);
  if (sanMoves.length < 6 || !productionAssets.length || !worker.starts.length
    || !worker.ready.some(({ success }) => success) || worker.bestmoves.length < 3) {
    throw new Error('Production/Stockfish evidence incomplete');
  }
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }
  await page.screenshot({ path: `${outputDir}/self-play.png`, fullPage: true });
  const result = {
    verdict: 'PASS', browser: 'Chromium', baseUrl,
    productionAssets: [...new Set(productionAssets)], difficulty: 'easy', playerColor: 'white',
    counts, plies: sanMoves.length, sanMoves, finalFen: replay.fen(), pgnReplay: 'PASS',
    engineSource: 'stockfish_wasm', worker, consoleErrors, pageErrors, networkErrors,
  };
  await Promise.all([
    writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`),
    writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`),
    writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`),
  ]);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const failure = { verdict: 'FAIL', error: error instanceof Error ? error.stack : String(error), consoleErrors, pageErrors, networkErrors };
  await writeFile(`${outputDir}/browser-failure.json`, `${JSON.stringify(failure, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
}
