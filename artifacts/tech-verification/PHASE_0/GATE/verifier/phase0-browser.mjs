import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.PHASE0_BASE_URL || 'http://127.0.0.1:4192';
const outputDir = 'artifacts/tech-verification/PHASE_0/GATE/verifier';
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
page.on('requestfailed', (request) => {
  networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
});
page.on('response', (response) => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});

await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__phase0Worker = { starts: [], ready: [], bestmoves: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      if (String(url).includes('stockfish-worker.js')) {
        window.__phase0Worker.starts.push(String(url));
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'ready') window.__phase0Worker.ready.push(event.data);
          if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) {
            window.__phase0Worker.bestmoves.push(event.data.data);
          }
        });
      }
    }
  };
});

const moveHistory = () => page.locator('button span').evaluateAll((spans) => spans
  .map((span) => span.textContent?.trim() || '')
  .filter((value) => /^\d+\.\s+\S+/.test(value))
  .map((value) => value.replace(/^\d+\.\s+/, '')));

async function replay() {
  const moves = await moveHistory();
  const game = new Chess();
  for (const san of moves) game.move(san);
  return { moves, game };
}

async function waitForPlies(count) {
  await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30000 });
}

async function squareCenter(square) {
  const box = await page.locator(`[data-square="${square}"]`).boundingBox();
  if (!box) throw new Error(`Missing visible square ${square}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function clickMove(move) {
  for (const square of [move.from, move.to]) {
    const point = await squareCenter(square);
    await page.mouse.click(point.x, point.y);
  }
}

async function dragMove(move) {
  const from = await squareCenter(move.from);
  const to = await squareCenter(move.to);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.mouse.up();
}

async function startGame(color) {
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: color === 'w' ? /^Trắng -/ : /^Đen -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Ván đấu', exact: true }).click();
  if (color === 'b') await waitForPlies(1);
}

async function playLongGame(color, input, withHint, withUndo) {
  let undo = null;
  while ((await moveHistory()).length < 20) {
    const { moves, game } = await replay();
    if (game.isGameOver()) throw new Error(`${color} game ended at ${moves.length} plies`);
    if (game.turn() !== color) {
      await waitForPlies(moves.length + 1);
      continue;
    }
    const move = game.moves({ verbose: true }).find((candidate) => !candidate.isCapture() && !candidate.promotion)
      || game.moves({ verbose: true }).find((candidate) => !candidate.promotion)
      || game.moves({ verbose: true })[0];
    const before = moves.length;
    await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running'));
    console.log(`${color}/${input === clickMove ? 'click' : 'drag'} ${before + 1}: ${move.from}${move.to}`);
    await input(move);
    await waitForPlies(before + 1);
    await waitForPlies(before + 2);

    if (withUndo && !undo) {
      const beforeUndo = (await moveHistory()).length;
      await page.getByRole('button', { name: 'Hoàn tác nước cờ' }).click();
      await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
        .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length === expected,
      beforeUndo - 2);
      undo = { before: beforeUndo, after: (await moveHistory()).length };
    }
  }

  const result = await replay();
  let hint = null;
  if (withHint) {
    const before = await page.evaluate(() => window.__phase0Worker.bestmoves.length);
    await page.getByRole('button', { name: 'Gợi ý nước đi' }).click();
    await page.waitForFunction((count) => window.__phase0Worker.bestmoves.length > count, before, { timeout: 30000 });
    hint = { invoked: true, bestmovesBefore: before, bestmovesAfter: await page.evaluate(() => window.__phase0Worker.bestmoves.length) };
  }
  return {
    color,
    input: input === clickMove ? 'click' : 'drag',
    plies: result.moves.length,
    sanMoves: result.moves,
    finalFen: result.game.fen(),
    pgn: result.game.pgn(),
    pgnReplay: 'PASS',
    hint,
    undo,
  };
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skip.isVisible({ timeout: 500 }).catch(() => false)) await skip.click();

  await startGame('w');
  const gameA = await playLongGame('w', clickMove, true, false);
  await page.screenshot({ path: `${outputDir}/game-a-white-click.png`, fullPage: true });

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi cấp độ', exact: true }).click();
  await startGame('b');
  const gameB = await playLongGame('b', dragMove, false, true);
  await page.screenshot({ path: `${outputDir}/game-b-black-drag.png`, fullPage: true });

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi cấp độ', exact: true }).click();
  await startGame('w');
  const initial = new Chess();
  const lifecycleMove = initial.moves({ verbose: true }).find((move) => !move.promotion);
  const bestmovesBeforePending = await page.evaluate(() => window.__phase0Worker.bestmoves.length);
  await clickMove(lifecycleMove);
  await waitForPlies(1);
  const pendingObserved = await page.getByRole('status', { name: /Máy đang suy nghĩ/i }).isVisible().catch(() => false);
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.waitForTimeout(5000);
  const postResetPlies = (await moveHistory()).length;
  if (postResetPlies !== 0) throw new Error(`Stale move survived new-game reset: ${postResetPlies}`);

  await clickMove(initial.moves({ verbose: true }).find((move) => !move.promotion));
  await waitForPlies(2);
  await page.getByRole('button', { name: 'Đầu hàng', exact: true }).click();
  await page.getByRole('button', { name: 'Đầu hàng', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Xem bàn cờ', exact: true }).click();
  await page.getByTitle('Về đầu ván').click();
  await page.getByText(/^0 \/ 2$/).waitFor({ state: 'visible' });
  await page.getByTitle('Tiến một nước').click();
  await page.getByText(/^1 \/ 2$/).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.waitForTimeout(500);
  const finalNewGamePlies = (await moveHistory()).length;

  const worker = await page.evaluate(() => window.__phase0Worker);
  if (!worker.starts.some((url) => url.includes('/stockfish-worker.js'))) throw new Error('Stockfish worker was not created');
  if (!worker.ready.some((entry) => entry.success === true)) throw new Error('Stockfish worker never reported ready');
  if (worker.bestmoves.length < 20) throw new Error(`Too few real bestmove messages: ${worker.bestmoves.length}`);
  if (!pendingObserved) throw new Error('Pending bot state was not visible before reset');
  if (finalNewGamePlies !== 0) throw new Error(`New game from review retained ${finalNewGamePlies} plies`);
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(`Browser telemetry errors: ${JSON.stringify({ consoleErrors, pageErrors, networkErrors })}`);
  }

  const evidence = {
    verdict: 'PASS',
    baseUrl,
    browser: 'Chromium',
    viewport: '1440x900',
    gameA,
    gameB,
    lifecycle: {
      pendingObserved,
      bestmovesBeforePending,
      bestmovesAfterReset: worker.bestmoves.length,
      postResetPlies,
      staleMoveDiscarded: postResetPlies === 0,
      resigned: true,
      reviewOpened: true,
      reviewNavigation: '0/2 -> 1/2',
      finalNewGamePlies,
    },
    engineSource: 'stockfish_wasm',
    worker,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await page.screenshot({ path: `${outputDir}/lifecycle-new-game.png`, fullPage: true });
  await writeFile(`${outputDir}/browser.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  const failure = {
    verdict: 'FAIL',
    error: error instanceof Error ? error.stack : String(error),
    history: await moveHistory().catch(() => []),
    worker: await page.evaluate(() => window.__phase0Worker).catch(() => null),
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await page.screenshot({ path: `${outputDir}/browser-failure.png`, fullPage: true }).catch(() => {});
  await writeFile(`${outputDir}/browser-failure.json`, `${JSON.stringify(failure, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
}
