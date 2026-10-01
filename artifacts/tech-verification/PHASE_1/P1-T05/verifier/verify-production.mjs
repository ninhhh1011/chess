import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VERIFIER_BASE_URL || 'http://127.0.0.1:4193';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T05/verifier';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];

page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', error => pageErrors.push(error.message));
page.on('requestfailed', request => {
  networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
});
page.on('response', response => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});

await page.addInitScript(() => {
  localStorage.setItem('chess-app-onboarding', 'true');
  const NativeWorker = window.Worker;
  window.__p1t05Verifier = { workerUrls: [], messages: [], searches: [], currentFen: null };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      window.__p1t05Verifier.workerUrls.push(String(url));
      this.addEventListener('message', event => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string') return;
        window.__p1t05Verifier.messages.push({ direction: 'from-worker', line });
        if (!line.startsWith('bestmove')) return;
        const search = window.__p1t05Verifier.searches.findLast(item => !item.bestmove);
        if (search) search.bestmove = line.split(/\s+/)[1];
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        window.__p1t05Verifier.messages.push({ direction: 'to-worker', line: message });
        if (message.startsWith('position fen ')) window.__p1t05Verifier.currentFen = message.slice(13);
        if (message.startsWith('go ')) {
          window.__p1t05Verifier.searches.push({
            fen: window.__p1t05Verifier.currentFen,
            command: message,
            bestmove: null,
          });
        }
      }
      return super.postMessage(message, ...rest);
    }
  };
});

const history = () => page.locator('button span').evaluateAll(spans => spans
  .map(span => span.textContent?.trim() || '')
  .filter(value => /^\d+\.\s+\S+/.test(value))
  .map(value => value.replace(/^\d+\.\s+/, '')));

async function clickMove(move) {
  for (const square of [move.from, move.to]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    if (!box) throw new Error(`Square ${square} is not visible`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

function chooseExposedMove(game) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const scored = game.moves({ verbose: true })
    .map(move => {
      const next = new Chess(game.fen());
      next.move(move);
      const largestCapture = Math.max(0, ...next.moves({ verbose: true })
        .filter(reply => reply.isCapture())
        .map(reply => values[reply.captured] || 0));
      return { move, score: largestCapture };
    })
    .sort((a, b) => b.score - a.score);
  if (scored[0].score > 0) return scored[0].move;
  return scored.find(({ move }) => `${move.from}${move.to}` === 'e2e4')?.move
    || scored.find(({ move }) => move.piece === 'q')?.move
    || scored[0].move;
}

async function waitForPly(count) {
  await page.waitForFunction(expected => [...document.querySelectorAll('button span')]
    .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30_000 });
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Thử thách - Nâng cao' }).click();
  await page.getByRole('button', { name: /Trắng - Bạn được đi trước/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván', exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  while ((await history()).length < 14) {
    const before = await history();
    const replay = new Chess();
    before.forEach(san => replay.move(san));
    if (replay.turn() === 'w') {
      await clickMove(chooseExposedMove(replay));
      await waitForPly(before.length + 1);
    }
    if ((await history()).length < 14) await waitForPly(before.length + 2);
  }

  const playedHistory = await history();
  const replay = new Chess();
  const expectedPositionChain = [replay.fen()];
  for (const san of playedHistory) {
    replay.move(san);
    expectedPositionChain.push(replay.fen());
  }

  await page.waitForTimeout(1500);
  const searchStart = await page.evaluate(() => window.__p1t05Verifier.searches.length);
  await page.getByRole('button', { name: 'Phân tích' }).click();
  await page.getByRole('button', { name: 'Mổ ván cờ' }).click();
  await page.getByRole('button', { name: 'Đang mổ ván...' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Mổ ván cờ' }).waitFor({ state: 'visible', timeout: 120_000 });

  const captured = await page.evaluate(start => ({
    workerUrls: window.__p1t05Verifier.workerUrls,
    searches: window.__p1t05Verifier.searches.slice(start),
    messages: window.__p1t05Verifier.messages,
  }), searchStart);
  const reviewSearches = captured.searches.filter(search => search.command === 'go movetime 450');
  const passOneSearches = reviewSearches.slice(0, expectedPositionChain.length);
  const passTwoSearches = reviewSearches.slice(expectedPositionChain.length);
  const reviewPanel = page.locator('article').filter({ hasText: 'Review' });
  const reviewText = await reviewPanel.innerText();

  if (playedHistory.length < 10) throw new Error(`Expected 10+ plies, got ${playedHistory.length}`);
  if (!captured.workerUrls.some(url => url.includes('/stockfish-worker.js'))) throw new Error('Stockfish worker URL not observed');
  if (!reviewSearches.every(search => search.bestmove)) throw new Error('A review worker search did not produce bestmove');
  if (JSON.stringify(passOneSearches.map(search => search.fen)) !== JSON.stringify(expectedPositionChain)) {
    throw new Error('Pass 1 FEN chain is missing, duplicated, or out of order');
  }
  if (passTwoSearches.length < 1) throw new Error('Pass 2 selected no candidate');
  if (!passTwoSearches.every(search => expectedPositionChain.slice(0, -1).includes(search.fen))) {
    throw new Error('Pass 2 candidate was not a played-game position');
  }
  if (!/Pha cần xem lại/.test(reviewText) || !/#\d+:/.test(reviewText) || !/Ninh mách/.test(reviewText)) {
    throw new Error(`Review fact did not render: ${reviewText}`);
  }

  await page.getByRole('button', { name: 'Đầu hàng' }).click();
  await page.getByRole('button', { name: 'Đầu hàng' }).last().click();
  await page.getByRole('button', { name: 'Xem bàn cờ' }).click();
  await page.getByRole('button', { name: 'Ván đấu' }).click();
  await page.getByRole('button', { name: new RegExp(`^1\\. ${playedHistory[0]}`) }).click();
  const navigation = await page.getByText(new RegExp(`1 / ${playedHistory.length}`)).innerText();
  const navigatedFen = await page.locator('.chess-board-container').getAttribute('data-fen').catch(() => null);

  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  await page.screenshot({ path: `${outputDir}/review-navigation.png`, fullPage: true });
  const result = {
    verdict: 'PASS',
    browser: 'Chromium',
    buildUrl: baseUrl,
    playedPlies: playedHistory.length,
    playedHistory,
    finalFen: replay.fen(),
    productionSource: 'stockfish_wasm',
    workerUrls: captured.workerUrls,
    passOnePositionCount: passOneSearches.length,
    expectedPassOnePositionCount: playedHistory.length + 1,
    passOneFens: passOneSearches.map(search => search.fen),
    passTwoPositionCount: passTwoSearches.length,
    passTwoFens: passTwoSearches.map(search => search.fen),
    reviewText,
    navigation,
    navigatedFen,
    reviewSearches,
    errors: { console: consoleErrors, page: pageErrors, network: networkErrors },
  };
  await writeFile(`${outputDir}/production.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/worker-messages.json`, `${JSON.stringify(captured.messages, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
