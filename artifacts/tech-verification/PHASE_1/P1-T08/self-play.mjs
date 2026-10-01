import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4198';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T08';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = { console: [], page: [], network: [] };

page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
page.on('pageerror', error => errors.page.push(error.message));
page.on('requestfailed', request => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', response => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });

await page.addInitScript(() => {
  localStorage.setItem('chess-app-onboarding', 'true');
  const NativeWorker = window.Worker;
  window.__phase1Evidence = { workers: [], searches: [], fen: null };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      this.__id = window.__phase1Evidence.workers.length + 1;
      window.__phase1Evidence.workers.push({ id: this.__id, url: String(url), terminated: false });
      this.addEventListener('message', event => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
        const search = window.__phase1Evidence.searches.findLast(item => item.workerId === this.__id && !item.bestmove);
        if (search) search.bestmove = line.split(/\s+/)[1];
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        if (message.startsWith('position fen ')) this.__fen = message.slice(13);
        if (message.startsWith('go ')) window.__phase1Evidence.searches.push({
          workerId: this.__id,
          fen: this.__fen,
          command: message,
          bestmove: null,
        });
      }
      return super.postMessage(message, ...rest);
    }

    terminate() {
      const worker = window.__phase1Evidence.workers.find(item => item.id === this.__id);
      if (worker) worker.terminated = true;
      return super.terminate();
    }
  };
});

const history = () => page.locator('button span').evaluateAll(spans => spans
  .map(span => span.textContent?.trim() || '')
  .filter(value => /^\d+\.\s+\S+/.test(value))
  .map(value => value.replace(/^\d+\.\s+/, '')));

async function replayHistory() {
  const moves = await history();
  const game = new Chess();
  for (const san of moves) game.move(san);
  return { moves, game };
}

async function waitForPly(count) {
  await page.waitForFunction(expected => [...document.querySelectorAll('button span')]
    .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30000 });
}

