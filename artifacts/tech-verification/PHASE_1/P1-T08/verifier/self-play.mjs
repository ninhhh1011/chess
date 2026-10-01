import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VERIFIER_PRODUCTION_URL || 'http://127.0.0.1:4218';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T08/verifier';
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
  window.__p1t08Production = { workers: [], searches: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      this.__id = window.__p1t08Production.workers.length + 1;
      window.__p1t08Production.workers.push({ id: this.__id, url: String(url), terminated: false });
      this.addEventListener('message', event => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string' || !line.startsWith('bestmove ')) return;
        const search = window.__p1t08Production.searches.findLast(item => item.workerId === this.__id && !item.bestmove);
        if (search) search.bestmove = line.split(/\s+/)[1];
      });
    }
    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        if (message.startsWith('position fen ')) this.__fen = message.slice(13);
        if (message.startsWith('go ')) window.__p1t08Production.searches.push({
          workerId: this.__id, fen: this.__fen, command: message, bestmove: null,
        });
      }
      return super.postMessage(message, ...rest);
    }
    terminate() {
      const worker = window.__p1t08Production.workers.find(item => item.id === this.__id);
      if (worker) worker.terminated = true;
      return super.terminate();
    }
  };
});

const history = () => page.locator('button span').evaluateAll(spans => spans
  .map(span => span.textContent?.trim() || '')
  .filter(text => /^\d+\.\s+\S+/.test(text))
  .map(text => text.replace(/^\d+\.\s+/, '')));

async function replayHistory() {
  const moves = await history();
  const game = new Chess();
  for (const san of moves) if (!game.move(san)) throw new Error(`Illegal UI SAN ${san}`);
  return { moves, game };
}

const waitForPly = count => page.waitForFunction(expected => [...document.querySelectorAll('button span')]
  .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
count, { timeout: 30_000 });

