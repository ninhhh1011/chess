import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.VERIFIER_BASE_URL || 'http://127.0.0.1:4207';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T07/verifier';
await mkdir(outputDir, { recursive: true });

const score = ({ type, value }) => type === 'cp'
  ? value
  : value > 0 ? 100_000 - value * 100 : -100_000 - value * 100;

const expectedCpl = fact => Math.max(0, Math.round(fact.turn === 'w'
  ? score(fact.evalBefore) - score(fact.evalAfter)
  : score(fact.evalAfter) - score(fact.evalBefore)));

const expectedClassification = cpl => cpl === 0 ? 'best'
  : cpl <= 10 ? 'excellent'
    : cpl <= 30 ? 'good'
      : cpl <= 80 ? 'inaccuracy'
        : cpl <= 200 ? 'mistake' : 'blunder';

function parseEval(raw) {
  const [type, value] = raw.split(':');
  if (!['cp', 'mate'].includes(type) || !Number.isFinite(Number(value))) throw new Error(`Bad evaluation ${raw}`);
  return { type, value: Number(value) };
}

function replayUci(fen, moves) {
  const game = new Chess(fen);
  for (const uci of moves) {
    const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!move) throw new Error(`Illegal PV ${uci} from ${game.fen()}`);
  }
  return game.fen();
}

const browser = await chromium.launch({ headless: true });

