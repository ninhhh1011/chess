import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4178';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T03';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
const scenarios = [];

function history(page) {
  return page.locator('button span').evaluateAll((spans) => spans
    .map((span) => span.textContent?.trim() || '')
    .filter((value) => /^\d+\.\s+\S+/.test(value))
    .map((value) => value.replace(/^\d+\.\s+/, '')));
}

async function clickMove(page, uci) {
  for (const square of [uci.slice(0, 2), uci.slice(2, 4)]) {
    const box = await page.locator(`[data-square="${square}"]`).boundingBox();
    if (!box) throw new Error(`Square ${square} is not visible`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}

async function runScenario(color) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(`${color}: ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(`${color}: ${error.message}`));
  page.on('requestfailed', (request) => networkErrors.push(`${color}: ${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', (response) => {
    if (response.status() >= 400) networkErrors.push(`${color}: ${response.status()} ${response.url()}`);
  });

  await page.addInitScript(() => {
    localStorage.setItem('chess-app-onboarding', 'true');
    const NativeWorker = window.Worker;
    window.__cancellationEvidence = { workers: [], terminated: [], searches: [] };
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.__stockfish = String(url).includes('/stockfish-worker.js');
        this.__workerId = window.__cancellationEvidence.workers.length + 1;
        if (!this.__stockfish) return;
        window.__cancellationEvidence.workers.push({ id: this.__workerId, url: String(url) });
        this.addEventListener('message', (event) => {
          const line = event.data?.type === 'output' ? event.data.data : null;
          if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
          const search = window.__cancellationEvidence.searches
            .findLast((item) => item.workerId === this.__workerId && !item.bestmove);
          if (search) search.bestmove = line.split(/\s+/)[1];
        });
      }

      postMessage(message, ...rest) {
        if (this.__stockfish && typeof message === 'string' && message.startsWith('go ')) {
          window.__cancellationEvidence.searches.push({
            workerId: this.__workerId,
            command: message,
            bestmove: null,
          });
        }
        return super.postMessage(message, ...rest);
      }

      terminate() {
        if (this.__stockfish) window.__cancellationEvidence.terminated.push(this.__workerId);
        return super.terminate();
      }
    };
  });

  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.locator('div[aria-label] button').nth(3).click();
  await page.getByRole('button', {
    name: color === 'white' ? 'Trắng - Bạn được đi trước' : 'Đen - Máy đi trước',
  }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván', exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });
  if (color === 'white') await clickMove(page, 'e2e4');

  await page.waitForFunction(() => window.__cancellationEvidence.searches
    .some((search) => search.command === 'go movetime 1200' && !search.bestmove));
  const oldWorkerId = await page.evaluate(() => window.__cancellationEvidence.workers.at(-1).id);

  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.getByRole('button', { name: 'Ván mới', exact: true }).click();
  await page.waitForFunction((id) => window.__cancellationEvidence.terminated.includes(id), oldWorkerId);
  await page.waitForTimeout(1500);

  const afterReset = await history(page);
  if (color === 'white' && afterReset.length !== 0) throw new Error(`Stale move reached white game: ${afterReset}`);
  if (color === 'white') await clickMove(page, 'e2e4');

  await page.waitForFunction((id) => window.__cancellationEvidence.searches.some(
    (search) => search.workerId !== id && search.command === 'go movetime 1200' && search.bestmove
  ), oldWorkerId, { timeout: 30000 });
  await page.waitForFunction((expected) => [...document.querySelectorAll('button span')]
    .filter((span) => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length === expected,
  color === 'white' ? 2 : 1, { timeout: 30000 });

  const evidence = await page.evaluate((id) => ({
    lifecycle: window.__cancellationEvidence,
    oldSearch: window.__cancellationEvidence.searches.find(
      (search) => search.workerId === id && search.command === 'go movetime 1200'
    ),
    newSearch: window.__cancellationEvidence.searches.find(
      (search) => search.workerId !== id && search.command === 'go movetime 1200' && search.bestmove
    ),
  }), oldWorkerId);
  const finalHistory = await history(page);
  const position = new Chess();
  if (color === 'white') position.move('e4');
  const move = evidence.newSearch.bestmove;
  const legal = Boolean(position.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] }));

  if (evidence.oldSearch.bestmove !== null) throw new Error(`Terminated worker returned ${evidence.oldSearch.bestmove}`);
  if (!legal) throw new Error(`Replacement worker returned illegal move ${move}`);
  await page.screenshot({ path: `${outputDir}/${color}-new-game.png`, fullPage: true });
  await page.close();
  return { color, oldWorkerId, afterReset, finalHistory, legal, ...evidence };
}

try {
  scenarios.push(await runScenario('white'));
  scenarios.push(await runScenario('black'));
  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }
  const result = {
    verdict: 'PASS',
    browser: 'Chromium',
    buildUrl: baseUrl,
    scenarios,
    consoleErrors,
    pageErrors,
    networkErrors,
  };
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
