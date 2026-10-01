import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const outputDir = 'artifacts/tech-verification/PHASE_0/P0-T03/verifier';
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
  window.__stockfishEvidence = { starts: [], ready: [], bestmoves: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      if (String(url).includes('stockfish-worker.js')) {
        window.__stockfishEvidence.starts.push(String(url));
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'ready') window.__stockfishEvidence.ready.push(event.data);
          if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) {
            window.__stockfishEvidence.bestmoves.push(event.data.data);
          }
        });
      }
    }
  };
});

function moveHistory() {
  return page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '')
    .filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
}

async function clickSquare(square) {
  const board = await page.locator('.chess-board-container').boundingBox();
  if (!board) throw new Error('Chessboard is not visible');
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  await page.mouse.click(board.x + (file + 0.5) * board.width / 8, board.y + (8 - rank + 0.5) * board.height / 8);
}

try {
  await page.goto('http://127.0.0.1:4177/play', { waitUntil: 'networkidle' });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  const replay = new Chess();
  const counts = [];
  for (const requestedUci of ['e2e4', 'g1f3', 'd2d3']) {
    const legal = replay.moves({ verbose: true });
    const move = legal.find((candidate) => `${candidate.from}${candidate.to}` === requestedUci)
      || legal.find((candidate) => !candidate.promotion);
    if (!move) throw new Error(`No legal player move for ${requestedUci}`);
    const priorPlies = (await moveHistory()).length;
    await clickSquare(move.from);
    await clickSquare(move.to);
    await page.waitForFunction((count) => [...document.querySelectorAll('button span')]
      .map((span) => span.textContent?.trim() || '')
      .filter((value) => /^\d+\.\s+\S+/.test(value)).length === count, priorPlies + 2, { timeout: 30000 });
    await page.waitForTimeout(750);
    const sanMoves = await moveHistory();
    if (sanMoves.length !== priorPlies + 2) throw new Error(`Double move detected: ${priorPlies} -> ${sanMoves.length}`);
    replay.reset();
    for (const san of sanMoves) replay.move(san);
    if (replay.turn() !== 'w') throw new Error(`Stale/stuck turn after ${sanMoves.length} plies`);
    counts.push(sanMoves.length);
  }

  const sanMoves = await moveHistory();
  const worker = await page.evaluate(() => window.__stockfishEvidence);
  if (sanMoves.length < 6) throw new Error(`Only ${sanMoves.length} plies completed`);
  if (!worker.starts.length || !worker.ready.some((event) => event.success === true) || worker.bestmoves.length < 3) {
    throw new Error(`Missing Stockfish evidence: ${JSON.stringify(worker)}`);
  }
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  await page.screenshot({ path: `${outputDir}/self-play.png`, fullPage: true });
  const evidence = {
    verdict: 'PASS', route: '/play', browser: 'Chromium', viewport: '1440x900',
    difficulty: 'easy', playerColor: 'white', counts, plies: sanMoves.length,
    sanMoves, finalFen: replay.fen(), pgnReplay: 'PASS', engineSource: 'stockfish_wasm',
    worker, consoleErrors, pageErrors, networkErrors,
  };
  for (const [name, value] of Object.entries({
    'self-play.json': evidence,
    'browser-console.json': consoleErrors,
    'page-errors.json': pageErrors,
    'network-errors.json': networkErrors,
  })) await writeFile(`${outputDir}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