async function clickMove(move) {
  for (const square of [move.from, move.to]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    if (!box) throw new Error(`Square ${square} is not visible`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

async function dragMove(move) {
  const from = await page.locator(`[data-square="${move.from}"]`).boundingBox();
  const to = await page.locator(`[data-square="${move.to}"]`).boundingBox();
  if (!from || !to) throw new Error(`Drag squares ${move.from}-${move.to} are not visible`);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
  await page.mouse.up();
}

async function startGame(side, expert = false) {
  await page.getByRole('button', { name: expert ? 'Thử thách - Nâng cao' : 'Dễ - Người mới' }).click();
  await page.getByRole('button', { name: side === 'w' ? 'Trắng - Bạn được đi trước' : 'Đen - Máy đi trước' }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván', exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Ván đấu', exact: true }).click();
  if (side === 'b') await waitForPly(1);
}

async function playTwenty(side, moveWith, undo = false) {
  let undoEvidence = null;
  while ((await history()).length < 20) {
    const { moves, game } = await replayHistory();
    if (game.isGameOver()) throw new Error(`${side} game ended at ${moves.length} plies`);
    if (game.turn() !== side) {
      await waitForPly(moves.length + 1);
      continue;
    }
    const move = game.moves({ verbose: true }).find(candidate => !candidate.isCapture() && !candidate.promotion)
      || game.moves({ verbose: true }).find(candidate => !candidate.promotion)
      || game.moves({ verbose: true })[0];
    await moveWith(move);
    await waitForPly(moves.length + 1);
    await waitForPly(moves.length + 2);

    if (undo && !undoEvidence) {
      const before = (await history()).length;
      await page.getByRole('button', { name: 'Hoàn tác nước cờ' }).click();
      await page.waitForFunction(expected => [...document.querySelectorAll('button span')]
        .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length === expected,
      before - 2);
      undoEvidence = { before, after: before - 2 };
      await page.waitForTimeout(500);
    }
  }
  const { moves, game } = await replayHistory();
  return { side, input: moveWith === clickMove ? 'click' : 'drag', plies: moves.length, moves, finalFen: game.fen(), undoEvidence };
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });

  await startGame('w');
  const gameA = await playTwenty('w', clickMove);
  const searchesBeforeHint = await page.evaluate(() => window.__phase1Evidence.searches.length);
  await page.getByRole('button', { name: 'Gợi ý nước đi' }).click();
  await page.waitForFunction(start => window.__phase1Evidence.searches.length > start
    && window.__phase1Evidence.searches.at(-1).bestmove, searchesBeforeHint, { timeout: 30000 });
  gameA.hint = 'PASS';
  await page.screenshot({ path: `${outputDir}/white-20-click-hint.png`, fullPage: true });

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi cấp độ', exact: true }).click();
  await startGame('b');
  const gameB = await playTwenty('b', dragMove, true);

  const reviewSearchStart = await page.evaluate(() => window.__phase1Evidence.searches.length);
  await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
  await page.locator('article').filter({ hasText: 'Review' }).getByRole('button').first().click();
  const evidence = page.locator('[data-evidence-id]').first();
  await evidence.waitFor({ state: 'visible', timeout: 120000 });
  const reviewFact = await evidence.evaluate(node => ({
    id: node.dataset.evidenceId,
    source: node.dataset.engineSource,
    turn: node.dataset.turn,
    cpl: Number(node.dataset.centipawnLoss),
    classification: node.dataset.classification,
    playedUci: node.dataset.playedUci,
    bestUci: node.dataset.bestUci,
  }));
  const reviewSearches = await page.evaluate(start => window.__phase1Evidence.searches.slice(start), reviewSearchStart);
  if (reviewFact.source !== 'stockfish_wasm' || reviewFact.cpl < 0 || !reviewFact.id
    || reviewSearches.length < gameB.plies + 1 || reviewSearches.some(search => !search.bestmove)) {
    throw new Error(`Invalid production review evidence: ${JSON.stringify({ reviewFact, reviewSearches: reviewSearches.length })}`);
  }
  await page.screenshot({ path: `${outputDir}/black-20-drag-undo-review.png`, fullPage: true });
  await page.getByRole('button', { name: 'Ván đấu', exact: true }).click();

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi cấp độ', exact: true }).click();
  await startGame('w', true);
  const pending = new Chess().moves({ verbose: true }).find(move => !move.promotion);
  await clickMove(pending);
  await waitForPly(1);
  const pendingWorkerId = await page.evaluate(() => window.__phase1Evidence.searches.at(-1)?.workerId);
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.waitForTimeout(2000);
  const staleMoveDiscarded = (await history()).length === 0;
  const pendingWorkerTerminated = await page.evaluate(id => window.__phase1Evidence.workers.some(worker => worker.id === id && worker.terminated), pendingWorkerId);
  if (!staleMoveDiscarded || !pendingWorkerTerminated) throw new Error('Pending bot request survived new game');

  await clickMove(new Chess().moves({ verbose: true }).find(move => !move.promotion));
  await waitForPly(2);
  await page.getByRole('button', { name: 'Đầu hàng', exact: true }).click();
  await page.getByRole('button', { name: 'Đầu hàng', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Xem bàn cờ', exact: true }).click();
  await page.getByTitle('Về đầu ván').click();
  await page.getByText(/^0 \/ 2$/).waitFor({ state: 'visible' });
  await page.getByTitle('Tiến một nước').click();
  await page.getByText(/^1 \/ 2$/).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('button span')]
    .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length === 0);

  if (errors.console.length || errors.page.length || errors.network.length) throw new Error(JSON.stringify(errors));
  const worker = await page.evaluate(() => window.__phase1Evidence);
  const result = {
    verdict: 'PASS',
    buildUrl: baseUrl,
    productionScripts: await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src)),
    gameA,
    gameB,
    review: { fact: reviewFact, searches: reviewSearches.length, navigation: '0/2 -> 1/2' },
    lifecycle: { staleMoveDiscarded, pendingWorkerId, pendingWorkerTerminated, newGameAfterReview: true },
    worker: { urls: [...new Set(worker.workers.map(item => item.url))], count: worker.workers.length, searches: worker.searches.length },
    errors,
  };
  await page.screenshot({ path: `${outputDir}/lifecycle-review-new-game.png`, fullPage: true });
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/self-play-browser-console.json`, `${JSON.stringify(errors.console, null, 2)}\n`);
  await writeFile(`${outputDir}/self-play-page-errors.json`, `${JSON.stringify(errors.page, null, 2)}\n`);
  await writeFile(`${outputDir}/self-play-network-errors.json`, `${JSON.stringify(errors.network, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const failure = {
    error: error instanceof Error ? error.stack : String(error),
    history: await history().catch(() => []),
    body: await page.locator('body').innerText().catch(() => ''),
    worker: await page.evaluate(() => window.__phase1Evidence).catch(() => null),
    errors,
  };
  await page.screenshot({ path: `${outputDir}/self-play-failure.png`, fullPage: true }).catch(() => {});
  await writeFile(`${outputDir}/self-play-failure.json`, `${JSON.stringify(failure, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
}
