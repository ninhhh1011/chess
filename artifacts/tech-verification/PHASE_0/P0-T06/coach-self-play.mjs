import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const baseUrl = process.env.COACH_SELF_PLAY_BASE_URL || 'http://127.0.0.1:5174';
const outputDir = 'artifacts/tech-verification/PHASE_0/P0-T06';
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
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  const skipOnboarding = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skipOnboarding.isVisible()) await skipOnboarding.click();
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  const replay = new Chess();
  const preferred = ['e2e4', 'g1f3', 'd2d3'];
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
    const sanMoves = await history();
    replay.reset();
    for (const san of sanMoves) replay.move(san);
  }

  const sanMoves = await history();
  if (sanMoves.length !== 6) throw new Error(`Expected 6 plies, saw ${sanMoves.length}`);
  await page.getByRole('button', { name: 'Huấn luyện' }).click();
  await page.getByText('Nguồn: Diễn giải cơ bản · Không dùng AI').waitFor({ state: 'visible' });

  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/coach') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Nhận xét' }).click();
  const coachResponse = await responsePromise;
  const coachRequest = coachResponse.request().postDataJSON();
  const coachBody = await coachResponse.json();

  if (coachRequest.schemaVersion !== 'coach.v1') throw new Error(`Wrong request schema: ${coachRequest.schemaVersion}`);
  if (coachRequest.fen !== replay.fen()) throw new Error(`Coach FEN did not match played position: ${coachRequest.fen}`);
  if (coachBody.schemaVersion !== 'coach.v1' || coachBody.source !== 'basic' || coachBody.engineSource !== 'none') {
    throw new Error(`Unexpected degraded response: ${JSON.stringify(coachBody)}`);
  }
  await page.getByText('Diễn giải cơ bản', { exact: true }).waitFor({ state: 'visible' });
  if (await page.getByText('Nguồn: AI Coach', { exact: true }).count()) throw new Error('False AI Coach source disclosure');

  const worker = await page.evaluate(() => window.__workerEvidence);
  if (!worker.ready.some((entry) => entry.success === true) || !worker.bestmoves.length) {
    throw new Error('Missing real Stockfish worker evidence');
  }
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  await page.screenshot({ path: `${outputDir}/coach-self-play.png`, fullPage: true });
  console.log(JSON.stringify({
    verdict: 'PASS',
    route: '/play',
    plies: sanMoves.length,
    sanMoves,
    finalFen: replay.fen(),
    pgnReplay: 'PASS',
    engineSource: 'stockfish_wasm',
    coachRequest,
    coachResponse: coachBody,
    disclosure: 'Nguồn: Diễn giải cơ bản · Không dùng AI',
    providerFailure: 'unsupported configured provider degraded to basic',
    consoleErrors,
    pageErrors,
    networkErrors,
    worker,
  }, null, 2));
} finally {
  await browser.close();
}