async function clickMove(move) {
  for (const square of [move.from, move.to]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    if (!box) throw new Error(`Missing square ${square}`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

async function dragMove(move) {
  const from = await page.locator(`[data-square="${move.from}"]`).boundingBox();
  const to = await page.locator(`[data-square="${move.to}"]`).boundingBox();
  if (!from || !to) throw new Error(`Missing drag squares ${move.from}-${move.to}`);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
  await page.mouse.up();
}

async function startGame(side, expert = false) {
  await page.getByRole('button', { name: expert ? /^Thử thách -/ : /^Dễ -/ }).click();
  await page.getByRole('button', { name: side === 'w' ? /^Trắng -/ : /^Đen -/ }).click();
  await page.getByRole('button', { name: /^Bắt đầu ván$/ }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Ván đấu', exact: true }).click();
  if (side === 'b') await waitForPly(1);
}

async function chooseMove(game, preferWeak) {
  await page.waitForFunction(fen => window.__p1t08Production.searches
    .some(search => search.fen === fen && search.bestmove), game.fen(), { timeout: 5000 }).catch(() => {});
  const uci = await page.evaluate(fen => window.__p1t08Production.searches
    .findLast(search => search.fen === fen && search.bestmove)?.bestmove, game.fen());
  const moves = game.moves({ verbose: true });
  const engineMove = moves.find(move => `${move.from}${move.to}${move.promotion || ''}` === uci);
  const safeMoves = moves.filter(move => {
    const next = new Chess(game.fen());
    next.move(move);
    return !next.moves({ verbose: true }).some(reply => {
      const afterReply = new Chess(next.fen());
      afterReply.move(reply);
      return afterReply.isCheckmate();
    });
  });
  if (preferWeak) {
    const value = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const weakMove = safeMoves.filter(move => move !== engineMove).map(move => {
      const next = new Chess(game.fen());
      next.move(move);
      const exposure = Math.max(0, ...next.moves({ verbose: true })
        .filter(reply => reply.isCapture()).map(reply => value[reply.captured] || 0));
      return { move, exposure };
    }).sort((a, b) => b.exposure - a.exposure || value[b.move.piece] - value[a.move.piece])[0]?.move;
    if (weakMove) return weakMove;
  }
  if (engineMove) return engineMove;
  return safeMoves[0] || moves[0];
}

async function playTwenty(side, input, undo = false) {
  let undoEvidence = null;
  while ((await history()).length < 20) {
    const { moves, game } = await replayHistory();
    if (game.isGameOver()) throw new Error(`${side} game ended at ${moves.length} plies`);
    if (game.turn() !== side) {
      await waitForPly(moves.length + 1);
      continue;
    }
    const move = await chooseMove(game, moves.length >= 6 && moves.length < 14);
    await input(move);
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
  return { side, input: input === clickMove ? 'click' : 'drag', plies: moves.length, moves, finalFen: game.fen(), undoEvidence };
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src));
  if (!scripts.some(src => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.js$/.test(src)) || scripts.some(src => src.includes('/src/'))) {
    throw new Error(`Not a hashed production build: ${scripts.join(', ')}`);
  }

  await startGame('w');
  const white = await playTwenty('w', clickMove);
  const hintStart = await page.evaluate(() => window.__p1t08Production.searches.length);
  await page.getByRole('button', { name: 'Gợi ý nước đi' }).click();
  await page.waitForFunction(start => window.__p1t08Production.searches.length > start
    && window.__p1t08Production.searches.at(-1).bestmove, hintStart, { timeout: 30_000 });
  white.hint = 'PASS';
  await page.screenshot({ path: `${outputDir}/white-20-click-hint.png`, fullPage: true });

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Đổi cấp độ', exact: true }).click();
  await startGame('b');
  const black = await playTwenty('b', dragMove, true);
  const reviewStart = await page.evaluate(() => window.__p1t08Production.searches.length);
  await page.getByRole('button', { name: 'Phân tích', exact: true }).click();
  await page.locator('article').filter({ hasText: 'Review' }).getByRole('button').first().click();
  const fact = page.locator('[data-evidence-id]').first();
  await fact.waitFor({ state: 'visible', timeout: 120_000 });
  const reviewFact = await fact.evaluate(node => ({
    id: node.dataset.evidenceId,
    source: node.dataset.engineSource,
    turn: node.dataset.turn,
    cpl: Number(node.dataset.centipawnLoss),
    classification: node.dataset.classification,
    playedUci: node.dataset.playedUci,
    bestUci: node.dataset.bestUci,
  }));
  const reviewSearches = await page.evaluate(start => window.__p1t08Production.searches.slice(start), reviewStart);
  if (!reviewFact.id || reviewFact.source !== 'stockfish_wasm' || reviewFact.cpl < 0
    || reviewSearches.length < black.plies + 1 || reviewSearches.some(search => !search.bestmove)) {
    throw new Error(`Invalid review evidence ${JSON.stringify({ reviewFact, searches: reviewSearches.length })}`);
  }
  await page.getByRole('button', { name: 'Đầu hàng', exact: true }).click();
  await page.getByRole('button', { name: 'Đầu hàng', exact: true }).last().click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Xem bàn cờ', exact: true }).click();
  await fact.click();
  const reviewPly = Number(reviewFact.id.match(/:ply:(\d+)$/)?.[1]);
  const reviewPosition = await page.getByText(new RegExp(`${reviewPly} / ${black.plies}`)).innerText();
  await page.getByTitle('Về đầu ván').click();
  await page.getByText(new RegExp(`0 / ${black.plies}`)).waitFor({ state: 'visible' });
  await page.getByTitle('Tiến một nước').click();
  await page.getByText(new RegExp(`1 / ${black.plies}`)).waitFor({ state: 'visible' });
  await page.screenshot({ path: `${outputDir}/black-20-drag-undo-review.png`, fullPage: true });

  await page.getByRole('button', { name: 'Đổi thiết lập', exact: true }).click();
  await startGame('w', true);
  const pendingMove = new Chess().moves({ verbose: true })[0];
  await clickMove(pendingMove);
  await waitForPly(1);
  const pendingWorkerId = await page.evaluate(() => window.__p1t08Production.searches.at(-1)?.workerId);
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.waitForTimeout(2000);
  const staleMoveDiscarded = (await history()).length === 0;
  const pendingWorkerTerminated = await page.evaluate(id => window.__p1t08Production.workers
    .some(worker => worker.id === id && worker.terminated), pendingWorkerId);
  if (!staleMoveDiscarded || !pendingWorkerTerminated) throw new Error('Pending bot response survived New Game');

  if (Object.values(errors).some(items => items.length)) throw new Error(`Browser errors ${JSON.stringify(errors)}`);

  const worker = await page.evaluate(() => window.__p1t08Production);
  const result = {
    verdict: 'PASS',
    baseUrl,
    productionScripts: scripts,
    white,
    black,
    review: { fact: reviewFact, searches: reviewSearches.length, selectedPosition: reviewPosition },
    lifecycle: { staleMoveDiscarded, pendingWorkerId, pendingWorkerTerminated },
    resignation: { confirmed: true, navigation: `${reviewPosition} -> 0 / ${black.plies} -> 1 / ${black.plies}` },
    worker: { urls: [...new Set(worker.workers.map(item => item.url))], workers: worker.workers.length, searches: worker.searches.length },
    errors,
  };
  await page.screenshot({ path: `${outputDir}/lifecycle-resign-review.png`, fullPage: true });
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  await page.screenshot({ path: `${outputDir}/self-play-failure.png`, fullPage: true }).catch(() => {});
  await writeFile(`${outputDir}/self-play-failure.json`, `${JSON.stringify({
    error: error instanceof Error ? error.stack : String(error),
    history: await history().catch(() => []),
    body: await page.locator('body').innerText().catch(() => ''),
    worker: await page.evaluate(() => window.__p1t08Production).catch(() => null),
    errors,
  }, null, 2)}\n`);
  throw error;
} finally {
  await browser.close();
}
