import { chromium } from '@playwright/test';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SELF_PLAY_BASE_URL || 'http://127.0.0.1:4197';
const outputDir = 'artifacts/tech-verification/PHASE_1/P1-T07';
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

function score({ type, value }) {
  return type === 'cp' ? value : value > 0 ? 100_000 - value * 100 : -100_000 - value * 100;
}

function expectedCpl(fact) {
  const before = score(fact.evalBefore);
  const after = score(fact.evalAfter);
  return Math.max(0, Math.round(fact.turn === 'w' ? before - after : after - before));
}

function expectedClassification(cpl) {
  if (cpl === 0) return 'best';
  if (cpl <= 10) return 'excellent';
  if (cpl <= 30) return 'good';
  if (cpl <= 80) return 'inaccuracy';
  if (cpl <= 200) return 'mistake';
  return 'blunder';
}

function parseEval(value) {
  const [type, raw] = value.split(':');
  return { type, value: Number(raw) };
}

function replayPv(fen, pv) {
  const game = new Chess(fen);
  for (const uci of pv) {
    game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  }
}

async function runSide(side) {
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
    window.__orientationEvidence = { searches: [], fen: null };
    window.Worker = class extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        this.__stockfish = String(url).includes('/stockfish-worker.js');
        if (!this.__stockfish) return;
        this.addEventListener('message', event => {
          const line = event.data?.type === 'output' ? event.data.data : null;
          if (typeof line !== 'string') return;
          const search = window.__orientationEvidence.searches.findLast(item => !item.bestmove);
          if (!search) return;
          if (line.startsWith('info ') && line.includes(' pv ')) {
            const match = line.match(/score (cp|mate) (-?\d+).*\spv\s(.+)$/);
            if (match) search.latestInfo = {
              evaluation: { type: match[1], value: Number(match[2]) },
              pv: match[3].trim().split(/\s+/),
            };
          }
          if (line.startsWith('bestmove')) search.bestmove = line.split(/\s+/)[1];
        });
      }

      postMessage(message, ...rest) {
        if (this.__stockfish && typeof message === 'string') {
          if (message.startsWith('position fen ')) window.__orientationEvidence.fen = message.slice(13);
          if (message.startsWith('go ')) window.__orientationEvidence.searches.push({
            fen: window.__orientationEvidence.fen,
            command: message,
            bestmove: null,
            latestInfo: null,
          });
        }
        return super.postMessage(message, ...rest);
      }
    };
  });

  const history = () => page.locator('button span').evaluateAll(spans => spans
    .map(span => span.textContent?.trim() || '')
    .filter(value => /^\d+\.\s+\S+/.test(value))
    .map(value => value.replace(/^\d+\.\s+/, '')));

  const clickMove = async move => {
    for (const square of [move.from, move.to]) {
      const box = await page.locator(`[data-square="${square}"]`).boundingBox();
      if (!box) throw new Error(`Square ${square} is not visible`);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  };

  const chooseBadMove = game => {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const scored = game.moves({ verbose: true }).map(move => {
      const next = new Chess(game.fen());
      next.move(move);
      const hanging = Math.max(0, ...next.moves({ verbose: true })
        .filter(reply => reply.isCapture())
        .map(reply => values[reply.captured] || 0));
      return { move, hanging };
    }).sort((a, b) => b.hanging - a.hanging);
    return scored.find(({ move }) => move.piece === 'q')?.move || scored[0].move;
  };

  const waitForPly = count => page.waitForFunction(expected => [...document.querySelectorAll('button span')]
    .filter(span => /^\d+\.\s+\S+/.test(span.textContent?.trim() || '')).length >= expected,
  count, { timeout: 30000 });

  try {
    await page.goto(`${baseUrl}/play`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Thử thách - Nâng cao' }).click();
    await page.getByRole('button', { name: side === 'w' ? 'Trắng - Bạn được đi trước' : 'Đen - Máy đi trước' }).click();
    await page.getByRole('button', { name: 'Bắt đầu ván', exact: true }).click();
    await page.locator('.chess-board-container').waitFor({ state: 'visible' });

    while ((await history()).length < 14) {
      const moves = await history();
      const game = new Chess();
      moves.forEach(san => game.move(san));
      if (game.turn() === side) {
        await clickMove(chooseBadMove(game));
        await waitForPly(moves.length + 1);
      }
      if ((await history()).length < 14) await waitForPly(moves.length + (game.turn() === side ? 2 : 1));
    }

    const moves = await history();
    const replay = new Chess();
    const beforeFens = [];
    for (const san of moves) {
      beforeFens.push(replay.fen());
      replay.move(san);
    }

    const searchStart = await page.evaluate(() => window.__orientationEvidence.searches.length);
    await page.getByRole('button', { name: /Ph.n t.ch/i }).click();
    await page.getByRole('button', { name: /M. v.n c./i }).click();
    await page.locator('[data-evidence-id]').first().waitFor({ state: 'visible', timeout: 120000 });

    const facts = await page.locator('[data-evidence-id]').evaluateAll(elements => elements.map(element => ({
      id: element.getAttribute('data-evidence-id'),
      turn: element.getAttribute('data-turn'),
      centipawnLoss: Number(element.getAttribute('data-centipawn-loss')),
      classification: element.getAttribute('data-classification'),
      evalBefore: element.getAttribute('data-eval-before'),
      evalAfter: element.getAttribute('data-eval-after'),
      playedUci: element.getAttribute('data-played-uci'),
      bestUci: element.getAttribute('data-best-uci'),
      engineSource: element.getAttribute('data-engine-source'),
      text: element.textContent?.trim(),
    })));

    for (const fact of facts) {
      fact.evalBefore = parseEval(fact.evalBefore);
      fact.evalAfter = parseEval(fact.evalAfter);
      fact.ply = Number(fact.id.match(/:ply:(\d+)$/)?.[1]);
      if (!fact.ply || fact.engineSource !== 'stockfish_wasm') throw new Error(`Invalid evidence: ${JSON.stringify(fact)}`);
      if (fact.centipawnLoss !== expectedCpl(fact)) throw new Error(`Wrong CPL: ${JSON.stringify(fact)}`);
      if (fact.classification !== expectedClassification(fact.centipawnLoss)) throw new Error(`Wrong classification: ${JSON.stringify(fact)}`);
      const position = new Chess(beforeFens[fact.ply - 1]);
      position.move({ from: fact.playedUci.slice(0, 2), to: fact.playedUci.slice(2, 4), promotion: fact.playedUci[4] });
      new Chess(beforeFens[fact.ply - 1]).move({ from: fact.bestUci.slice(0, 2), to: fact.bestUci.slice(2, 4), promotion: fact.bestUci[4] });
    }

    const sideFact = facts.find(fact => fact.turn === side);
    if (!sideFact) throw new Error(`No ${side} review fact among ${facts.length} facts`);

    const searches = await page.evaluate(start => window.__orientationEvidence.searches.slice(start), searchStart);
    for (const search of searches.filter(item => item.bestmove && item.latestInfo?.pv?.length)) {
      replayPv(search.fen, search.latestInfo.pv);
    }
    const matchingSearches = searches.filter(search => search.fen === beforeFens[sideFact.ply - 1]);
    if (!matchingSearches.some(search => search.bestmove === sideFact.bestUci)) {
      throw new Error(`No real Stockfish search for ${sideFact.id}`);
    }

    await page.screenshot({ path: `${outputDir}/${side === 'w' ? 'white' : 'black'}-orientation.png`, fullPage: true });
    if (errors.console.length || errors.page.length || errors.network.length) throw new Error(JSON.stringify(errors));

    return {
      side,
      plies: moves.length,
      finalFen: replay.fen(),
      facts,
      selectedSideFact: sideFact,
      reviewSearchCount: searches.length,
      legalLatestPvCount: searches.filter(item => item.bestmove && item.latestInfo?.pv?.length).length,
      matchingSearches,
      errors,
    };
  } finally {
    await context.close();
  }
}

try {
  const runs = [await runSide('w'), await runSide('b')];
  const result = { verdict: 'PASS', buildUrl: baseUrl, runs };
  await writeFile(`${outputDir}/self-play.json`, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(`${outputDir}/browser-console.json`, `${JSON.stringify(runs.flatMap(run => run.errors.console), null, 2)}\n`);
  await writeFile(`${outputDir}/page-errors.json`, `${JSON.stringify(runs.flatMap(run => run.errors.page), null, 2)}\n`);
  await writeFile(`${outputDir}/network-errors.json`, `${JSON.stringify(runs.flatMap(run => run.errors.network), null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
