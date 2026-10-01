import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4182';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T05';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];

page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', error => pageErrors.push(error.message));
page.on('requestfailed', request => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', response => { if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`); });

await page.addInitScript(() => {
  localStorage.setItem('chess-app-onboarding', 'true');
  const NativeWorker = window.Worker;
  window.__analysisEvidence = { searches: [], fen: null };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      this.addEventListener('message', event => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
        const search = window.__analysisEvidence.searches.findLast(item => !item.bestmove);
        if (search) {
          search.bestmove = line.split(/\s+/)[1];
          search.source = 'stockfish_wasm';
        }
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        if (message.startsWith('position fen ')) window.__analysisEvidence.fen = message.slice(13);
        if (message.startsWith('go ')) {
          window.__analysisEvidence.searches.push({
            fen: window.__analysisEvidence.fen,
            command: message,
            bestmove: null,
            source: null,
          });
        }
      }
      return super.postMessage(message, ...rest);
    }
  };
});

function history() {
  return page.locator('button span').evaluateAll(spans => spans
    .map(span => span.textContent?.trim() || '')
    .filter(value => /^\d+\.\s+\S+/.test(value))
    .map(value => value.replace(/^\d+\.\s+/, '')));
}

async function clickMove(move) {
  for (const square of [move.from, move.to]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    if (!box) throw new Error(`Square ${square} is not visible`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

function chooseBadMove(game) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return game.moves({ verbose: true })
    .map(move => {
      const next = new Chess(game.fen());
      next.move(move);
      const capturable = next.moves({ verbose: true }).some(reply => reply.isCapture() && reply.to === move.to);
      const edgePawn = move.piece === 'p' && ['a', 'f', 'g', 'h'].includes(move.from[0]);
      return { move, score: (capturable ? values[move.piece] * 100 : 0) + (edgePawn ? 5 : 0) };
    })
    .sort((a, b) => b.score - a.score)[0].move;
}

async function waitForPly(count) {
  await page.waitForFunction(expected => [...document.querySelectorAll('button span')]
    .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30000 });
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.locator('div[aria-label] button').nth(2).click();
  await page.getByRole('button', { name: 'Trắng - Bạn được đi trước' }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván', exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  while ((await history()).length < 10) {
    const sanMoves = await history();
    const replay = new Chess();
    sanMoves.forEach(san => replay.move(san));
    if (replay.turn() === 'w') {
      await clickMove(chooseBadMove(replay));
      await waitForPly(sanMoves.length + 1);
    }
    if ((await history()).length < 10) await waitForPly(sanMoves.length + 2);
  }

  const displayedHistory = await history();
  const replay = new Chess();
  const expectedPassOneFens = [replay.fen()];
  for (const san of displayedHistory) {
    replay.move(san);
    expectedPassOneFens.push(replay.fen());
  }

  await page.waitForTimeout(1500);
  const searchStart = await page.evaluate(() => window.__analysisEvidence.searches.length);
  await page.getByRole('button', { name: 'Phân tích' }).click();
  await page.getByRole('button', { name: 'Mổ ván cờ' }).click();
  await page.getByRole('button', { name: 'Đang mổ ván...' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Mổ ván cờ' }).waitFor({ state: 'visible', timeout: 120000 });

  const reviewSearches = await page.evaluate(start => window.__analysisEvidence.searches.slice(start), searchStart);
  const reviewFens = reviewSearches.filter(search => search.command === 'go movetime 450');
  const passOneFens = reviewFens.slice(0, displayedHistory.length + 1).map(search => search.fen);
  const deepSearches = reviewFens.slice(displayedHistory.length + 1);
  const reviewPanel = page.locator('article').filter({ hasText: 'Review' });
  const reviewText = await reviewPanel.innerText();

  if (displayedHistory.length !== 10) throw new Error(`Expected 10 plies, got ${displayedHistory.length}`);
  if (JSON.stringify(passOneFens) !== JSON.stringify(expectedPassOneFens)) throw new Error('Pass 1 did not cover each game position exactly once');
  if (deepSearches.length < 1) throw new Error('Pass 2 selected no candidate');
  if (!deepSearches.every(search => expectedPassOneFens.slice(0, -1).includes(search.fen))) throw new Error('Pass 2 analyzed a non-game position');
  if (!reviewText.includes('Pha cần xem lại')) throw new Error('Review facts were not rendered');

  await page.getByRole('button', { name: 'Đầu hàng' }).click();
  await page.getByRole('button', { name: 'Đầu hàng' }).last().click();
  await page.getByRole('button', { name: 'Xem bàn cờ' }).click();
  await page.getByRole('button', { name: 'Ván đấu' }).click();
  await page.getByRole('button', { name: new RegExp(`^1\\. ${displayedHistory[0]}`) }).click();
  const navigation = await page.getByText(new RegExp(`1 / ${displayedHistory.length}`)).innerText();

  if (consoleErrors.length || pageErrors.length || networkErrors.length) throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));

  await page.screenshot({ path: `${outputDir}/review-navigation.png`, fullPage: true });
  const result = {
    verdict: 'PASS',
    buildUrl: baseUrl,
    displayedHistory,
    finalFen: replay.fen(),
    passOnePositions: passOneFens.length - 1,
    passOneFens,
    passTwoPositions: deepSearches.length,
    passTwoFens: deepSearches.map(search => search.fen),
    reviewText,
    navigation,
    realEngineSearches: reviewFens,
    errors: { console: consoleErrors, page: pageErrors, network: networkErrors },
  };
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
