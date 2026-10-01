import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VERIFIER_BASE_URL || 'http://127.0.0.1:4181';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T04/verifier';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => {
  networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
});
page.on('response', (response) => {
  if (response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});

await page.addInitScript(() => {
  localStorage.setItem('chess-app-onboarding', 'true');
  const NativeWorker = window.Worker;
  window.__p1t04Verifier = { searches: [], workerUrls: [] };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      window.__p1t04Verifier.workerUrls.push(String(url));
      this.addEventListener('message', (event) => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
        const search = window.__p1t04Verifier.searches.findLast((item) => !item.bestmove);
        if (search) search.bestmove = line.split(/\s+/)[1];
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string' && message.startsWith('go ')) {
        window.__p1t04Verifier.searches.push({ command: message, bestmove: null });
      }
      return super.postMessage(message, ...rest);
    }
  };
});

const history = () => page.locator('button span').evaluateAll((spans) => spans
  .map((span) => span.textContent?.trim() || '')
  .filter((value) => /^\d+\.\s+\S+/.test(value))
  .map((value) => value.replace(/^\d+\.\s+/, '')));

async function clickMove(move) {
  for (const square of [move.from, move.to]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    if (!box) throw new Error(`Square ${square} is not visible`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

async function waitForPly(count) {
  await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30_000 });
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.locator('div[aria-label] button').nth(2).click();
  await page.getByRole('button', { name: 'Trắng - Bạn được đi trước' }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván', exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  while ((await history()).length < 10) {
    const before = await history();
    const replay = new Chess();
    for (const san of before) replay.move(san);
    if (replay.turn() === 'w') {
      const move = replay.moves({ verbose: true }).find((candidate) => !candidate.isCapture() && !candidate.promotion)
        || replay.moves({ verbose: true })[0];
      await clickMove(move);
      await waitForPly(before.length + 1);
    }
    if ((await history()).length < 10) await waitForPly(before.length + 2);
  }

  const displayedHistory = await history();
  await page.locator('button[title="Sao ch\u00e9p PGN"]').click();
  const exportedPgn = await page.evaluate(() => navigator.clipboard.readText());
  const replay = new Chess();
  replay.loadPgn(exportedPgn);
  const replayedHistory = replay.history();
  const engineEvidence = await page.evaluate(() => window.__p1t04Verifier);

  if (displayedHistory.length < 10) throw new Error(`Expected 10+ plies, got ${displayedHistory.length}`);
  if (JSON.stringify(displayedHistory) !== JSON.stringify(replayedHistory)) {
    throw new Error('Clipboard PGN replay differs from displayed history');
  }
  if (!engineEvidence.workerUrls.length || !engineEvidence.searches.some((search) => search.bestmove)) {
    throw new Error('No completed real Stockfish worker search observed');
  }
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  await page.screenshot({ path: `${outputDir}/production-export.png`, fullPage: true });
  const result = {
    verdict: 'PASS',
    browser: 'Chromium',
    buildUrl: baseUrl,
    plies: displayedHistory.length,
    displayedHistory,
    exportedPgn,
    replayedHistory,
    finalFen: replay.fen(),
    engineEvidence,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await writeFile(`${outputDir}/production.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
