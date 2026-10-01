import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4194';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T06';
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
  localStorage.removeItem('vuaCoUserTrainingProfile');
  const NativeWorker = window.Worker;
  window.__factEvidence = { searches: [], fen: null };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      this.addEventListener('message', event => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string' || !line.startsWith('bestmove')) return;
        const search = window.__factEvidence.searches.findLast(item => !item.bestmove);
        if (search) search.bestmove = line.split(/\s+/)[1];
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        if (message.startsWith('position fen ')) window.__factEvidence.fen = message.slice(13);
        if (message.startsWith('go ')) {
          window.__factEvidence.searches.push({
            fen: window.__factEvidence.fen,
            command: message,
            bestmove: null,
            source: 'stockfish_wasm',
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
  const scored = game.moves({ verbose: true })
    .map(move => {
      const next = new Chess(game.fen());
      next.move(move);
      const score = Math.max(0, ...next.moves({ verbose: true })
        .filter(reply => reply.isCapture())
        .map(reply => values[reply.captured] || 0));
      return { move, score };
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
  count, { timeout: 30000 });
}

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Thử thách - Nâng cao' }).click();
  await page.getByRole('button', { name: 'Trắng - Bạn được đi trước' }).click();
  await page.getByRole('button', { name: 'Bắt đầu ván', exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  while ((await history()).length < 14) {
    const sanMoves = await history();
    const replay = new Chess();
    sanMoves.forEach(san => replay.move(san));
    if (replay.turn() === 'w') {
      await clickMove(chooseBadMove(replay));
      await waitForPly(sanMoves.length + 1);
    }
    if ((await history()).length < 14) await waitForPly(sanMoves.length + 2);
  }

  const displayedHistory = await history();
  const replay = new Chess();
  const beforeFens = [];
  for (const san of displayedHistory) {
    beforeFens.push(replay.fen());
    replay.move(san);
  }

  const searchStart = await page.evaluate(() => window.__factEvidence.searches.length);
  await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
  await page.getByRole('button', { name: /M. v.n c./i }).click();
  await page.getByRole('button', { name: /Đang mổ ván/ }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /M. v.n c./i }).waitFor({ state: 'visible', timeout: 120000 });

  const evidence = page.locator('[data-evidence-id]').first();
  await evidence.waitFor({ state: 'visible' });
  const selected = await evidence.evaluate(element => ({
    id: element.getAttribute('data-evidence-id'),
    engineSource: element.getAttribute('data-engine-source'),
    skillTags: (element.getAttribute('data-skill-tags') || '').split(',').filter(Boolean),
    playedUci: element.getAttribute('data-played-uci'),
    bestUci: element.getAttribute('data-best-uci'),
    text: element.textContent?.trim(),
  }));
  const match = selected.id?.match(/^review-\d+:ply:(\d+)$/);
  if (!match) throw new Error(`Invalid evidence ID: ${selected.id}`);
  const selectedPly = Number(match[1]);
  if (selected.engineSource !== 'stockfish_wasm') throw new Error(`Unexpected engine source: ${selected.engineSource}`);
  if (!selected.playedUci || !selected.bestUci) throw new Error('Move evidence is incomplete');

  const reviewSearches = await page.evaluate(start => window.__factEvidence.searches.slice(start), searchStart);
  const selectedSearches = reviewSearches.filter(search => search.fen === beforeFens[selectedPly - 1]);
  if (!selectedSearches.some(search => search.bestmove === selected.bestUci)) {
    throw new Error('Displayed best move does not resolve to the real Stockfish search for the selected fact');
  }

  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile') || 'null'));
  const tracedTags = selected.skillTags.filter(tag => tag !== 'unclassified');
  if (!tracedTags.every(tag => profile?.commonMistakes?.includes(tag))
    || profile?.commonMistakes?.includes('unclassified')) {
    throw new Error('Selected fact skill tags did not reach the learning profile');
  }

  await page.getByRole('button', { name: 'Đầu hàng' }).click();
  await page.getByRole('button', { name: 'Đầu hàng' }).last().click();
  await page.getByRole('button', { name: 'Xem bàn cờ' }).click();
  await evidence.click();
  const navigation = await page.getByText(new RegExp(`${selectedPly} / ${displayedHistory.length}`)).innerText();

  if (consoleErrors.length || pageErrors.length || networkErrors.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, networkErrors }));
  }

  await page.screenshot({ path: `${outputDir}/selected-fact.png`, fullPage: true });
  const result = {
    verdict: 'PASS',
    buildUrl: baseUrl,
    displayedHistory,
    finalFen: replay.fen(),
    selected,
    selectedFenBefore: beforeFens[selectedPly - 1],
    selectedStockfishSearches: selectedSearches,
    profileCommonMistakes: profile.commonMistakes,
    navigation,
    reviewSearchCount: reviewSearches.length,
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
