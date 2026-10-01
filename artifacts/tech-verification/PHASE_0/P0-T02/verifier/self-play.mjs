import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const baseUrl = 'http://127.0.0.1:4176';
const outputDir = 'artifacts/tech-verification/PHASE_0/P0-T02/verifier';
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
    .filter((text) => /^\d+\.\s+\S+/.test(text))
    .map((text) => text.replace(/^\d+\.\s+/, '')));
}

async function clickSquare(square) {
  const board = await page.locator('.chess-board-container').boundingBox();
  if (!board) throw new Error('Chessboard is not visible');
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  await page.mouse.click(board.x + (file + 0.5) * board.width / 8, board.y + (8 - rank + 0.5) * board.height / 8);
}

try {
  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skip.isVisible()) await skip.click();
  const notice = page.locator('[role="status"]').filter({ hasText: 'corpus' });
  await notice.waitFor({ state: 'visible' });
  const corpusText = (await notice.textContent())?.trim() || '';
  if (!corpusText.includes('Kho bài tập mở rộng chưa khả dụng') ||
      !corpusText.includes('5 bài tập tích hợp') ||
      !corpusText.includes('không phải corpus bên ngoài')) {
    throw new Error(`Corpus notice is not truthful: ${corpusText}`);
  }

  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  const replay = new Chess();
  for (const uci of ['e2e4', 'g1f3', 'd2d3']) {
    const legal = replay.moves({ verbose: true });
    const move = legal.find((candidate) => `${candidate.from}${candidate.to}` === uci)
      || legal.find((candidate) => !candidate.promotion);
    if (!move) throw new Error(`No legal player move for ${uci}`);
    const priorPlies = (await moveHistory()).length;
    await clickSquare(move.from);
    await clickSquare(move.to);
    await page.waitForFunction((count) => [...document.querySelectorAll('button span')]
      .map((span) => span.textContent?.trim() || '')
      .filter((text) => /^\d+\.\s+\S+/.test(text)).length >= count, priorPlies + 2, { timeout: 30000 });
    const sanMoves = await moveHistory();
    replay.reset();
    for (const san of sanMoves) replay.move(san);
    if (replay.turn() !== 'w') throw new Error(`Expected White after ${sanMoves.length} plies`);
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
    verdict: 'PASS',
    cleanCheckout: 'C:/Users/nguye/AppData/Local/Temp/chess-p0-t02-verifier-20260905-193707',
    corpusText,
    route: '/play',
    browser: 'Chromium',
    viewport: '1440x900',
    difficulty: 'easy',
    playerColor: 'white',
    plies: sanMoves.length,
    sanMoves,
    finalFen: replay.fen(),
    pgnReplay: 'PASS',
    engineSource: 'stockfish_wasm',
    worker,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
