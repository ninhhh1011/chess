import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173';
const output = path.resolve('artifacts/tech-verification/PHASE_2/P2-T07');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
const corpusResponses = [];
const productionAssets = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
page.on('response', (response) => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
  if (response.url().includes('/corpus/')) corpusResponses.push({ url: response.url(), status: response.status() });
  if (/\/assets\/[^/]+-[A-Za-z0-9_-]+\.(?:js|css)$/.test(response.url())) productionAssets.push(response.url());
});
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__p2t07Stockfish = { starts: [], ready: [], bestmoves: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      if (String(url).includes('stockfish-worker.js')) {
        window.__p2t07Stockfish.starts.push(String(url));
        this.addEventListener('message', (event) => {
          if (event.data?.type === 'ready') window.__p2t07Stockfish.ready.push(event.data);
          if (event.data?.type === 'output' && String(event.data.data).startsWith('bestmove')) {
            window.__p2t07Stockfish.bestmoves.push(event.data.data);
          }
        });
      }
    }
  };
});

try {
  await page.goto(`${baseUrl}/exercises`, { waitUntil: 'networkidle' });
  await page.getByText('Lichess puzzle 0000D').waitFor({ timeout: 30000 });
  const sourceHref = await page.getByRole('link', { name: 'Lichess' }).getAttribute('href');
  const licenseHref = await page.getByRole('link', { name: 'CC0-1.0' }).getAttribute('href');
  assert.equal(sourceHref, 'https://lichess.org/training/0000D');
  assert.equal(licenseHref, 'https://creativecommons.org/publicdomain/zero/1.0/');
  assert.equal(corpusResponses.length, 3);
  assert(corpusResponses.every(({ status }) => status === 200));
  await page.screenshot({ path: path.join(output, 'real-puzzle.png'), fullPage: true });

  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  const skip = page.getByRole('button', { name: 'Bỏ qua' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.getByRole('button', { name: /^Dễ -/ }).click();
  await page.getByRole('button', { name: /^Trắng -/ }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  const moveHistory = () => page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '').filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
  async function clickSquare(square) {
    const boardBox = await page.locator('.chess-board-container').boundingBox();
    assert(boardBox, 'Chessboard is not visible');
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    await page.mouse.click(boardBox.x + (file + 0.5) * boardBox.width / 8, boardBox.y + (8 - rank + 0.5) * boardBox.height / 8);
  }
  const replay = new Chess();
  for (const preferred of ['e2e4', 'g1f3', 'd2d3']) {
    const legal = replay.moves({ verbose: true });
    const move = legal.find((candidate) => `${candidate.from}${candidate.to}` === preferred)
      || legal.find((candidate) => !candidate.promotion);
    assert(move);
    const before = (await moveHistory()).length;
    await clickSquare(move.from);
    await clickSquare(move.to);
    await page.waitForFunction((count) => [...document.querySelectorAll('button span')]
      .map((span) => span.textContent?.trim() || '').filter((value) => /^\d+\.\s+\S+/.test(value)).length >= count,
    before + 2, { timeout: 30000 });
    replay.reset();
    for (const san of await moveHistory()) replay.move(san);
  }
  const sanMoves = await moveHistory();
  const worker = await page.evaluate(() => window.__p2t07Stockfish);
  assert(sanMoves.length >= 6 && worker.starts.length && worker.ready.some(({ success }) => success) && worker.bestmoves.length >= 3);
  assert(productionAssets.length && !consoleErrors.length && !pageErrors.length && !networkErrors.length);
  await page.screenshot({ path: path.join(output, 'six-ply.png'), fullPage: true });
  const result = {
    verdict: 'PASS', baseUrl, productionAssets: [...new Set(productionAssets)],
    corpus: { puzzleId: 'lichess-0000D', sourceHref, licenseHref, responses: corpusResponses },
    selfPlay: { plies: sanMoves.length, sanMoves, finalFen: replay.fen(), engineSource: 'stockfish_wasm', worker },
    consoleErrors, pageErrors, networkErrors,
  };
  await writeFile(path.join(output, 'production.json'), `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}
