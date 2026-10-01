import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4176';
const outputDir = 'artifacts/tech-verification/PHASE_0/GATE';
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
  window.__workerEvidence = { starts: [], ready: [], bestmoves: [] };
  window.Worker = class extends NativeWorker {
    constructor(workerUrl, options) {
      super(workerUrl, options);
      if (String(workerUrl).includes('stockfish-worker.js')) {
        window.__workerEvidence.starts.push(String(workerUrl));
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'ready') window.__workerEvidence.ready.push(event.data);
          if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) {
            window.__workerEvidence.bestmoves.push(event.data.data);
          }
        });
      }
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

async function dragMove(move) {
  const source = await page.locator(`[data-square="${move.from}"]`).boundingBox();
  const target = await page.locator(`[data-square="${move.to}"]`).boundingBox();
  if (!source || !target) throw new Error(`Drag squares ${move.from}-${move.to} are not visible`);
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 20 });
  await page.mouse.up();
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

async function playToTwenty(color, method, useHint = false, useUndo = false) {
  let hintUsed = false;
  let undoEvidence = null;
  while ((await history()).length < 20) {
    const { moves, replay } = await replayHistory();
    if (replay.isGameOver()) throw new Error(`${color} game ended before 20 plies`);
    if (replay.turn() !== color) {
      await waitForHistoryAtLeast(moves.length + 1);
      continue;
    }

    const legal = replay.moves({ verbose: true });
    const move = legal.find((candidate) => !candidate.isCapture() && !candidate.promotion)
      || legal.find((candidate) => !candidate.promotion)
      || legal[0];
    const before = moves.length;
    console.log(`${color}/${method === clickMove ? 'click' : 'drag'} ply ${before + 1}: ${move.from}${move.to}`);
    await method(move);
    await waitForHistoryAtLeast(before + 1);
    await waitForHistoryAtLeast(before + 2);

    if (useUndo && !undoEvidence) {
      const beforeUndo = (await history()).length;
      await page.getByRole('button', { name: 'Hoàn tác nước cờ' }).click();
      await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
        .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length === expected, beforeUndo - 2);
      undoEvidence = { before: beforeUndo, after: (await history()).length };
      await page.waitForTimeout(500);
    }
  }

  const result = await replayHistory();
  if (useHint) {
    const beforeHints = await page.evaluate(() => window.__workerEvidence.bestmoves.length);
    await page.getByRole('button', { name: 'Gợi ý nước đi' }).click();
    await page.waitForFunction((count) => window.__workerEvidence.bestmoves.length > count, beforeHints, { timeout: 30000 });
    hintUsed = true;
  }
  return {
    color,
    input: method === clickMove ? 'click' : 'drag',
    plies: result.moves.length,
    sanMoves: result.moves,
    finalFen: result.replay.fen(),
    pgnReplay: 'PASS',
    hintUsed,
    undoEvidence,
  };
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skip.isVisible({ timeout: 500 }).catch(() => false)) await skip.click();

  await startGame('w');
  const gameA = await playToTwenty('w', clickMove, true, false);
  await page.screenshot({ path: `${outputDir}/game-a-white-click.png`, fullPage: true });

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi cấp độ', exact: true }).click();
  await startGame('b');
  const gameB = await playToTwenty('b', dragMove, false, true);
  await page.screenshot({ path: `${outputDir}/game-b-black-drag.png`, fullPage: true });

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi cấp độ', exact: true }).click();
  await startGame('w');
  const beforePending = await replayHistory();
  const pendingMove = beforePending.replay.moves({ verbose: true }).find((move) => !move.promotion);
  await clickMove(pendingMove);
  await waitForHistoryAtLeast(1);
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.waitForTimeout(5000);
  const staleMoveDiscarded = (await history()).length === 0;
  if (!staleMoveDiscarded) throw new Error(`Stale bot move survived reset: ${(await history()).join(' ')}`);

  const fresh = new Chess();
  await clickMove(fresh.moves({ verbose: true }).find((move) => !move.promotion));
  await waitForHistoryAtLeast(2);
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
  const postReviewNewGamePlies = (await history()).length;
  if (postReviewNewGamePlies !== 0) throw new Error(`Review new game did not reset: ${postReviewNewGamePlies}`);

  const worker = await page.evaluate(() => window.__workerEvidence);
  if (!worker.ready.some((entry) => entry.success === true) || worker.bestmoves.length < 20) {
    throw new Error(`Missing real Stockfish evidence: ${JSON.stringify(worker)}`);
  }
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  const evidence = {
    verdict: 'PASS',
    route: '/play',
    browser: 'Chromium',
    viewport: '1440x900',
    gameA,
    gameB,
    lifecycle: {
      pendingBotMoveReset: true,
      staleMoveDiscarded,
      resigned: true,
      reviewOpened: true,
      reviewNavigation: '0/2 → 1/2',
      newGameFromReview: true,
      postReviewNewGamePlies,
    },
    engineSource: 'stockfish_wasm',
    worker,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await page.screenshot({ path: `${outputDir}/lifecycle-new-game.png`, fullPage: true });
  await writeFile(`${outputDir}/phase-gate.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  const failure = {
    error: error instanceof Error ? error.stack : String(error),
    history: await history().catch(() => []),
    body: await page.locator('body').innerText().catch(() => ''),
    worker: await page.evaluate(() => window.__workerEvidence).catch(() => null),
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await page.screenshot({ path: `${outputDir}/failure.png`, fullPage: true }).catch(() => {});
  await writeFile(`${outputDir}/failure.json`, `${JSON.stringify(failure, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
}