async function verifySide(side) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = { console: [], page: [], network: [] };

  page.on('console', message => { if (message.type() === 'error') errors.console.push(message.text()); });
  page.on('pageerror', error => errors.page.push(error.message));
  page.on('requestfailed', request => errors.network.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) errors.network.push(`${response.status()} ${response.url()}`); });

  await page.addInitScript(() => {
    localStorage.setItem('chess-app-onboarding', 'true');
    const NativeWorker = window.Worker;
    window.__p1t07 = { currentFen: null, workers: [], searches: [] };
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.__stockfish = String(url).includes('/stockfish-worker.js');
        if (!this.__stockfish) return;
        window.__p1t07.workers.push(String(url));
        this.addEventListener('message', event => {
          const line = event.data?.type === 'output' ? event.data.data : null;
          if (typeof line !== 'string') return;
          const search = window.__p1t07.searches.findLast(item => !item.bestmove);
          if (!search) return;
          const info = line.match(/^info .*score (cp|mate) (-?\d+).*\spv\s(.+)$/);
          if (info) search.latest = {
            evaluation: { type: info[1], value: Number(info[2]) },
            pv: info[3].trim().split(/\s+/),
          };
          if (line.startsWith('bestmove ')) search.bestmove = line.split(/\s+/)[1];
        });
      }

      postMessage(message, ...rest) {
        if (this.__stockfish && typeof message === 'string') {
          if (message.startsWith('position fen ')) window.__p1t07.currentFen = message.slice(13);
          if (message.startsWith('go ')) window.__p1t07.searches.push({
            fen: window.__p1t07.currentFen,
            command: message,
            bestmove: null,
            latest: null,
          });
        }
        return super.postMessage(message, ...rest);
      }
    };
  });

  const history = () => page.locator('button span').evaluateAll(spans => spans
    .map(span => span.textContent?.trim() || '')
    .filter(text => /^\d+\.\s+\S+/.test(text))
    .map(text => text.replace(/^\d+\.\s+/, '')));

  const waitForNextPly = count => page.waitForFunction(previous => [...document.querySelectorAll('button span')]
    .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length > previous,
  count, { timeout: 30_000 });

  async function clickMove(move) {
    for (const square of [move.from, move.to]) {
      const box = await page.locator(`[data-square="${square}"]`).boundingBox();
      if (!box) throw new Error(`Missing square ${square}`);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  function deliberatelyWeakMove(game) {
    const pieceValue = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    return game.moves({ verbose: true }).map(move => {
      const next = new Chess(game.fen());
      next.move(move);
      const exposed = Math.max(0, ...next.moves({ verbose: true })
        .filter(reply => reply.isCapture())
        .map(reply => pieceValue[reply.captured] || 0));
      return { move, exposed };
    }).sort((a, b) => b.exposed - a.exposed || pieceValue[b.move.piece] - pieceValue[a.move.piece])[0].move;
  }

  try {
    await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
    const scripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src));
    if (!scripts.some(src => src.includes('/assets/')) || scripts.some(src => src.includes('/src/'))) {
      throw new Error(`Not a production bundle: ${scripts.join(', ')}`);
    }

    await page.getByRole('button', { name: /^Thử thách -/ }).click();
    await page.getByRole('button', { name: side === 'w' ? /^Trắng -/ : /^Đen -/ }).click();
    await page.getByRole('button', { name: /^Bắt đầu ván$/ }).click();
    await page.locator('.chess-board-container').waitFor({ state: 'visible' });

    while ((await history()).length < 14) {
      const moves = await history();
      const game = new Chess();
      for (const san of moves) game.move(san);
      if (game.isGameOver()) throw new Error(`Game ended at ${moves.length} plies`);
      if (game.turn() === side) await clickMove(deliberatelyWeakMove(game));
      await waitForNextPly(moves.length);
    }

    const moves = await history();
    const replay = new Chess();
    const beforeFens = [];
    for (const san of moves) {
      beforeFens.push(replay.fen());
      if (!replay.move(san)) throw new Error(`Illegal played SAN ${san}`);
    }

    const reviewSearchStart = await page.evaluate(() => window.__p1t07.searches.length);
    await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
    await page.locator('article').filter({ hasText: 'Review' }).getByRole('button').first().click();
    await page.locator('[data-evidence-id]').first().waitFor({ state: 'visible', timeout: 120_000 });

    const facts = await page.locator('[data-evidence-id]').evaluateAll(nodes => nodes.map(node => ({
      evidenceId: node.dataset.evidenceId,
      source: node.dataset.engineSource,
      turn: node.dataset.turn,
      cpl: Number(node.dataset.centipawnLoss),
      classification: node.dataset.classification,
      evalBefore: node.dataset.evalBefore,
      evalAfter: node.dataset.evalAfter,
      playedUci: node.dataset.playedUci,
      bestUci: node.dataset.bestUci,
      label: node.textContent?.trim(),
    })));

    for (const fact of facts) {
      fact.ply = Number(fact.evidenceId.match(/:ply:(\d+)$/)?.[1]);
      fact.evalBefore = parseEval(fact.evalBefore);
      fact.evalAfter = parseEval(fact.evalAfter);
      if (!fact.ply || fact.source !== 'stockfish_wasm' || !['w', 'b'].includes(fact.turn)) {
        throw new Error(`Invalid UI fact ${JSON.stringify(fact)}`);
      }
      const calculated = expectedCpl(fact);
      if (fact.cpl !== calculated || fact.cpl < 0) throw new Error(`CPL mismatch ${JSON.stringify({ fact, calculated })}`);
      const classification = expectedClassification(calculated);
      if (fact.classification !== classification) throw new Error(`Classification mismatch ${JSON.stringify({ fact, classification })}`);
      replayUci(beforeFens[fact.ply - 1], [fact.playedUci]);
      replayUci(beforeFens[fact.ply - 1], [fact.bestUci]);
    }

    const sideFact = facts.find(fact => fact.turn === side);
    if (!sideFact) throw new Error(`No displayed ${side} fact`);

    const trace = await page.evaluate(start => ({
      workers: window.__p1t07.workers,
      searches: window.__p1t07.searches.slice(start),
    }), reviewSearchStart);
    const completed = trace.searches.filter(search => search.bestmove && search.latest?.pv?.length);
    for (const search of completed) {
      replayUci(search.fen, search.latest.pv);
      if (search.latest.pv[0] !== search.bestmove) search.finalPvWasNormalized = true;
    }
    const matching = trace.searches.filter(search => search.fen === beforeFens[sideFact.ply - 1]
      && search.bestmove === sideFact.bestUci);
    if (!trace.workers.length || !completed.length || !matching.length) {
      throw new Error(`Missing real worker correlation ${JSON.stringify({ workers: trace.workers, completed: completed.length, matching })}`);
    }

    await page.screenshot({ path: `${outputDir}/${side === 'w' ? 'white' : 'black'}-review.png`, fullPage: true });
    if (Object.values(errors).some(items => items.length)) throw new Error(`Browser errors ${JSON.stringify(errors)}`);

    return {
      side,
      productionScripts: scripts,
      plies: moves.length,
      finalFen: replay.fen(),
      displayedFacts: facts,
      sideFact,
      stockfishWorkerUrls: trace.workers,
      reviewSearchCount: trace.searches.length,
      legalLatestPvCount: completed.length,
      matchedWorkerSearches: matching,
      errors,
    };
  } finally {
    await context.close();
  }
}

try {
  const runs = [await verifySide('w'), await verifySide('b')];
  const result = { verdict: 'PASS', baseUrl, runs };
  await writeFile(`${outputDir}/production.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(runs.flatMap(run => run.errors.console), null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(runs.flatMap(run => run.errors.page), null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(runs.flatMap(run => run.errors.network), null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
