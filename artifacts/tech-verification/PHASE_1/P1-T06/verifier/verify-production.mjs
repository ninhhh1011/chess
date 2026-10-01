import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VERIFIER_BASE_URL || 'http://127.0.0.1:4195';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T06/verifier';
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
  window.__p1t06Verifier = { workerUrls: [], searches: [], currentFen: null };
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      this.__stockfish = String(url).includes('/stockfish-worker.js');
      if (!this.__stockfish) return;
      window.__p1t06Verifier.workerUrls.push(String(url));
      this.addEventListener('message', event => {
        const line = event.data?.type === 'output' ? event.data.data : null;
        if (typeof line !== 'string') return;
        const search = window.__p1t06Verifier.searches.findLast(item => !item.bestmove);
        if (!search) return;
        if (line.startsWith('info ')) {
          const match = line.match(/(?:^|\s)pv\s+(\S+)/);
          if (match) search.infoPvHeads.push(match[1]);
        }
        if (line.startsWith('bestmove')) search.bestmove = line.split(/\s+/)[1];
      });
    }

    postMessage(message, ...rest) {
      if (this.__stockfish && typeof message === 'string') {
        if (message.startsWith('position fen ')) window.__p1t06Verifier.currentFen = message.slice(13);
        if (message.startsWith('go ')) {
          window.__p1t06Verifier.searches.push({
            fen: window.__p1t06Verifier.currentFen,
            command: message,
            bestmove: null,
            infoPvHeads: [],
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

function chooseBadMove(game) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const scored = game.moves({ verbose: true }).map(move => {
    const next = new Chess(game.fen());
    next.move(move);
    const replyValue = Math.max(0, ...next.moves({ verbose: true })
      .filter(reply => reply.isCapture())
      .map(reply => values[reply.captured] || 0));
    return { move, replyValue };
  }).sort((a, b) => b.replyValue - a.replyValue);
  return scored[0].replyValue > 0
    ? scored[0].move
    : scored.find(({ move }) => move.piece === 'p')?.move || scored[0].move;
}

async function waitForPly(count) {
  await page.waitForFunction(expected => [...document.querySelectorAll('button span')]
    .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30_000 });
}

function legalUci(fen, uci) {
  try {
    return Boolean(new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }));
  } catch {
    return false;
  }
}

const failures = [];
let result;

try {
  await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /N.ng cao/ }).click();
  await page.getByRole('button', { name: /Tr.ng.*tr..c/ }).click();
  await page.getByRole('button', { name: /B.t .*.u v.n/, exact: true }).click();
  await page.locator('.chess-board-container').waitFor({ state: 'visible' });

  while ((await history()).length < 14) {
    const moves = await history();
    const replay = new Chess();
    moves.forEach(san => replay.move(san));
    if (replay.turn() === 'w') {
      await clickMove(chooseBadMove(replay));
      await waitForPly(moves.length + 1);
    }
    if ((await history()).length < 14) await waitForPly(moves.length + 2);
  }

  const playedHistory = await history();
  const replay = new Chess();
  const positionChain = [replay.fen()];
  playedHistory.forEach(san => { replay.move(san); positionChain.push(replay.fen()); });

  const searchStart = await page.evaluate(() => window.__p1t06Verifier.searches.length);
  await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
  await page.getByRole('button', { name: /M. v.n c./i }).click();
  await page.getByRole('button', { name: /.*ang m. v.n/ }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /M. v.n c./i }).waitFor({ state: 'visible', timeout: 120_000 });

  const evidence = await page.locator('[data-evidence-id]').evaluateAll(elements => elements.map(element => ({
    id: element.getAttribute('data-evidence-id'),
    engineSource: element.getAttribute('data-engine-source'),
    skillTags: (element.getAttribute('data-skill-tags') || '').split(',').filter(Boolean),
    playedUci: element.getAttribute('data-played-uci'),
    bestUci: element.getAttribute('data-best-uci'),
    text: element.textContent?.trim(),
  })));
  const captured = await page.evaluate(start => ({
    workerUrls: window.__p1t06Verifier.workerUrls,
    searches: window.__p1t06Verifier.searches.slice(start),
  }), searchStart);
  const reviewSearches = captured.searches.filter(search => search.command === 'go movetime 450');
  const passOne = reviewSearches.slice(0, positionChain.length);
  const passTwo = reviewSearches.slice(positionChain.length);

  if (playedHistory.length < 10) failures.push(`expected >=10 plies, got ${playedHistory.length}`);
  if (!captured.workerUrls.some(url => url.includes('/stockfish-worker.js'))) failures.push('Stockfish WASM worker not observed');
  if (JSON.stringify(passOne.map(search => search.fen)) !== JSON.stringify(positionChain)) failures.push('pass-one FEN chain not exact');
  if (!reviewSearches.every(search => search.bestmove)) failures.push('review search missing final bestmove');
  if (!evidence.length) failures.push('no real review facts rendered');

  const facts = evidence.map(item => {
    const match = item.id?.match(/^review-\d+:ply:(\d+)$/);
    const ply = match ? Number(match[1]) : NaN;
    const fenBefore = positionChain[ply - 1];
    const matchingSearches = reviewSearches.filter(search => search.fen === fenBefore);
    return { ...item, ply, fenBefore, matchingSearches };
  });
  facts.forEach(fact => {
    if (!Number.isInteger(fact.ply)) failures.push(`invalid evidence ID: ${fact.id}`);
    if (fact.engineSource !== 'stockfish_wasm') failures.push(`invalid engine source: ${fact.id}`);
    if (!fact.fenBefore || !legalUci(fact.fenBefore, fact.playedUci || '')) failures.push(`illegal played move: ${fact.id}`);
    if (!fact.fenBefore || !legalUci(fact.fenBefore, fact.bestUci || '')) failures.push(`illegal best move: ${fact.id}`);
    if (!fact.matchingSearches.some(search => search.bestmove === fact.bestUci)) failures.push(`best move has no real search: ${fact.id}`);
  });

  const stalePvFact = facts.find(fact => fact.matchingSearches.some(search =>
    search.bestmove === fact.bestUci && search.infoPvHeads.some(head => head !== search.bestmove)));
  if (!stalePvFact) failures.push('no selected fact exercised stale info-PV versus final bestmove normalization');

  const canonicalTags = [...new Set(facts.flatMap(fact => fact.skillTags).filter(tag => tag !== 'unclassified'))];
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('vuaCoUserTrainingProfile') || 'null'));
  if (!canonicalTags.every(tag => profile?.commonMistakes?.includes(tag))) failures.push('canonical fact tags did not reach learning profile');
  if (profile?.commonMistakes?.includes('unclassified')) failures.push('unclassified leaked into learning profile');

  await page.getByRole('button', { name: /.*.u h.ng/ }).click();
  await page.getByRole('button', { name: /.*.u h.ng/ }).last().click();
  await page.getByRole('button', { name: /Xem b.n c./ }).click();
  const chosen = stalePvFact || facts[0];
  await page.locator(`[data-evidence-id="${chosen.id}"]`).click();
  const navigation = await page.getByText(new RegExp(`${chosen.ply} / ${playedHistory.length}`)).innerText();

  if (consoleErrors.length || pageErrors.length || networkErrors.length) failures.push('browser emitted console/page/network errors');
  await page.screenshot({ path: `${outputDir}/selected-fact.png`, fullPage: true });

  result = {
    verdict: failures.length ? 'FAIL' : 'PASS',
    buildUrl: baseUrl,
    playedPlies: playedHistory.length,
    playedHistory,
    finalFen: replay.fen(),
    workerUrls: captured.workerUrls,
    passOnePositionCount: passOne.length,
    expectedPassOnePositionCount: positionChain.length,
    passTwoPositionCount: passTwo.length,
    facts,
    stalePvFactId: stalePvFact?.id || null,
    canonicalTags,
    profileCommonMistakes: profile?.commonMistakes || null,
    navigation,
    errors: { console: consoleErrors, page: pageErrors, network: networkErrors },
    failures,
  };
} catch (error) {
  result = {
    verdict: 'FAIL',
    buildUrl: baseUrl,
    failures: [...failures, error instanceof Error ? error.stack || error.message : String(error)],
    errors: { console: consoleErrors, page: pageErrors, network: networkErrors },
  };
} finally {
  await writeFile(`${outputDir}/production.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(consoleErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(pageErrors, null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(networkErrors, null, 2)}\n`);
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
if (result.verdict !== 'PASS') process.exitCode = 1;
