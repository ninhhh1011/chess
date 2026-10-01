import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4175';
const outputDir = process.env.SELF_PLAY_OUTPUT_DIR || 'artifacts/tech-verification/PHASE_0/P0-T02';
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

async function clickSquare(square) {
  const box = await page.locator('.chess-board-container').boundingBox();
  if (!box) throw new Error('Chessboard is not visible');
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  await page.mouse.click(box.x + (file + 0.5) * box.width / 8, box.y + (8 - rank + 0.5) * box.height / 8);
}

try {
  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  const skipOnboarding = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skipOnboarding.isVisible()) await skipOnboarding.click();
  const corpusNotice = page.getByText(/Kho bài tập mở rộng chưa khả dụng/);
  await corpusNotice.waitFor({ state: 'visible' });
  const corpusText = (await corpusNotice.textContent())?.trim() || '';
  if (!corpusText.includes('Kho bài tập mở rộng chưa khả dụng')) {
    throw new Error(`Missing truthful corpus notice: ${corpusText}`);
  }

  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  const replay = new Chess();
  const preferred = ['e2e4', 'g1f3', 'd2d3'];
  const counts = [];

  for (let round = 0; round < 3; round += 1) {
    const legal = replay.moves({ verbose: true });
    const choice = legal.find((move) => `${move.from}${move.to}` === preferred[round]) || legal.find((move) => !move.promotion);
    if (!choice) throw new Error(`No player move available in round ${round + 1}`);
    const before = (await history()).length;
    await clickSquare(choice.from);
    await clickSquare(choice.to);
    await page.waitForFunction((count) => {
      const moves = [...document.querySelectorAll('button span')]
        .map((span) => span.textContent?.trim() || '')
        .filter((value) => /^\d+\.\s+\S+/.test(value));
      return moves.length >= count;
    }, before + 2, { timeout: 30000 });
    await page.waitForTimeout(500);
    const sanMoves = await history();
    if (sanMoves.length !== before + 2) throw new Error(`Expected ${before + 2} plies, saw ${sanMoves.length}`);
    replay.reset();
    for (const san of sanMoves) replay.move(san);
    if (replay.turn() !== 'w') throw new Error(`Wrong turn after ${sanMoves.length} plies`);
    counts.push(sanMoves.length);
  }

  const sanMoves = await history();
  const worker = await page.evaluate(() => window.__workerEvidence);
  if (!worker.starts.length || !worker.ready.some((entry) => entry.success === true) || !worker.bestmoves.length) {
    throw new Error('Missing real Stockfish worker evidence');
  }
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }
  await page.screenshot({ path: `${outputDir}/self-play.png`, fullPage: true });
  console.log(JSON.stringify({
    verdict: 'PASS',
    corpusText,
    route: '/play',
    browser: 'Chromium',
    viewport: '1440x900',
    difficulty: 'easy',
    playerColor: 'white',
    counts,
    plies: sanMoves.length,
    sanMoves,
    finalFen: replay.fen(),
    pgnReplay: 'PASS',
    engineSource: 'stockfish_wasm',
    consoleErrors,
    pageErrors,
    networkErrors,
    worker,
  }, null, 2));
} finally {
  await browser.close();
}
