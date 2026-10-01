import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const url = 'http://127.0.0.1:4174/play';
const outputDir = 'artifacts/tech-verification/PHASE_0/P0-T01/verifier';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const networkErrors = [];

page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});

await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__workerEvidence = { starts: [], commands: [], ready: [], bestmoves: [] };
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
        const nativePostMessage = this.postMessage.bind(this);
        this.postMessage = (message, transfer) => {
          window.__workerEvidence.commands.push(message);
          return transfer === undefined ? nativePostMessage(message) : nativePostMessage(message, transfer);
        };
      }
    }
  };
});

function history() {
  return page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '')
    .filter((text) => /^\d+\.\s+\S+/.test(text))
    .map((text) => text.replace(/^\d+\.\s+/, '')));
}

async function clickSquare(square) {
  const box = await page.locator('.chess-board-container').boundingBox();
  if (!box) throw new Error('Chessboard is not visible');
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  await page.mouse.click(box.x + (file + 0.5) * box.width / 8, box.y + (8 - rank + 0.5) * box.height / 8);
}

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  const skipOnboarding = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skipOnboarding.isVisible()) await skipOnboarding.click();
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
    if (!choice) throw new Error(`No non-promotion player move available in round ${round + 1}`);
    const before = (await history()).length;
    await clickSquare(choice.from);
    await clickSquare(choice.to);
    await page.waitForFunction((count) => {
      const moves = [...document.querySelectorAll('button span')]
        .map((span) => span.textContent?.trim() || '')
        .filter((text) => /^\d+\.\s+\S+/.test(text));
      return moves.length >= count;
    }, before + 2, { timeout: 30000 });
    await page.waitForTimeout(500);
    const sanMoves = await history();
    if (sanMoves.length !== before + 2) throw new Error(`Expected ${before + 2} plies, saw ${sanMoves.length}`);
    replay.reset();
    for (const san of sanMoves) {
      const applied = replay.move(san);
      if (!applied) throw new Error(`Illegal SAN from UI: ${san}`);
    }
    if (replay.turn() !== 'w') throw new Error(`Wrong turn after ${sanMoves.length} plies: ${replay.turn()}`);
    counts.push(sanMoves.length);
  }

  await page.waitForTimeout(1000);
  const sanMoves = await history();
  const finalFen = replay.fen();
  new Chess(finalFen);
  const worker = await page.evaluate(() => window.__workerEvidence);
  if (!worker.starts.length) throw new Error('Outer Stockfish worker never started');
  if (!worker.ready.some((entry) => entry.success === true)) throw new Error('Outer Stockfish worker never emitted ready success');
  if (!worker.bestmoves.length) throw new Error('Outer Stockfish worker emitted no bestmove');
  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  if (networkErrors.length) throw new Error(`Network errors: ${networkErrors.join(' | ')}`);

  await page.screenshot({ path: `${outputDir}/self-play.png`, fullPage: true });
  console.log(JSON.stringify({
    verdict: 'PASS',
    route: url,
    browser: 'Chromium',
    difficulty: 'easy',
    playerColor: 'white',
    counts,
    plies: sanMoves.length,
    sanMoves,
    finalFen,
    replay: 'PASS',
    turnOrder: 'PASS',
    pageErrors,
    networkErrors,
    worker,
  }, null, 2));
} finally {
  await browser.close();
}
